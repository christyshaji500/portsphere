import assert from 'node:assert/strict'

/** Sample data IDs, so tests read like the business story */
export const ID = {
  vc1: 'd1000000-0000-4000-8000-000000000001',   // OCEANIC PEARL – WORKING at B02
  vc2: 'd1000000-0000-4000-8000-000000000002',   // BLUEWAVE HORIZON – PLANNED at B01
  vc3: 'd1000000-0000-4000-8000-000000000003',   // MALABAR STAR – PLANNED at B03
  malabarStar:   'c1000000-0000-4000-8000-000000000003',
  arabianSpirit: 'c1000000-0000-4000-8000-000000000004',
  kochiExpress:  'c1000000-0000-4000-8000-000000000005',
  oceanic:     'b1000000-0000-4000-8000-000000000001',
  bluewave:    'b1000000-0000-4000-8000-000000000002',
  agent:       'b1000000-0000-4000-8000-000000000003',
  cha:         'b1000000-0000-4000-8000-000000000004',
  shipper:     'b1000000-0000-4000-8000-000000000005',
  consignee:   'b1000000-0000-4000-8000-000000000006',
  transporter: 'b1000000-0000-4000-8000-000000000007',
  B01: 'a1000000-0000-4000-8000-000000000001',
  B02: 'a1000000-0000-4000-8000-000000000002',
  B05: 'a1000000-0000-4000-8000-000000000005',
  machineryBox: '21000000-0000-4000-8000-000000000001',
  paintBox:     '21000000-0000-4000-8000-000000000003',
  reeferBox:    '21000000-0000-4000-8000-000000000005',
  machineryBOE: '31000000-0000-4000-8000-000000000001',
  paintBOE:     '31000000-0000-4000-8000-000000000002',
  do1:          '61000000-0000-4000-8000-000000000001',
  inv2:         '91000000-0000-4000-8000-000000000002'
}

/** ISO timestamp N days from now (negative = in the past) */
export const daysFromNow = d => new Date(Date.now() + d * 864e5).toISOString()

/** Asserts the request fails with this HTTP status and that the error contains every given text */
export async function failsWith(request, status, texts = []) {
  await assert.rejects(request, err => {
    const actual = err.response?.status ?? err.status ?? Number(String(err.message).match(/\b(\d{3})\b/)?.[1])
    assert.equal(actual, status, `expected HTTP ${status}, got ${actual}: ${err.message}`)
    const body = JSON.stringify(err.response?.data ?? err.message)
    for (const t of [].concat(texts)) assert.ok(body.includes(t), `error should contain "${t}" but was: ${body}`)
    return true
  })
}

/** A valid new vessel call; override what the test is about */
export const newCall = (overrides = {}) => ({
  vessel_ID: ID.kochiExpress, voyageNumber: 'T01',
  shippingLine_ID: ID.bluewave, agent_ID: ID.agent,
  eta: daysFromNow(10), etd: daysFromNow(11),
  ...overrides
})