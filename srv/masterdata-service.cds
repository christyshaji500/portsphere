using { portsphere as ps } from '../db/master-data';
using from '../db/billing';

/** Port admin: reference data used by every other service */
service MasterDataService @(path: '/masterdata') {
  entity Berths           as projection on ps.Berths;
  entity Vessels          as projection on ps.Vessels;
  entity BusinessPartners as projection on ps.BusinessPartners;
  entity Tariffs          as projection on ps.Tariffs;

  @readonly entity VesselTypes  as projection on ps.VesselTypes;
  @readonly entity PartnerRoles as projection on ps.PartnerRoles;
  @readonly entity ChargeTypes  as projection on ps.ChargeTypes;
}