import cds from '@sap/cds'
const { SELECT } = cds.ql

/** null if the partner has one of the roles, otherwise [messageKey, args] */
export async function roleProblem(partnerID, roles, field) {
  if (!partnerID) return null
  const { BusinessPartners } = cds.entities('portsphere')
  const bp = await SELECT.one.from(BusinessPartners).columns('name', 'role_code').where({ ID: partnerID })
  return bp && !roles.includes(bp.role_code)
    ? ['WRONG_PARTNER_ROLE', [bp.name, bp.role_code, field, roles.join(' or ')]]
    : null
}