using { portsphere as ps } from '../db/billing';

/** Finance: invoices for vessel calls */
service BillingService @(path: '/billing') {
  entity Invoices     as projection on ps.Invoices;
  entity InvoiceItems as projection on ps.InvoiceItems;

  @readonly entity Tariffs          as projection on ps.Tariffs;
  @readonly entity VesselCalls      as projection on ps.VesselCalls;
  @readonly entity BusinessPartners as projection on ps.BusinessPartners;
  @readonly entity ChargeTypes      as projection on ps.ChargeTypes;
  @readonly entity InvoiceStatuses  as projection on ps.InvoiceStatuses;
}