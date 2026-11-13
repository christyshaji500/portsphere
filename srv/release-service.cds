using { portsphere as ps } from '../db/documents';

/** Shipping line + gate operator: cargo release and signed documents */
service ReleaseService @(path: '/release') {
  entity DeliveryOrders as projection on ps.DeliveryOrders;
  entity GatePasses     as projection on ps.GatePasses;
  entity Documents      as projection on ps.Documents;
  entity Signatures     as projection on ps.Signatures;

  @readonly entity BillsOfLading     as projection on ps.BillsOfLading;
  @readonly entity Containers        as projection on ps.Containers;
  @readonly entity BusinessPartners  as projection on ps.BusinessPartners;
  @readonly entity DocumentTypes     as projection on ps.DocumentTypes;
  @readonly entity DocumentStatuses  as projection on ps.DocumentStatuses;
  @readonly entity SignatureStatuses as projection on ps.SignatureStatuses;
}