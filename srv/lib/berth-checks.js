import cds from '@sap/cds'
import { overlaps, toISO, fitProblems } from './berth-rules.js'
const { SELECT } = cds.ql

const NO_CALL = '00000000-0000-0000-0000-000000000000'

/** First booking of ANOTHER (non-cancelled) call on this berth that overlaps the window, or undefined */
export function findClash(berthID, from, to, ownCallID) {
  const { BerthAllocations } = cds.entities('portsphere')
  // ownCallID may be undefined on a brand-new call → compare with a dummy ID,
  // because "call_ID <> NULL" is never true in SQL and would hide every clash.
  return SELECT.one.from(BerthAllocations)
    .columns('fromTime', 'toTime', 'call.callNumber as callNumber')
    .where`berth_ID = ${berthID}
       and fromTime < ${toISO(to)} and toTime > ${toISO(from)}
       and call_ID <> ${ownCallID ?? NO_CALL}
       and call.status_code <> 'CANCELLED'`
}

/** Applies rules R2–R6 to a list of allocations of one call; reports problems with req.error */
export async function checkAllocations(req, { callID, vesselID, allocations = [] }) {
  const { Berths, Vessels } = cds.entities('portsphere')
  const list = allocations.filter(a => a.berth_ID && a.fromTime && a.toTime)
  if (!list.length) return

  const vessel = await SELECT.one.from(Vessels).columns('name', 'lengthOverall', 'maxDraft').where({ ID: vesselID })

  for (const [i, a] of list.entries()) {
    const berth = await SELECT.one.from(Berths).where({ ID: a.berth_ID })
    if (!berth) continue                                     // @assert.target reports this

    // R2–R4: berth active and vessel fits
    if (vessel) for (const [message, args] of fitProblems(vessel, berth))
      req.error({ status: 400, message, args, target: 'berth_ID' })

    // R6: overlap with another allocation in the same request
    for (const b of list.slice(i + 1))
      if (b.berth_ID === a.berth_ID && overlaps(a.fromTime, a.toTime, b.fromTime, b.toTime))
        req.error({ status: 400, message: 'ALLOCATIONS_OVERLAP', args: [berth.code], target: 'berthAllocations' })

    // R5: overlap with another call's booking
    const clash = await findClash(a.berth_ID, a.fromTime, a.toTime, callID)
    if (clash)
      req.error({ status: 400, message: 'BERTH_OCCUPIED', args: [berth.code, clash.callNumber, clash.fromTime, clash.toTime], target: 'berth_ID' })
  }
}