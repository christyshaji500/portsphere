using { portsphere as ps } from '../db/master-data';
using from '../db/codelists';
using from '../db/vessel-operations';
using from '../db/cargo';
using from '../db/documents';

service AdminService @(path: '/admin') {
  entity Berths           as projection on ps.Berths;
  entity Vessels          as projection on ps.Vessels;
  entity BusinessPartners as projection on ps.BusinessPartners;

    // Vessel operations
  entity VesselCalls      as projection on ps.VesselCalls;
  entity BerthAllocations as projection on ps.BerthAllocations;

    // Cargo & customs
  entity Manifests           as projection on ps.Manifests;
  entity BillsOfLading       as projection on ps.BillsOfLading;
  entity Containers          as projection on ps.Containers;
  entity CustomsDeclarations as projection on ps.CustomsDeclarations;

    // Documents & release
  entity Documents      as projection on ps.Documents;
  entity Signatures     as projection on ps.Signatures;
  entity DeliveryOrders as projection on ps.DeliveryOrders;
  entity GatePasses     as projection on ps.GatePasses;

  // Code lists – read-only lookups
  @readonly entity VesselTypes     as projection on ps.VesselTypes;
  @readonly entity PartnerRoles    as projection on ps.PartnerRoles;
  @readonly entity CallStatuses    as projection on ps.CallStatuses;
  @readonly entity TradeDirections as projection on ps.TradeDirections;
  @readonly entity CargoTypes      as projection on ps.CargoTypes;
  @readonly entity ContainerTypes  as projection on ps.ContainerTypes;
  @readonly entity HazardClasses   as projection on ps.HazardClasses;

  @readonly entity ContainerStatuses   as projection on ps.ContainerStatuses;
  @readonly entity DeclarationTypes    as projection on ps.DeclarationTypes;
  @readonly entity DeclarationStatuses as projection on ps.DeclarationStatuses;

  @readonly entity DocumentTypes     as projection on ps.DocumentTypes;
  @readonly entity DocumentStatuses  as projection on ps.DocumentStatuses;
  @readonly entity SignatureStatuses as projection on ps.SignatureStatuses;
}