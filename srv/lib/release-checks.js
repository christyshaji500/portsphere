import cds from '@sap/cds'
import { toISO } from './berth-rules.js'
const { SELECT } = cds.ql
const NO_ID = '00000000-0000-0000-0000-000000000000'

export function containerInfo(ID) {
  const { Containers } = cds.entities('portsphere')
  return SELECT.one.from(Containers)
    .columns('ID', 'containerNumber', 'status_code', 'bl_ID', 'bl.manifest.direction_code as direction')
    .where({ ID })
}

/** Rules 1–6: everything that must be true before an import container may leave */
export async function outboundProblems(c, deliveryOrderID, untilISO) {
  const { DeliveryOrders, CustomsDeclarations } = cds.entities('portsphere')
  const problems = []

  if (c.direction !== 'IMP') problems.push(['GATE_OUT_IMPORT_ONLY', [c.containerNumber]])
  if (c.status_code === 'HOLD') problems.push(['CONTAINER_ON_HOLD', [c.containerNumber]])
  else if (c.status_code !== 'DISCHARGED') problems.push(['CONTAINER_NOT_IN_YARD', [c.containerNumber, c.status_code]])

  const cleared = await SELECT.one.from(CustomsDeclarations).columns('ID')
    .where({ bl_ID: c.bl_ID, type_code: 'BOE', status_code: 'CLEARED' })
  if (!cleared) problems.push(['CUSTOMS_NOT_CLEARED', [c.containerNumber]])

  if (!deliveryOrderID) {
    problems.push(['DO_REQUIRED', [c.containerNumber]])
    return problems
  }
  const d = await SELECT.one.from(DeliveryOrders).where({ ID: deliveryOrderID })
  if (!d) return problems                                       // @assert.target reports this
  if (d.bl_ID !== c.bl_ID) problems.push(['DO_WRONG_BL', [d.doNumber, c.containerNumber]])
  if (!d.freightPaid) problems.push(['FREIGHT_NOT_PAID', [d.doNumber]])
  if (d.validUntil < toISO(untilISO).slice(0, 10)) problems.push(['DO_EXPIRED', [d.doNumber, d.validUntil]])
  return problems
}

/** An export container may come in only if it is announced and not yet in the terminal */
export async function inboundProblems(c) {
  const problems = []
  if (c.direction !== 'EXP') problems.push(['GATE_IN_EXPORT_ONLY', [c.containerNumber]])
  if (c.status_code !== 'EXPECTED') problems.push(['CONTAINER_NOT_EXPECTED', [c.containerNumber, c.status_code]])
  return problems
}

/** Rule 8: another unused, still valid pass for the same container and direction */
export function findOpenPass(containerID, movement, ownID) {
  const { GatePasses } = cds.entities('portsphere')
  return SELECT.one.from(GatePasses).columns('passNumber')
    .where`container_ID = ${containerID} and movement = ${movement}
       and gateOutAt is null and validTo > ${new Date().toISOString()}
       and ID <> ${ownID ?? NO_ID}`
}