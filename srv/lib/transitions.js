import cds from '@sap/cds'
import { transitionError } from './state-machine.js'
const { SELECT, UPDATE } = cds.ql

/**
 * Registers one handler per action in `flow`.
 *  hooks.before[action](req, current) → extra fields to save (or req.reject to stop)
 *  hooks.after[action](req, current)  → side effects after the status change
 */
export function registerTransitions(srv, entity, dbEntity, flow, hooks = {}) {
  for (const action of Object.keys(flow)) {
    srv.on(action, entity, async req => {
      const current = await SELECT.one.from(req.subject)
      if (!current) return req.reject(404, 'NOT_FOUND')

      const problem = transitionError(flow, action, current.status_code)
      if (problem) return req.reject(409, ...problem)

      const extra = (await hooks.before?.[action]?.(req, current)) ?? {}

      // Optimistic concurrency: only update if the status is still what we read
      const affected = await UPDATE(dbEntity)
        .with({ ...extra, status_code: flow[action].to })
        .where({ ID: current.ID, status_code: current.status_code })
      if (!affected) return req.reject(409, 'CONCURRENT_CHANGE')

      await hooks.after?.[action]?.(req, current)
      return SELECT.one.from(req.subject)        // return the updated record
    })
  }
}

/**
 * Status/timestamp fields may only change through actions.
 * CREATE: client values are dropped, initial values are set.
 * UPDATE: unchanged values are dropped silently (Fiori sends whole records),
 *         CHANGED values are rejected.
 */
export function protectFields(srv, entity, { fields, initial = {} }) {
  srv.before('CREATE', entity, req => {
    for (const f of fields) delete req.data[f]
    Object.assign(req.data, initial)
  })
  srv.before('UPDATE', entity, async req => {
    const sent = fields.filter(f => f in req.data)
    if (!sent.length) return
    const current = await SELECT.one.from(req.subject).columns(...sent)
    const changed = sent.filter(f => !sameValue(req.data[f], current?.[f]))
    if (changed.length) return req.reject(400, 'FIELDS_VIA_ACTIONS_ONLY', [changed.join(', ')])
    for (const f of sent) delete req.data[f]
  })
}

const sameValue = (a, b) =>
  a == null || b == null ? a == b
  : String(a) === String(b) || new Date(a).getTime() === new Date(b).getTime()