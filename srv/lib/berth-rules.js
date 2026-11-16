/** Normalise to the exact format CAP stores: 2026-11-15T06:00:00.000Z */
export const toISO = t => new Date(t).toISOString()

/** true if window A overlaps window B (back-to-back is NOT an overlap) */
export const overlaps = (aFrom, aTo, bFrom, bTo) =>
  new Date(aFrom) < new Date(bTo) && new Date(bFrom) < new Date(aTo)

/** List of [messageKey, args] explaining why the vessel can't use the berth (empty = fits) */
export function fitProblems(vessel, berth) {
  const problems = []
  if (!berth.isActive)
    problems.push(['BERTH_INACTIVE', [berth.code]])
  if (Number(vessel.lengthOverall) > Number(berth.lengthMeters))
    problems.push(['VESSEL_TOO_LONG', [vessel.name, vessel.lengthOverall, berth.code, berth.lengthMeters]])
  if (Number(vessel.maxDraft) > Number(berth.maxDraftMeters))
    problems.push(['VESSEL_TOO_DEEP', [vessel.name, vessel.maxDraft, berth.code, berth.maxDraftMeters]])
  return problems
}