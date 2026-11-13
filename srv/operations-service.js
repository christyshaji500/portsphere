import cds from '@sap/cds'
import { isAfter } from './lib/validators.js'
import { effectiveValues } from './lib/request-utils.js'

export default class OperationsService extends cds.ApplicationService {
  async init() {
    const { VesselCalls, BerthAllocations } = this.entities

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

    return super.init()   // always last: lets CAP register its generic handlers
  }
}