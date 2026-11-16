import cds from '@sap/cds'
import { nextNumber } from './lib/numbering.js'
import { protectFields, registerTransitions } from './lib/transitions.js'
import { INVOICE_FLOW } from './lib/state-machine.js'
import { buildChargeLines, recalcNetAmount } from './lib/billing-engine.js'
const { SELECT, INSERT } = cds.ql

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (isoDate, n) => new Date(Date.parse(isoDate) + n * 864e5).toISOString().slice(0, 10)

export default class BillingService extends cds.ApplicationService {
  async init() {
    const { Invoices, InvoiceItems, VesselCalls } = this.entities
    const db = cds.entities('portsphere')

    // ── Numbering (2.3) + protected fields ──
    this.before('CREATE', Invoices, async req => { req.data.invoiceNumber = await nextNumber('INV') })
    protectFields(this, Invoices, { fields: ['status_code', 'netAmount', 'cancelReason'], initial: { status_code: 'DRAFT' } })

    // ── Rule 4: only DRAFT invoices can change ──
    const requireDraft = async (req, invoiceID) => {
      const inv = await SELECT.one.from(db.Invoices).columns('invoiceNumber', 'status_code').where({ ID: invoiceID })
      if (inv && inv.status_code !== 'DRAFT') req.reject(409, 'INVOICE_NOT_DRAFT', [inv.invoiceNumber, inv.status_code])
    }
    this.before(['UPDATE', 'DELETE'], Invoices, async req => {
      const inv = await SELECT.one.from(req.subject).columns('ID')
      if (inv) await requireDraft(req, inv.ID)
    })
    this.before(['CREATE', 'UPDATE', 'DELETE'], InvoiceItems, async req => {
      const invoiceID = req.event === 'CREATE'
        ? req.data.invoice_ID
        : (await SELECT.one.from(req.subject).columns('invoice_ID'))?.invoice_ID
      req.invoiceToRecalc = invoiceID          // remembered for the after handler (needed for DELETE)
      if (invoiceID) await requireDraft(req, invoiceID)
    })

    // ── Rule 5: netAmount always = sum of items ──
    this.after(['CREATE', 'UPDATE'], Invoices, (_, req) => recalcNetAmount(req.data.ID))
    this.after(['CREATE', 'UPDATE', 'DELETE'], InvoiceItems, (_, req) =>
      req.invoiceToRecalc && recalcNetAmount(req.invoiceToRecalc))

    // ── Invoice lifecycle ──
    registerTransitions(this, Invoices, db.Invoices, INVOICE_FLOW, {
      before: {
        issue: async (req, inv) => {
          const item = await SELECT.one.from(db.InvoiceItems).columns('ID').where({ invoice_ID: inv.ID })
          if (!item) req.reject(409, 'INVOICE_NO_ITEMS', [inv.invoiceNumber])
          return inv.dueDate ? {} : { dueDate: addDays(inv.invoiceDate, 14) }
        },
        cancelInvoice: req => {
          const reason = req.data.reason?.trim()
          if (!reason) req.reject(400, 'REASON_REQUIRED')
          return { cancelReason: reason }
        }
      }
    })

    // ── Rules 1–3: generate the invoice of a departed call ──
    this.on('generateInvoice', VesselCalls, async req => {
      const call = await SELECT.one.from(req.subject)
      if (!call) return req.reject(404, 'CALL_NOT_FOUND')
      if (call.status_code !== 'DEPARTED')
        return req.reject(409, 'CALL_NOT_DEPARTED', [call.callNumber, call.status_code])

      const existing = await SELECT.one.from(db.Invoices).columns('invoiceNumber')
        .where`call_ID = ${call.ID} and status_code <> 'CANCELLED'`
      if (existing) return req.reject(409, 'INVOICE_EXISTS', [call.callNumber, existing.invoiceNumber])

      const lines = await buildChargeLines(call)
      if (!lines.length) return req.reject(409, 'NOTHING_TO_BILL', [call.callNumber])

      // Insert THROUGH this service → numbering, protectFields and netAmount recalculation all run
      const ID = cds.utils.uuid(), invoiceDate = today()
      await this.run(INSERT.into(Invoices).entries({
        ID, call_ID: call.ID, billTo_ID: call.shippingLine_ID,
        invoiceDate, dueDate: addDays(invoiceDate, 14), currency_code: 'INR',
        items: lines.map((line, i) => ({ lineNo: i + 1, ...line }))
      }))
      return this.run(SELECT.one.from(Invoices).where({ ID }))
    })

    return super.init()
  }
}