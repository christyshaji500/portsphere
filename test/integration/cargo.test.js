import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import cds from '@sap/cds'
import { ID, failsWith, active, draftFlow } from './helpers.js'

const { GET, POST, PATCH } = cds.test(path.join(import.meta.dirname, '../..'))
const cargoDraft = draftFlow({ POST, PATCH }, '/cargo', 'CargoService')
const cargo = '/cargo'

describe('Check digits', () => {
  test('IMO typo is rejected with the expected digit', async () => {
    await failsWith(POST('/masterdata/Vessels', {
      imoNumber: '9312342', name: 'TYPO', type_code: 'CONT', lengthOverall: 200, maxDraft: 10
    }), 400, 'should be 1')
  })

  test('one bad container in a deep insert → nothing is saved', async () => {
    await failsWith(POST(`${cargo}/Manifests`, {
      manifestNumber: 'EGM-TEST-0001', call_ID: ID.vc3, direction_code: 'EXP',
      billsOfLading: [{
        blNumber: 'TESTBL0001', cargoType_code: 'CONT', description: 'Coir', grossWeightKg: 20000,
        containers: [
          { containerNumber: 'BWSU3004006', type_code: '40GP', grossWeightKg: 10000 },
          { containerNumber: 'BWSU3004012', type_code: '40GP', grossWeightKg: 10000 }
        ]
      }]
    }), 400, 'BWSU3004012')
    const { data } = await GET(`${cargo}/Manifests?$filter=manifestNumber eq 'EGM-TEST-0001'`)
    assert.equal(data.value.length, 0)
  })
})

// describe('Customs declarations', () => {
//   test('clear needs paid duty; clearing releases the held container', async () => {
//     const decl = id => `${cargo}/CustomsDeclarations(${id})/CargoService`
//     await failsWith(POST(`${decl(ID.paintBOE)}.clear`, {}), 409, 'has not been paid')
//     await POST(`${decl(ID.paintBOE)}.payDuty`, {})

//     const res = await POST(`${decl(ID.paintBOE)}.clear`, { remarks: 'MSDS verified' })
//     assert.equal(res.data.status_code, 'CLEARED')
//     assert.ok(String(res.headers['sap-messages']).includes('released from customs hold'))

//     const { data: box } = await GET(`${cargo}/Containers(${ID.paintBox})`)
//     assert.equal(box.status_code, 'DISCHARGED')
//   })

//   test('broker must have the CHA role', async () => {
//     await failsWith(PATCH(`${cargo}/CustomsDeclarations(${ID.machineryBOE})`, { broker_ID: ID.shipper }), 400, 'cannot be used as broker_ID')
//   })
// })

describe('Customs declarations', () => {
  test('clear needs paid duty; clearing releases the held container', async () => {
    const decl = id => `${cargo}/CustomsDeclarations(${active(id)})/CargoService`
    await failsWith(POST(`${decl(ID.paintBOE)}.clear`, {}), 409, 'has not been paid')
    await POST(`${decl(ID.paintBOE)}.payDuty`, {})

    const res = await POST(`${decl(ID.paintBOE)}.clear`, { remarks: 'MSDS verified' })
    assert.equal(res.data.status_code, 'CLEARED')
    assert.ok(String(res.headers['sap-messages']).includes('released from customs hold'))

    const { data: box } = await GET(`${cargo}/Containers(${ID.paintBox})`)
    assert.equal(box.status_code, 'DISCHARGED')
  })

  test('broker must have the CHA role (checked when the draft is saved)', async () => {
    await failsWith(cargoDraft.edit('CustomsDeclarations', ID.machineryBOE, { broker_ID: ID.shipper }),
      400, 'cannot be used as broker_ID')
  })
})

describe('Container lifecycle', () => {
  test('discharge only while the vessel is WORKING', async () => {
    const discharge = () => POST(`${cargo}/Containers(${ID.reeferBox})/CargoService.discharge`, { yardLocation: 'R-01-01-1' })
    await failsWith(discharge(), 409, 'while the vessel is WORKING')

    for (const a of ['arrive', 'berth', 'startWork'])
      await POST(`/operations/VesselCalls(${ID.vc2})/OperationsService.${a}`, {})

    const { data } = await discharge()
    assert.equal(data.status_code, 'DISCHARGED')
    assert.equal(data.yardLocation, 'R-01-01-1')
  })

  test('export containers start EXPECTED, client status is ignored', async () => {
    const { data } = await POST(`${cargo}/Manifests`, {
      manifestNumber: 'EGM-TEST-0002', call_ID: ID.vc2, direction_code: 'EXP',
      billsOfLading: [{
        blNumber: 'TESTBL0002', cargoType_code: 'CONT', description: 'Spices', grossWeightKg: 15000,
        containers: [{ containerNumber: 'BWSU3004006', type_code: '40GP', grossWeightKg: 15000, status_code: 'LOADED' }]
      }]
    })
    assert.equal(data.billsOfLading[0].containers[0].status_code, 'EXPECTED')
  })
})