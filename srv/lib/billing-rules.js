const HOUR = 36e5, DAY = 864e5

/** Commercial rounding to 2 decimals (EPSILON avoids 1.005 → 1.00) */
export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100

/** Total hours at berth over all allocations – every started hour counts */
export const berthHours = allocations =>
  Math.ceil(allocations.reduce((sum, a) => sum + Math.max(0, new Date(a.toTime) - new Date(a.fromTime)), 0) / HOUR)

/** Chargeable days after the free days – every started day counts */
export const storageDays = (from, until, freeDays = 0) =>
  Math.max(0, Math.ceil(Math.max(0, new Date(until) - new Date(from)) / DAY) - freeDays)

/** Vessel-type-specific tariff first, otherwise the general one */
export const pickTariff = (tariffs, chargeType, vesselType) =>
  tariffs.find(t => t.chargeType === chargeType && t.vesselType === vesselType) ??
  tariffs.find(t => t.chargeType === chargeType && t.vesselType == null)