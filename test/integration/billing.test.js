import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import cds from '@sap/cds'
import { ID, failsWith, newCall } from './helpers.js'

const { GET, POST, PATCH, DELETE } = cds.test(path.join(import.meta.dirname, '../..'))
const bill = '/billing'
const generate = callID => POST(`${bill}/VesselCalls(${callID})/BillingService.generateInvoice`, {})
const opsAct = (id, name, body = {}) => POST(`/operations/VesselCalls(${id})/OperationsService.${name}`, body)
const itemsOf = async invoiceID =>
  (await GET(`${bill}/Invoices(${invoiceID})?$expand=items`)).data

describe('Invoice generation', () => {
  test('only for departed calls, one active invoice per call', async () => {
    await failsWith(generate(ID.vc2), 409, 'only be generated after departure')
    await opsAct(ID.vc1, 'complete')
    await opsAct(ID.vc1, 'depart')
    await failsWith(generate(ID.vc1), 409, 'already has invoice')
  })

  test('lines are calculated from operational data; netAmount = sum of items', async () => {
    await POST(`${bill}/Invoices(${ID.inv2})/BillingService.cancelInvoice`, { reason: 'Replaced' })
    const { data } = await generate(ID.vc1)
    const inv = await itemsOf(data.ID)
    const line = code => inv.items.find(i => i.chargeType_code === code)

    assert.equal(Number(line('PORT_DUES').quantity), 95000)
    assert.equal(Number(line('PORT_DUES').rate), 27.5)
    assert.equal(Number(line('BERTH_HIRE').quantity), 40)          // 39.5 h → 40 started hours
    assert.equal(Number(line('GATE_FEE').quantity), 1)
    assert.equal(Number(line('DOC_FEE').quantity), 1)

    const sum = inv.items.reduce((s, i) => s + Number(i.amount), 0)
    assert.ok(Math.abs(Number(inv.netAmount) - sum) < 0.01)
  })

  test('a September visit is priced with the tariff valid then (temporal)', async () => {
    const SEPT = 'd2000000-0000-4000-8000-000000000001'
    await POST('/operations/VesselCalls', newCall({
      ID: SEPT, eta: '2026-09-10T06:00:00Z', etd: '2026-09-11T08:00:00Z',
      berthAllocations: [{ berth_ID: ID.B05, fromTime: '2026-09-10T06:00:00Z', toTime: '2026-09-11T08:00:00Z' }]
    }))
    await opsAct(SEPT, 'arrive', { ata: '2026-09-10T06:00:00Z' })
    for (const a of ['berth', 'startWork', 'complete']) await opsAct(SEPT, a)
    await opsAct(SEPT, 'depart', { atd: '2026-09-11T08:00:00Z' })

    const { data } = await generate(SEPT)
    const inv = await itemsOf(data.ID)
    assert.equal(Number(inv.items.find(i => i.chargeType_code === 'PORT_DUES').rate), 25)   // old rate
    assert.equal(Number(inv.netAmount), 713000)
    assert.equal(Number(inv.grossAmount), 841340)
  })
})

describe('Invoice editing', () => {
  const INV = '92000000-0000-4000-8000-000000000001'
  const ITEM1 = '02000000-0000-4000-8000-000000000001'
  const ITEM2 = '02000000-0000-4000-8000-000000000002'
  const net = async () => Number((await GET(`${bill}/Invoices(${INV})`)).data.netAmount)

  test('netAmount follows every item change and ignores client values', async () => {
    await POST(`${bill}/Invoices`, {
      ID: INV, call_ID: ID.vc3, billTo_ID: ID.oceanic, invoiceDate: '2026-11-16', currency_code: 'INR', netAmount: 1,
      items: [{ ID: ITEM1, lineNo: 1, chargeType_code: 'GATE_FEE', quantity: 2, rate: 600 }]
    })
    assert.equal(await net(), 1200)
    await POST(`${bill}/InvoiceItems`, { ID: ITEM2, invoice_ID: INV, lineNo: 2, chargeType_code: 'DOC_FEE', quantity: 1, rate: 350 })
    assert.equal(await net(), 1550)
    await DELETE(`${bill}/InvoiceItems(${ITEM1})`)
    assert.equal(await net(), 350)
  })

  test('issued invoices are frozen', async () => {
    const { data } = await POST(`${bill}/Invoices(${INV})/BillingService.issue`, {})
    assert.equal(data.status_code, 'ISSUED')
    assert.equal(data.dueDate, '2026-11-30')
    await failsWith(PATCH(`${bill}/InvoiceItems(${ITEM2})`, { rate: 1 }), 409, 'can no longer be changed')
  })
})