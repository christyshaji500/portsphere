using { portsphere as ps } from '../db/billing';

/** Finance: invoices for vessel calls */
service BillingService @(path: '/billing') {
  // entity Invoices     as projection on ps.Invoices;
  entity Invoices as projection on ps.Invoices actions {
    action issue()                             returns Invoices;
    action markPaid()                          returns Invoices;
    action cancelInvoice(reason : String(250)) returns Invoices;
  };
  entity InvoiceItems as projection on ps.InvoiceItems;

  @readonly entity Tariffs          as projection on ps.Tariffs;
  // @readonly entity VesselCalls      as projection on ps.VesselCalls;
  @readonly entity VesselCalls as projection on ps.VesselCalls actions {
    action generateInvoice() returns Invoices;
  };
  @readonly entity BusinessPartners as projection on ps.BusinessPartners;
  @readonly entity ChargeTypes      as projection on ps.ChargeTypes;
  @readonly entity InvoiceStatuses  as projection on ps.InvoiceStatuses;
}