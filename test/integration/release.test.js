import { describe, test, before } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import cds from '@sap/cds'
import { ID, failsWith, daysFromNow, active, draftFlow } from './helpers.js'

const { GET, POST, PATCH } = cds.test(path.join(import.meta.dirname, '../..'))
const release = draftFlow({ POST, PATCH }, '/release', 'ReleaseService')

const window = () => ({ validFrom: daysFromNow(-1), validTo: daysFromNow(2) })   // always contains "now"
const PASS_OUT = '72000000-0000-4000-8000-000000000001'
const PASS_IN = '72000000-0000-4000-8000-000000000002'
const EXPORT_BOX = '22000000-0000-4000-8000-000000000001'

const outPass = (overrides = {}) => ({
  movement: 'OUT', container_ID: ID.machineryBox, deliveryOrder_ID: ID.do1,
  transporter_ID: ID.transporter, truckNumber: 'KL07AB1234', ...window(), ...overrides
})
const gate = (passID, name) => POST(`/release/GatePasses(${active(passID)})/ReleaseService.${name}`, {})

describe('Import release through the gate', () => {
  // keep the sample DO valid no matter when the suite runs (edited via draft, like in Fiori)
  before(() => release.edit('DeliveryOrders', ID.do1, { validUntil: daysFromNow(30).slice(0, 10) }))

  test('no pass while the Bill of Entry is not cleared', async () => {
    await failsWith(release.create('GatePasses', outPass()), 400, 'is not cleared')
  })

  test('after clearance the pass is issued, a second open pass is refused', async () => {
    await POST(`/cargo/CustomsDeclarations(${active(ID.machineryBOE)})/CargoService.clear`, {})
    const { data } = await release.create('GatePasses', outPass({ ID: PASS_OUT }))
    assert.match(data.passNumber, /^GP-\d{4}-\d{4}$/)
    await failsWith(release.create('GatePasses', outPass({ truckNumber: 'KL07ZZ9999' })), 400, 'already has an open gate pass')
  })

  test('held container with the wrong DO → all three problems reported', async () => {
    await failsWith(release.create('GatePasses', outPass({ container_ID: ID.paintBox, truckNumber: 'KL07AB5555' })),
      400, ['customs hold', 'is not cleared', 'does not cover'])
  })

  test('transporter must have the TRANSPORTER role', async () => {
    await failsWith(release.create('GatePasses', outPass({ transporter_ID: ID.consignee, truckNumber: 'KL07AB6666' })),
      400, 'cannot be used as transporter_ID')
  })

  test('gate-in, then gate-out moves the container out', async () => {
    await failsWith(gate(PASS_OUT, 'gateOut'), 409, 'has not entered yet')
    await gate(PASS_OUT, 'gateIn')
    const { data } = await gate(PASS_OUT, 'gateOut')
    assert.ok(data.gateOutAt)

    const { data: box } = await GET(`/cargo/Containers(${ID.machineryBox})`)
    assert.equal(box.status_code, 'GATED_OUT')
    assert.ok(box.gatedOutAt)
  })
})

describe('Export receipt through the gate', () => {
  test('announced export container comes in with an IN pass', async () => {
    await POST('/cargo/Manifests', {
      manifestNumber: 'EGM-TEST-0003', call_ID: ID.vc2, direction_code: 'EXP',
      billsOfLading: [{
        blNumber: 'TESTBL0003', shipper_ID: ID.shipper, cargoType_code: 'CONT', description: 'Pepper', grossWeightKg: 15000,
        containers: [{ ID: EXPORT_BOX, containerNumber: 'BWSU3004006', type_code: '40GP', grossWeightKg: 15000 }]
      }]
    })
    await release.create('GatePasses', {
      ID: PASS_IN, movement: 'IN', container_ID: EXPORT_BOX,
      transporter_ID: ID.transporter, truckNumber: 'KL41C5678', ...window()
    })
    await gate(PASS_IN, 'gateIn')

    const { data: box } = await GET(`/cargo/Containers(${EXPORT_BOX})`)
    assert.equal(box.status_code, 'GATED_IN')
    await failsWith(gate(PASS_IN, 'gateIn'), 409, 'already entered')
  })
})