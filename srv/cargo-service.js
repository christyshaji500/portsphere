import cds from '@sap/cds'
import { containerCheckDigit } from './lib/validators.js'
import { registerTransitions, protectFields } from './lib/transitions.js'
import { DECLARATION_FLOW } from './lib/state-machine.js'
const { UPDATE } = cds.ql

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
          const released = await UPDATE(db.Containers).with({ status_code: backTo }).where({ bl_ID: d.bl_ID, status_code: 'HOLD' })
          if (released) req.info({ message: 'CONTAINERS_RELEASED', args: [released] })
        }
      }
    })

    return super.init()
  }
}