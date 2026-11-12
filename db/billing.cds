namespace portsphere;

using { cuid, managed, temporal, Currency } from '@sap/cds/common';
using { portsphere.BusinessPartners, portsphere.VesselTypes } from './master-data';
using { portsphere.VesselCalls } from './vessel-operations';
using { portsphere.Documents } from './documents';
using { portsphere.ChargeTypes, portsphere.InvoiceStatuses } from './codelists';

/** Price list entry – valid for a period of time (temporal) */
entity Tariffs : cuid, managed, temporal {
  chargeType  : Association to ChargeTypes @mandatory;
  vesselType  : Association to VesselTypes;            // optional: rate only for one vessel type
  rate        : Decimal(12, 4) @mandatory @assert.range: [0, 999999999];
  currency    : Currency;
  unit        : String(20);                            // per GT, per hour, per TEU/day …
  freeDays    : Integer default 0;                     // for storage charges
  description : String(250);
}

/** Bill for one vessel call */
entity Invoices : cuid, managed {
  invoiceNumber : String(20) @mandatory;
  call          : Association to VesselCalls      @mandatory @assert.target;
  billTo        : Association to BusinessPartners @mandatory @assert.target;
  invoiceDate   : Date @mandatory;
  dueDate       : Date;
  currency      : Currency;
  status        : Association to InvoiceStatuses default 'DRAFT';
  netAmount     : Decimal(15, 2) default 0;            // sum of items – recalculated by handler in Phase 2
  taxRate       : Decimal(5, 2)  default 18.00;        // GST %

  // calculated on read
  taxAmount     : Decimal(15, 2) = round(netAmount * taxRate / 100, 2);
  grossAmount   : Decimal(15, 2) = netAmount + round(netAmount * taxRate / 100, 2);

  document      : Association to Documents;
  items         : Composition of many InvoiceItems on items.invoice = $self;
}
annotate Invoices with @assert.unique: { number: [invoiceNumber] };

/** One charge line – rate is COPIED from the tariff (snapshot principle) */
entity InvoiceItems : cuid {
  invoice     : Association to Invoices @mandatory;
  lineNo      : Integer @mandatory;
  chargeType  : Association to ChargeTypes @mandatory;
  tariff      : Association to Tariffs;               // which tariff was applied (audit trail)
  description : String(200);
  quantity    : Decimal(12, 3) @mandatory @assert.range: [0.001, 999999999];
  unit        : String(20);
  rate        : Decimal(12, 4) @mandatory @assert.range: [0, 999999999];

  // calculated on read
  amount      : Decimal(15, 2) = round(quantity * rate, 2);
}

extend VesselCalls with {
  invoices : Association to many Invoices on invoices.call = $self;
}