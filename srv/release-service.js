import cds from '@sap/cds'
import { nextNumber } from './lib/numbering.js'
import { isAfter } from './lib/validators.js'
import { effectiveValues } from './lib/request-utils.js'
import { protectFields } from './lib/transitions.js'
import { roleProblem } from './lib/partner-checks.js'
import { containerInfo, outboundProblems, inboundProblems, findOpenPass } from './lib/release-checks.js'
const { SELECT, UPDATE } = cds.ql

/** Report a list of [messageKey, args] as collected errors */
const report = (req, problems, target) =>
  problems.forEach(([message, args]) => req.error({ status: 400, message, args, target }))

export default class ReleaseService extends cds.ApplicationService {
  async init() {
    const { DeliveryOrders, GatePasses, Documents } = this.entities
    const db = cds.entities('portsphere')
    const now = () => new Date().toISOString()

    // ── Numbering (2.3) ──
    this.before('CREATE', DeliveryOrders, async req => { req.data.doNumber       = await nextNumber('DO')  })
    this.before('CREATE', GatePasses,     async req => { req.data.passNumber     = await nextNumber('GP')  })
    this.before('CREATE', Documents,      async req => { req.data.documentNumber = await nextNumber('DOC') })

    // ── Delivery orders: import B/L only, right partner roles, not already expired ──
    this.before(['CREATE', 'UPDATE'], DeliveryOrders, async req => {
      const d = await effectiveValues(req, ['bl_ID', 'issuedBy_ID', 'issuedTo_ID', 'validUntil'])

      const bl = await SELECT.one.from(db.BillsOfLading)
        .columns('blNumber', 'manifest.direction_code as direction').where({ ID: d.bl_ID })
      if (bl && bl.direction !== 'IMP')
        req.error({ status: 400, message: 'DO_IMPORT_ONLY', args: [bl.blNumber], target: 'bl_ID' })

      for (const [field, roles] of [['issuedBy_ID', ['SHIPPING_LINE', 'AGENT']], ['issuedTo_ID', ['CONSIGNEE', 'CHA']]]) {
        const p = await roleProblem(d[field], roles, field)
        if (p) report(req, [p], field)
      }

      if (req.event === 'CREATE' && d.validUntil && d.validUntil < now().slice(0, 10))
        req.error({ status: 400, message: 'DO_VALID_UNTIL_PAST', target: 'validUntil' })
    })

    // ── Gate passes: gate times only through gateIn / gateOut ──
    protectFields(this, GatePasses, { fields: ['gateInAt', 'gateOutAt'] })

    // ── Gate pass issue: all rules, all problems reported at once ──
    this.before('CREATE', GatePasses, async req => {
      const gp = req.data
      if (gp.validFrom && gp.validTo && !isAfter(gp.validTo, gp.validFrom))
        req.error({ status: 400, message: 'PASS_WINDOW_INVALID', target: 'validTo' })

      const tp = await roleProblem(gp.transporter_ID, ['TRANSPORTER'], 'transporter_ID')
      if (tp) report(req, [tp], 'transporter_ID')

      const c = await containerInfo(gp.container_ID)
      if (!c) return

      report(req, gp.movement === 'OUT'
        ? await outboundProblems(c, gp.deliveryOrder_ID, gp.validTo)
        : await inboundProblems(c), 'container_ID')

      const open = await findOpenPass(c.ID, gp.movement, gp.ID)
      if (open) req.error({ status: 400, message: 'OPEN_PASS_EXISTS', args: [c.containerNumber, open.passNumber], target: 'container_ID' })
    })

    // ── Truck enters the terminal ──
    this.on('gateIn', GatePasses, async req => {
      const gp = await SELECT.one.from(req.subject)
      if (!gp) return req.reject(404, 'NOT_FOUND')
      if (gp.gateInAt) return req.reject(409, 'ALREADY_GATED_IN', [gp.passNumber])

      const t = now()
      if (new Date(t) < new Date(gp.validFrom) || new Date(t) > new Date(gp.validTo))
        return req.reject(409, 'PASS_NOT_VALID_NOW', [gp.passNumber, gp.validFrom, gp.validTo])

      if (gp.movement === 'IN') {                      // export container arrives with the truck
        const c = await containerInfo(gp.container_ID)
        const [problem] = await inboundProblems(c)
        if (problem) return req.reject(409, ...problem)
        await UPDATE(db.Containers).with({ status_code: 'GATED_IN' }).where({ ID: c.ID })
      }
      await UPDATE(db.GatePasses).with({ gateInAt: t }).where({ ID: gp.ID })
      return SELECT.one.from(req.subject)
    })

    // ── Truck leaves the terminal ──
    this.on('gateOut', GatePasses, async req => {
      const gp = await SELECT.one.from(req.subject)
      if (!gp) return req.reject(404, 'NOT_FOUND')
      if (!gp.gateInAt) return req.reject(409, 'NOT_GATED_IN', [gp.passNumber])
      if (gp.gateOutAt) return req.reject(409, 'ALREADY_GATED_OUT', [gp.passNumber])

      const t = now()
      if (gp.movement === 'OUT') {                     // import container leaves with the truck
        // re-check: customs may have put a hold, or the DO may have expired since the pass was issued
        const c = await containerInfo(gp.container_ID)
        const [problem] = await outboundProblems(c, gp.deliveryOrder_ID, t)
        if (problem) return req.reject(409, ...problem)
        await UPDATE(db.Containers).with({ status_code: 'GATED_OUT', gatedOutAt: t }).where({ ID: c.ID })
      }
      await UPDATE(db.GatePasses).with({ gateOutAt: t }).where({ ID: gp.ID })
      return SELECT.one.from(req.subject)
    })

    return super.init()
  }
}