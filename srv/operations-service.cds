using { portsphere as ps } from '../db/vessel-operations';

/** Ship agent + berth planner: vessel calls and berth planning */
service OperationsService @(path: '/operations') {
  entity VesselCalls      as projection on ps.VesselCalls;
  entity BerthAllocations as projection on ps.BerthAllocations;

  // master data – read-only here (value helps, $expand)
  @readonly entity Vessels          as projection on ps.Vessels;
  @readonly entity Berths           as projection on ps.Berths;
  @readonly entity BusinessPartners as projection on ps.BusinessPartners;
  @readonly entity CallStatuses     as projection on ps.CallStatuses;
}