import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isAfter, imoCheckDigit, isValidImo, containerCheckDigit, isValidContainerNumber
} from '../../srv/lib/validators.js'

test('isAfter', () => {
  assert.equal(isAfter('2026-11-16T00:00:00Z', '2026-11-15T00:00:00Z'), true)
  assert.equal(isAfter('2026-11-15T00:00:00Z', '2026-11-15T00:00:00Z'), false)
})

test('IMO: all sample vessels are valid', () => {
  for (const imo of ['9312341', '9456783', '9620011', '9785031', '9500120'])
    assert.equal(isValidImo(imo), true, imo)
})

test('IMO: typo is rejected and the expected digit is reported', () => {
  assert.equal(isValidImo('9312342'), false)
  assert.equal(imoCheckDigit('9312342'), 1)
  assert.equal(imoCheckDigit('12345'), null)      // wrong shape → not our job
  assert.equal(isValidImo(undefined), false)
})

test('Container: all sample containers are valid', () => {
  for (const n of ['OCLU1234563', 'OCLU7654326', 'OCLU1002001', 'OCLU2468102', 'BWSU5551234', 'BWSU9008009'])
    assert.equal(isValidContainerNumber(n), true, n)
})

test('Container: typo, remainder-10 rule, wrong shape', () => {
  assert.equal(isValidContainerNumber('OCLU1234567'), false)
  assert.equal(containerCheckDigit('OCLU1234567'), 3)
  assert.equal(isValidContainerNumber('OCLU0000010'), true)   // sum mod 11 = 10 → digit 0
  assert.equal(containerCheckDigit('ABC123'), null)
})