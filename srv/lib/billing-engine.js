import cds from '@sap/cds'
import { toISO } from './berth-rules.js'
import { round2, berthHours, storageDays, pickTariff } from './billing-rules.js'
const { SELECT, UPDATE } = cds.ql

/**
 * All tariffs valid at a given moment.
 * Every CQL read of a temporal entity is automatically filtered to "valid NOW".
 * To price an old visit we need "valid AT ATA", so we query the table directly
 * with explicit conditions. Quoted aliases keep the column names identical on
 * SQLite and HANA (HANA would otherwise return them in upper case).
 */
export function tariffsValidAt(at) {
  return cds.run(
    `SELECT ID as "ID", chargeType_code as "chargeType", vesselType_code as "vesselType",
            rate as "rate", unit as "unit", freeDays as "freeDays"
       FROM portsphere_Tariffs
      WHERE validFrom <= ? AND validTo > ?`, [toISO(at), toISO(at)])
}

/** Builds the invoice lines for a departed vessel call */
export async function buildChargeLines(call, billingDate = new Date()) {
  const db = cds.entities('portsphere')
  const vessel = await SELECT.one.from(db.Vessels).columns('name', 'grossTonnage', 'type_code').where({ ID: call.vessel_ID })
  const tariffs = await tariffsValidAt(call.ata)
  const lines = []

  const add = (chargeType, quantity, description) => {
    const t = pickTariff(tariffs, chargeType, vessel.type_code)
    if (!t || !(quantity > 0)) return                       // no tariff or nothing to charge → no line
    lines.push({ chargeType_code: chargeType, tariff_ID: t.ID, description, quantity, unit: t.unit, rate: t.rate })
  }

  // 1. Port dues – per gross ton
  add('PORT_DUES', vessel.grossTonnage, `Port dues ${vessel.name} (${vessel.grossTonnage} GT)`)

  // 2. Berth hire – per started hour
  const allocs = await SELECT.from(db.BerthAllocations).columns('fromTime', 'toTime', 'berth.code as berth').where({ call_ID: call.ID })
  const hours = berthHours(allocs)
  add('BERTH_HIRE', hours, `Berth hire ${allocs.map(a => a.berth).join(', ')} – ${hours} h`)

  // 3 + 4. Storage (TEU-days after free days) and reefer power (days)
  const boxes = await SELECT.from(db.Containers)
    .columns('dischargedAt', 'gatedOutAt', 'type.teu as teu', 'type.reefer as reefer')
    .where`bl.manifest.call_ID = ${call.ID} and bl.manifest.direction_code = 'IMP' and dischargedAt is not null`
  const freeDays = pickTariff(tariffs, 'STORAGE', vessel.type_code)?.freeDays ?? 0
  let teuDays = 0, reeferDays = 0
  for (const b of boxes) {
    const until = b.gatedOutAt ?? billingDate
    teuDays += storageDays(b.dischargedAt, until, freeDays) * Number(b.teu)
    if (b.reefer) reeferDays += storageDays(b.dischargedAt, until, 0)
  }
  add('STORAGE', teuDays, `Storage after ${freeDays} free days (${boxes.length} containers)`)
  add('REEFER_PLUG', reeferDays, 'Reefer power supply')

  // 5. Gate fees – passes actually used
  const passes = await SELECT.from(db.GatePasses).columns('ID')
    .where`container.bl.manifest.call_ID = ${call.ID} and gateInAt is not null`
  add('GATE_FEE', passes.length, `Gate transactions (${passes.length})`)

  // 6. Documentation fees – delivery orders issued
  const dos = await SELECT.from(db.DeliveryOrders).columns('ID').where`bl.manifest.call_ID = ${call.ID}`
  add('DOC_FEE', dos.length, `Delivery orders issued (${dos.length})`)

  return lines
}

/** netAmount = sum of round2(quantity × rate) of all items */
export async function recalcNetAmount(invoiceID) {
  const { Invoices, InvoiceItems } = cds.entities('portsphere')
  const items = await SELECT.from(InvoiceItems).columns('quantity', 'rate').where({ invoice_ID: invoiceID })
  const net = items.reduce((sum, i) => sum + round2(Number(i.quantity) * Number(i.rate)), 0)
  await UPDATE(Invoices).with({ netAmount: round2(net) }).where({ ID: invoiceID })
}