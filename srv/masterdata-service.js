import cds from '@sap/cds'
import { imoCheckDigit } from './lib/validators.js'

export default class MasterDataService extends cds.ApplicationService {
  async init() {
    const { Vessels } = this.entities

    this.before(['CREATE', 'UPDATE'], Vessels, req => {
      const { imoNumber } = req.data          // undefined on a PATCH that doesn't touch it
      const expected = imoCheckDigit(imoNumber)
      if (expected !== null && expected !== Number(imoNumber[6]))
        req.error({ status: 400, message: 'IMO_CHECK_DIGIT_INVALID', args: [imoNumber, expected], target: 'imoNumber' })
    })

    return super.init()
  }
}