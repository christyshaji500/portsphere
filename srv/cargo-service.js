import cds from '@sap/cds'
import { containerCheckDigit } from './lib/validators.js'

/** Reports every container in the list whose check digit is wrong */
const checkContainers = (req, containers = []) => {
  for (const { containerNumber } of containers) {
    const expected = containerCheckDigit(containerNumber)
    if (expected !== null && expected !== Number(containerNumber[10]))
      req.error({ status: 400, message: 'CONTAINER_CHECK_DIGIT_INVALID', args: [containerNumber, expected], target: 'containerNumber' })
  }
}

export default class CargoService extends cds.ApplicationService {
  async init() {
    const { Manifests, BillsOfLading, Containers } = this.entities

    // A container can enter the system through three doors – guard all of them:
    this.before(['CREATE', 'UPDATE'], Containers,    req => checkContainers(req, [req.data]))
    this.before(['CREATE', 'UPDATE'], BillsOfLading, req => checkContainers(req, req.data.containers))
    this.before(['CREATE', 'UPDATE'], Manifests,     req =>
      checkContainers(req, req.data.billsOfLading?.flatMap(bl => bl.containers ?? [])))

    return super.init()
  }
}