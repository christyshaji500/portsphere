import cds from '@sap/cds'
import { isAfter } from './lib/validators.js'
import { effectiveValues } from './lib/request-utils.js'
import { nextNumber } from './lib/numbering.js'
import { checkAllocations, findClash } from './lib/berth-checks.js'
import { fitProblems } from './lib/berth-rules.js'
import { registerTransitions, protectFields } from './lib/transitions.js'
import { CALL_FLOW } from './lib/state-machine.js'

const { SELECT, UPDATE } = cds.ql

export default class OperationsService extends cds.ApplicationService {
  async init() {
    const { VesselCalls, BerthAllocations } = this.entities
    const db = cds.entities('portsphere')
    const now = () => new Date().toISOString()

    // ── Vessel calls: ETD must be after ETA (create AND partial update) ──
    this.before(['CREATE', 'UPDATE'], VesselCalls, async req => {
      const { eta, etd } = await effectiveValues(req, ['eta', 'etd'])
      if (eta && etd && !isAfter(etd, eta))
        req.error({ status: 400, message: 'ETD_NOT_AFTER_ETA', target: 'etd' })

      // Allocations sent INSIDE the call (deep insert / deep update) do NOT
      // pass through the BerthAllocations handler below → validate them here.
      req.data.berthAllocations?.forEach((a, i) => {
        if (a.fromTime && a.toTime && !isAfter(a.toTime, a.fromTime))
          req.error({ status: 400, message: 'ALLOCATION_END_NOT_AFTER_START', args: [i + 1], target: 'berthAllocations' })
      })
    })

    // ── Berth allocation created/changed on its own ──
    this.before(['CREATE', 'UPDATE'], BerthAllocations, async req => {
      const { fromTime, toTime } = await effectiveValues(req, ['fromTime', 'toTime'])
      if (fromTime && toTime && !isAfter(toTime, fromTime))
        req.error({ status: 400, message: 'ALLOCATION_END_NOT_AFTER_START', args: [1], target: 'toTime' })
    })

    // ── Auto-number new vessel calls (overwrites anything the client sent) ──
    this.before('CREATE', VesselCalls, async req => {
      req.data.callNumber = await nextNumber('VC')
    })

    // ── R2–R6 for allocations sent inside a call (deep insert / deep update) ──
    this.before(['CREATE', 'UPDATE'], VesselCalls, async req => {
      if (!req.data.berthAllocations) return
      const { vessel_ID } = await effectiveValues(req, ['vessel_ID'])
      await checkAllocations(req, { callID: req.data.ID, vesselID: vessel_ID, allocations: req.data.berthAllocations })
    })

    // ── R2–R6 for an allocation created / changed on its own ──
    this.before(['CREATE', 'UPDATE'], BerthAllocations, async req => {
      const a = await effectiveValues(req, ['call_ID', 'berth_ID', 'fromTime', 'toTime'])
      const { VesselCalls: Calls } = cds.entities('portsphere')
      const call = await SELECT.one.from(Calls).columns('vessel_ID').where({ ID: a.call_ID })
      if (call) await checkAllocations(req, { callID: a.call_ID, vesselID: call.vessel_ID, allocations: [a] })
    })

    // ── Bound function: which berths could this call use? ──
    this.on('availableBerths', VesselCalls, async req => {
      const { Berths, Vessels } = cds.entities('portsphere')
      const call = await SELECT.one.from(req.subject).columns('ID', 'eta', 'etd', 'vessel_ID')
      if (!call) return req.reject(404, 'CALL_NOT_FOUND')

      const vessel = await SELECT.one.from(Vessels).where({ ID: call.vessel_ID })
      const berths = await SELECT.from(Berths).where({ isActive: true })

      const options = []
      for (const b of berths) {
        if (fitProblems(vessel, b).length) continue                  // doesn't fit
        if (await findClash(b.ID, call.eta, call.etd, call.ID)) continue  // occupied
        options.push({
          berth_ID: b.ID, code: b.code, name: b.name, terminal: b.terminal,
          lengthMeters: b.lengthMeters, maxDraftMeters: b.maxDraftMeters,
          spareLengthMeters: Number(b.lengthMeters) - Number(vessel.lengthOverall)
        })
      }
      return options.sort((x, y) => x.spareLengthMeters - y.spareLengthMeters)  // best fit first
    })

     // status, ata, atd only through actions; new calls always start PLANNED
    protectFields(this, VesselCalls, { fields: ['status_code', 'ata', 'atd'], initial: { status_code: 'PLANNED' } })

    registerTransitions(this, VesselCalls, db.VesselCalls, CALL_FLOW, {
      before: {
        arrive: req => ({ ata: req.data.ata ?? now() }),

        berth: async (req, call) => {
          const alloc = await SELECT.one.from(db.BerthAllocations).columns('ID').where({ call_ID: call.ID })
          if (!alloc) req.reject(409, 'BERTH_REQUIRED', [call.callNumber])
        },

        depart: (req, call) => {
          const atd = req.data.atd ?? now()
          if (call.ata && !isAfter(atd, call.ata)) req.reject(400, 'ATD_NOT_AFTER_ATA')
          return { atd }
        },

        cancel: (req, call) => {
          const reason = req.data.reason?.trim()
          if (!reason) req.reject(400, 'REASON_REQUIRED')
          return { remarks: [call.remarks, `Cancelled: ${reason}`].filter(Boolean).join(' | ').slice(0, 500) }
        }
      },
      after: {
        berth: (req, call) =>
          UPDATE(db.BerthAllocations).with({ isConfirmed: true }).where({ call_ID: call.ID })
      }
    })

    return super.init()   // always last: lets CAP register its generic handlers
  }
}

