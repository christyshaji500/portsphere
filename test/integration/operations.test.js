import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import cds from '@sap/cds'
import { ID, failsWith, newCall, daysFromNow } from './helpers.js'

const { GET, POST, PATCH } = cds.test(path.join(import.meta.dirname, '../..'))
const ops = '/operations'
const act = (id, name, body = {}) => POST(`${ops}/VesselCalls(${id})/OperationsService.${name}`, body)

describe('Vessel calls – numbering and validation', () => {
  test('server assigns consecutive call numbers and ignores client values', async () => {
    const { data: a } = await POST(`${ops}/VesselCalls`, newCall({ callNumber: 'VC-9999-9999' }))
    const { data: b } = await POST(`${ops}/VesselCalls`, newCall({ voyageNumber: 'T02' }))
    assert.match(a.callNumber, /^VC-\d{4}-\d{4}$/)
    assert.notEqual(a.callNumber, 'VC-9999-9999')
    assert.equal(Number(b.callNumber.slice(-4)), Number(a.callNumber.slice(-4)) + 1)
    assert.equal(a.status_code, 'PLANNED')
  })

  test('ETD must be after ETA – on create and on partial update', async () => {
    await failsWith(POST(`${ops}/VesselCalls`, newCall({ eta: daysFromNow(5), etd: daysFromNow(4) })), 400, 'later than estimated arrival')
    await failsWith(PATCH(`${ops}/VesselCalls(${ID.vc2})`, { etd: '2026-11-01T00:00:00Z' }), 400, 'later than estimated arrival')
  })

  test('agent must have the AGENT role', async () => {
    await failsWith(POST(`${ops}/VesselCalls`, newCall({ agent_ID: ID.consignee })), 400, 'cannot be used as agent_ID')
  })
})

describe('Berth conflict engine', () => {
  test('vessel too long and too deep → both errors reported', async () => {
    await failsWith(POST(`${ops}/VesselCalls`, newCall({
      vessel_ID: ID.arabianSpirit,
      berthAllocations: [{ berth_ID: ID.B05, fromTime: daysFromNow(10), toTime: daysFromNow(11) }]
    })), 400, ['does not fit berth B05', 'water depth'])
  })

  test('overlap is rejected, back-to-back is allowed', async () => {
    await failsWith(POST(`${ops}/VesselCalls`, newCall({
      eta: '2026-11-16T00:00:00Z', etd: '2026-11-16T12:00:00Z',
      berthAllocations: [{ berth_ID: ID.B01, fromTime: '2026-11-16T00:00:00Z', toTime: '2026-11-16T12:00:00Z' }]
    })), 400, 'VC-2026-0002')

    const { status } = await POST(`${ops}/VesselCalls`, newCall({
      eta: '2026-11-16T22:00:00Z', etd: '2026-11-17T10:00:00Z',
      berthAllocations: [{ berth_ID: ID.B01, fromTime: '2026-11-16T22:00:00Z', toTime: '2026-11-17T10:00:00Z' }]
    }))
    assert.equal(status, 201)
  })

  test('availableBerths: free berths that fit, best fit first', async () => {
    const { data } = await GET(`${ops}/VesselCalls(${ID.vc3})/OperationsService.availableBerths()`)
    assert.deepEqual(data.value.map(b => b.code), ['B03', 'B04', 'B02'])
  })
})

describe('Vessel call lifecycle', () => {
  test('PLANNED → DEPARTED, with timestamps and confirmed berth', async () => {
    let { data } = await act(ID.vc2, 'arrive')
    assert.equal(data.status_code, 'ARRIVED')
    assert.ok(data.ata)

    await failsWith(act(ID.vc2, 'startWork'), 409, 'only possible from: BERTHED')

    ;({ data } = await act(ID.vc2, 'berth'))
    assert.equal(data.status_code, 'BERTHED')
    const { data: call } = await GET(`${ops}/VesselCalls(${ID.vc2})?$expand=berthAllocations`)
    assert.ok(call.berthAllocations.every(a => a.isConfirmed))

    await act(ID.vc2, 'startWork')
    await act(ID.vc2, 'complete')
    ;({ data } = await act(ID.vc2, 'depart'))
    assert.equal(data.status_code, 'DEPARTED')
    assert.ok(data.atd)
  })

//   test('status cannot be PATCHed; an unchanged value is accepted', async () => {
//     await failsWith(PATCH(`${ops}/VesselCalls(${ID.vc1})`, { status_code: 'DEPARTED' }), 400, 'only be changed through actions')
//     const { status } = await PATCH(`${ops}/VesselCalls(${ID.vc1})`, { status_code: 'WORKING', remarks: 'Pilot on board' })
//     assert.equal(status, 200)
//   })

  test('status in a PATCH is ignored (read-only field), other fields are saved', async () => {
    const { status } = await PATCH(`${ops}/VesselCalls(${ID.vc1})`, { status_code: 'DEPARTED', remarks: 'Pilot on board' })
    assert.equal(status, 200)

    const { data } = await GET(`${ops}/VesselCalls(${ID.vc1})`)
    assert.equal(data.status_code, 'WORKING')        // unchanged: CAP dropped the read-only field
    assert.equal(data.remarks, 'Pilot on board')     // normal fields are saved
  })

  test('cancel requires a reason', async () => {
    await failsWith(act(ID.vc3, 'cancel'), 400, 'give a reason')
    const { data } = await act(ID.vc3, 'cancel', { reason: 'Charterer changed discharge port' })
    assert.equal(data.status_code, 'CANCELLED')
  })
})