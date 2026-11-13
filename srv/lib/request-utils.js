import cds from '@sap/cds'
const { SELECT } = cds.ql

/**
 * Returns the given fields as they WILL be after this request.
 * CREATE: everything comes from req.data.
 * UPDATE (PATCH): req.data holds only the fields that were sent –
 *                 the missing ones are read from the current database row.
 */
export async function effectiveValues(req, fields) {
  const values = Object.fromEntries(fields.map(f => [f, req.data[f]]))
  const missing = fields.filter(f => values[f] === undefined)

  if (req.event === 'UPDATE' && missing.length) {
    const current = await SELECT.one.from(req.subject).columns(...missing)
    for (const f of missing) values[f] = current?.[f]
  }
  return values
}