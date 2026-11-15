import cds from '@sap/cds'
import { nextNumber } from './lib/numbering.js'

export default class BillingService extends cds.ApplicationService {
  async init() {
    const { Invoices } = this.entities

    this.before('CREATE', Invoices, async req => { req.data.invoiceNumber = await nextNumber('INV') })

    return super.init()
  }
}