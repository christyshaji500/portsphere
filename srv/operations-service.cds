using { portsphere as ps } from '../db/vessel-operations';

/** Ship agent + berth planner: vessel calls and berth planning */
service OperationsService @(path: '/operations') {
  
  // entity VesselCalls      as projection on ps.VesselCalls;
  entity VesselCalls as projection on ps.VesselCalls actions {
    /** Free berths that fit this call's vessel during ETA–ETD, best fit first */
    function availableBerths() returns many BerthOption;
  };

  type BerthOption {
    berth_ID          : UUID;
    code              : String(10);
    name              : String(60);
    terminal          : String(40);
    lengthMeters      : Decimal(7, 2);
    maxDraftMeters    : Decimal(5, 2);
    spareLengthMeters : Decimal(7, 2);
  }
  entity BerthAllocations as projection on ps.BerthAllocations;

  // master data – read-only here (value helps, $expand)
  @readonly entity Vessels          as projection on ps.Vessels;
  @readonly entity Berths           as projection on ps.Berths;
  @readonly entity BusinessPartners as projection on ps.BusinessPartners;
  @readonly entity CallStatuses     as projection on ps.CallStatuses;
}