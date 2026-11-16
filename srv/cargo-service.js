import cds from '@sap/cds'
import { containerCheckDigit } from './lib/validators.js'
import { registerTransitions, protectFields } from './lib/transitions.js'
import { DECLARATION_FLOW, CONTAINER_FLOW  } from './lib/state-machine.js'
import { roleProblem } from './lib/partner-checks.js'
const { SELECT, UPDATE } = cds.ql

/** Reports every container in the list whose check digit is wrong */
const checkContainers = (req, containers = []) => {
  for (const { containerNumber } of containers) {
    const expected = containerCheckDigit(containerNumber)
    if (expected !== null && expected !== Number(containerNumber[10]))
      req.error({ status: 400, message: 'CONTAINER_CHECK_DIGIT_INVALID', args: [containerNumber, expected], target: 'containerNumber' })
  }
}

export default class CargoService extends cds.ApplicationService {
  async init() {
    const { Manifests, BillsOfLading, Containers, CustomsDeclarations } = this.entities

    // A container can enter the system through three doors – guard all of them:
    this.before(['CREATE', 'UPDATE'], Containers,    req => checkContainers(req, [req.data]))
    this.before(['CREATE', 'UPDATE'], BillsOfLading, req => checkContainers(req, req.data.containers))
    this.before(['CREATE', 'UPDATE'], Manifests,     req =>
      checkContainers(req, req.data.billsOfLading?.flatMap(bl => bl.containers ?? [])))

    const db = cds.entities('portsphere')
    const now = () => new Date().toISOString()
   
    protectFields(this, CustomsDeclarations, {
      fields: ['status_code', 'filedAt', 'clearedAt'], initial: { status_code: 'DRAFT' }
    })

    registerTransitions(this, CustomsDeclarations, db.CustomsDeclarations, DECLARATION_FLOW, {
      before: {
        file: () => ({ filedAt: now() }),

        assess: req => {
          const { dutyAmount, assessableValue } = req.data
          if (dutyAmount == null) req.reject(400, 'DUTY_REQUIRED')
          return assessableValue == null ? { dutyAmount } : { dutyAmount, assessableValue }
        },

        clear: (req, d) => {
          if (d.status_code === 'ASSESSED' && Number(d.dutyAmount) > 0)
            req.reject(409, 'DUTY_NOT_PAID', [d.dutyAmount, d.currency_code])
          return req.data.remarks ? { clearedAt: now(), officerRemarks: req.data.remarks } : { clearedAt: now() }
        },

        rejectDeclaration: req => {
          const reason = req.data.reason?.trim()
          if (!reason) req.reject(400, 'REASON_REQUIRED')
          return { officerRemarks: reason }
        }
      },
      after: {
        // Cleared → every container of this B/L on customs HOLD goes back to the yard
        clear: async (req, d) => {
          const backTo = d.type_code === 'SB' ? 'GATED_IN' : 'DISCHARGED'
          // const released = await UPDATE(db.Containers).with({ status_code: backTo }).where({ bl_ID: d.bl_ID, status_code: 'HOLD' })
          const released = await UPDATE(db.Containers).with({ status_code: backTo, holdReason: null }).where({ bl_ID: d.bl_ID, status_code: 'HOLD' })
          if (released) req.info({ message: 'CONTAINERS_RELEASED', args: [released] })
        }
      }
    })

        // ── Initial container status depends on the manifest direction ──
    const initialStatus = direction => direction === 'EXP' ? 'EXPECTED' : 'ON_VESSEL'
    const directionOfManifest = async ID =>
      (await SELECT.one.from(db.Manifests).columns('direction_code').where({ ID }))?.direction_code
    const directionOfBL = async ID =>
      (await SELECT.one.from(db.BillsOfLading).columns('manifest.direction_code as direction').where({ ID }))?.direction

    const CONTAINER_PROTECTED = ['status_code', 'dischargedAt', 'gatedOutAt', 'holdReason']
    const prepareNew = (containers = [], direction) => {
      for (const c of containers) {
        for (const f of CONTAINER_PROTECTED) delete c[f]
        c.status_code = initialStatus(direction)
      }
    }

    // three doors again (2.2): direct, inside a B/L, inside a manifest
    protectFields(this, Containers, {
      fields: CONTAINER_PROTECTED,
      initial: async req => ({ status_code: initialStatus(await directionOfBL(req.data.bl_ID)) })
    })
    this.before('CREATE', BillsOfLading, async req =>
      prepareNew(req.data.containers, await directionOfManifest(req.data.manifest_ID)))
    this.before('CREATE', Manifests, req =>
      req.data.billsOfLading?.forEach(bl => prepareNew(bl.containers, req.data.direction_code)))
    
    this.before(['CREATE', 'UPDATE'], CustomsDeclarations, async req => {
      const p = await roleProblem(req.data.broker_ID, ['CHA'], 'broker_ID')
      if (p) req.error({ status: 400, message: p[0], args: p[1], target: 'broker_ID' })
    })

    // ── Cargo can only be handled while the vessel is WORKING ──
    const requireWorkingCall = async (req, container) => {
      const ctx = await SELECT.one.from(db.Containers)
        .columns('bl.manifest.call.callNumber as callNumber', 'bl.manifest.call.status_code as callStatus')
        .where({ ID: container.ID })
      if (ctx?.callStatus !== 'WORKING') req.reject(409, 'CALL_NOT_WORKING', [ctx?.callNumber, ctx?.callStatus])
    }

    registerTransitions(this, Containers, db.Containers, CONTAINER_FLOW, {
      before: {
        discharge: async (req, c) => {
          await requireWorkingCall(req, c)
          return req.data.yardLocation
            ? { dischargedAt: now(), yardLocation: req.data.yardLocation }
            : { dischargedAt: now() }
        },
        hold: req => {
          const reason = req.data.reason?.trim()
          if (!reason) req.reject(400, 'REASON_REQUIRED')
          return { holdReason: reason }
        },
        load: async (req, c) => {
          await requireWorkingCall(req, c)
          const leo = await SELECT.one.from(db.CustomsDeclarations).columns('ID')
            .where({ bl_ID: c.bl_ID, type_code: 'SB', status_code: 'CLEARED' })
          if (!leo) req.reject(409, 'LEO_REQUIRED', [c.containerNumber])
        }
      }
    })

    return super.init()
  }
}