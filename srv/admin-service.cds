using { portsphere as ps } from '../db/master-data';
using from '../db/codelists';
using from '../db/vessel-operations';

service AdminService @(path: '/admin') {
  entity Berths           as projection on ps.Berths;
  entity Vessels          as projection on ps.Vessels;
  entity BusinessPartners as projection on ps.BusinessPartners;

    // Vessel operations
  entity VesselCalls      as projection on ps.VesselCalls;
  entity BerthAllocations as projection on ps.BerthAllocations;

  // Code lists – read-only lookups
  @readonly entity VesselTypes     as projection on ps.VesselTypes;
  @readonly entity PartnerRoles    as projection on ps.PartnerRoles;
  @readonly entity CallStatuses    as projection on ps.CallStatuses;
  @readonly entity TradeDirections as projection on ps.TradeDirections;
  @readonly entity CargoTypes      as projection on ps.CargoTypes;
  @readonly entity ContainerTypes  as projection on ps.ContainerTypes;
  @readonly entity HazardClasses   as projection on ps.HazardClasses;
}