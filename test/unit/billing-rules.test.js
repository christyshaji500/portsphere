import { test } from 'node:test'
import assert from 'node:assert/strict'
import { round2, berthHours, storageDays, pickTariff } from '../../srv/lib/billing-rules.js'

test('berthHours: 39.5 h at berth is billed as 40 h', () => {
  assert.equal(berthHours([{ fromTime: '2026-11-11T04:30:00Z', toTime: '2026-11-12T20:00:00Z' }]), 40)
})

test('storageDays: free days first, then every started day', () => {
  assert.equal(storageDays('2026-11-01T10:00:00Z', '2026-11-03T09:00:00Z', 3), 0)   // inside free time
  assert.equal(storageDays('2026-11-01T10:00:00Z', '2026-11-06T11:00:00Z', 3), 3)   // 5 d 1 h → 6 started days − 3
})

test('pickTariff prefers the vessel-type tariff', () => {
  const t = [{ chargeType: 'PORT_DUES', vesselType: null, rate: 27.5 }, { chargeType: 'PORT_DUES', vesselType: 'TANK', rate: 30 }]
  assert.equal(pickTariff(t, 'PORT_DUES', 'TANK').rate, 30)
  assert.equal(pickTariff(t, 'PORT_DUES', 'CONT').rate, 27.5)
  assert.equal(pickTariff(t, 'STORAGE', 'CONT'), undefined)
})

test('round2', () => assert.equal(round2(1.005), 1.01))