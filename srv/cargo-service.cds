using { portsphere as ps } from '../db/cargo';

/** Shipping line, customs broker, customs officer: cargo and clearance */
service CargoService @(path: '/cargo') {
  entity Manifests           as projection on ps.Manifests;
  entity BillsOfLading       as projection on ps.BillsOfLading;
  entity Containers          as projection on ps.Containers;
  entity CustomsDeclarations as projection on ps.CustomsDeclarations;

  @readonly entity VesselCalls         as projection on ps.VesselCalls;
  @readonly entity BusinessPartners    as projection on ps.BusinessPartners;
  @readonly entity TradeDirections     as projection on ps.TradeDirections;
  @readonly entity CargoTypes          as projection on ps.CargoTypes;
  @readonly entity ContainerTypes      as projection on ps.ContainerTypes;
  @readonly entity HazardClasses       as projection on ps.HazardClasses;
  @readonly entity ContainerStatuses   as projection on ps.ContainerStatuses;
  @readonly entity DeclarationTypes    as projection on ps.DeclarationTypes;
  @readonly entity DeclarationStatuses as projection on ps.DeclarationStatuses;
}