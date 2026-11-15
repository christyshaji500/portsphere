import cds from '@sap/cds'
const { SELECT, UPDATE, INSERT } = cds.ql
const NR = 'portsphere.NumberRanges'

/**
 * Returns the next number, e.g. nextNumber('VC') → 'VC-2026-0005'.
 * Runs inside the current request's transaction:
 *  - the UPDATE locks the counter row until commit → no duplicates
 *  - if the request fails, the increment is rolled back → no gaps
 */
export async function nextNumber(object, date = new Date()) {
  const year = date.getUTCFullYear()

  // 1. increment first (atomic, takes the row lock)
  const affected = await UPDATE(NR).with('lastNumber = lastNumber + 1').where({ object, year })

  // 2. first number of a new year → create the counter
  if (!affected) await INSERT.into(NR).entries({ object, year, prefix: object, lastNumber: 1 })

  // 3. read the value we just reserved
  const { prefix, lastNumber } = await SELECT.one.from(NR).columns('prefix', 'lastNumber').where({ object, year })
  return `${prefix}-${year}-${String(lastNumber).padStart(4, '0')}`
}