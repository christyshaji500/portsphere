/** Allowed transitions: action → { from: [statuses], to: status } */
export const CALL_FLOW = {
  arrive:    { from: ['PLANNED'],            to: 'ARRIVED' },
  berth:     { from: ['ARRIVED'],            to: 'BERTHED' },
  startWork: { from: ['BERTHED'],            to: 'WORKING' },
  complete:  { from: ['WORKING'],            to: 'COMPLETED' },
  depart:    { from: ['COMPLETED'],          to: 'DEPARTED' },
  cancel:    { from: ['PLANNED', 'ARRIVED'], to: 'CANCELLED' }
}

export const DECLARATION_FLOW = {
  file:              { from: ['DRAFT'],                 to: 'FILED' },
  assess:            { from: ['FILED'],                 to: 'ASSESSED' },
  payDuty:           { from: ['ASSESSED'],              to: 'DUTY_PAID' },
  clear:             { from: ['ASSESSED', 'DUTY_PAID'], to: 'CLEARED' },   // from ASSESSED only if duty is 0 (checked in hook)
  rejectDeclaration: { from: ['FILED', 'ASSESSED'],     to: 'REJECTED' }
}

/** null if allowed, otherwise [messageKey, args] */
export function transitionError(flow, action, status) {
  const rule = flow[action]
  if (!rule) return ['UNKNOWN_ACTION', [action]]
  if (!rule.from.includes(status)) return ['INVALID_TRANSITION', [action, status, rule.from.join(', ')]]
  return null
}

/** Which actions are possible in this status – Fiori will use this to enable/disable buttons */
export const allowedActions = (flow, status) =>
  Object.keys(flow).filter(action => flow[action].from.includes(status))

export const CONTAINER_FLOW = {
  discharge: { from: ['ON_VESSEL'],             to: 'DISCHARGED' },  // import: ship → yard
  hold:      { from: ['DISCHARGED', 'GATED_IN'], to: 'HOLD' },        // customs block
  load:      { from: ['GATED_IN'],               to: 'LOADED' }       // export: yard → ship
}