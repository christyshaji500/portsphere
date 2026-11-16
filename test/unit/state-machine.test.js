import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CALL_FLOW, DECLARATION_FLOW, transitionError, allowedActions } from '../../srv/lib/state-machine.js'

test('allowed transition returns null', () => {
  assert.equal(transitionError(CALL_FLOW, 'arrive', 'PLANNED'), null)
})

test('forbidden transition explains why', () => {
  assert.deepEqual(transitionError(CALL_FLOW, 'depart', 'PLANNED'),
    ['INVALID_TRANSITION', ['depart', 'PLANNED', 'COMPLETED']])
  assert.equal(transitionError(CALL_FLOW, 'fly', 'PLANNED')[0], 'UNKNOWN_ACTION')
})

test('allowedActions per status', () => {
  assert.deepEqual(allowedActions(CALL_FLOW, 'PLANNED'), ['arrive', 'cancel'])
  assert.deepEqual(allowedActions(CALL_FLOW, 'DEPARTED'), [])
  assert.deepEqual(allowedActions(DECLARATION_FLOW, 'ASSESSED'), ['payDuty', 'clear', 'rejectDeclaration'])
})