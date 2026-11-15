import cds from '@sap/cds'
import { nextNumber } from './lib/numbering.js'

export default class ReleaseService extends cds.ApplicationService {
  async init() {
    const { DeliveryOrders, GatePasses, Documents } = this.entities

    this.before('CREATE', DeliveryOrders, async req => { req.data.doNumber       = await nextNumber('DO')  })
    this.before('CREATE', GatePasses,     async req => { req.data.passNumber     = await nextNumber('GP')  })
    this.before('CREATE', Documents,      async req => { req.data.documentNumber = await nextNumber('DOC') })

    return super.init()
  }
}