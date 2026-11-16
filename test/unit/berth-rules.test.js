import { test } from 'node:test'
import assert from 'node:assert/strict'
import { overlaps, fitProblems, toISO } from '../../srv/lib/berth-rules.js'

const T = h => `2026-11-15T${String(h).padStart(2, '0')}:00:00Z`

test('overlaps', () => {
  assert.equal(overlaps(T(6), T(12), T(10), T(14)), true)   // partial
  assert.equal(overlaps(T(6), T(18), T(8), T(10)), true)    // B inside A
  assert.equal(overlaps(T(6), T(12), T(12), T(18)), false)  // back-to-back
  assert.equal(overlaps(T(6), T(8), T(10), T(12)), false)   // apart
})

test('fitProblems', () => {
  const berth = { code: 'B05', isActive: true, lengthMeters: '180.00', maxDraftMeters: '10.00' }
  assert.deepEqual(fitProblems({ name: 'SMALL', lengthOverall: 140, maxDraft: 8.5 }, berth), [])
  const p = fitProblems({ name: 'BIG', lengthOverall: 250, maxDraft: 15.2 }, berth)
  assert.deepEqual(p.map(([key]) => key), ['VESSEL_TOO_LONG', 'VESSEL_TOO_DEEP'])
  assert.deepEqual(fitProblems({ name: 'S', lengthOverall: 1, maxDraft: 1 }, { ...berth, isActive: false }).map(([k]) => k), ['BERTH_INACTIVE'])
})

test('toISO adds milliseconds', () => {
  assert.equal(toISO('2026-11-15T06:00:00Z'), '2026-11-15T06:00:00.000Z')
})