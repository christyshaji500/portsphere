namespace portsphere;

using { cuid, managed } from '@sap/cds/common';
using { portsphere.Vessels, portsphere.Berths, portsphere.BusinessPartners } from './master-data';
using { portsphere.CallStatuses } from './codelists';

/** One visit of one vessel to our port */
entity VesselCalls : cuid, managed {
  callNumber       : String(12) @mandatory;          // e.g. VC-2026-0001 (auto-numbered in Phase 2)
  vessel           : Association to Vessels          @mandatory @assert.target;
  voyageNumber     : String(10) @mandatory;          // shipping line's voyage code, e.g. 045E
  shippingLine     : Association to BusinessPartners @mandatory @assert.target;
  agent            : Association to BusinessPartners @mandatory @assert.target;
  eta              : Timestamp  @mandatory;          // estimated time of arrival
  etd              : Timestamp  @mandatory;          // estimated time of departure
  ata              : Timestamp;                      // actual time of arrival
  atd              : Timestamp;                      // actual time of departure
  status           : Association to CallStatuses default 'PLANNED';
  remarks          : String(500);

  // children that belong to this call
  berthAllocations : Composition of many BerthAllocations on berthAllocations.call = $self;
}
annotate VesselCalls with @assert.unique: { callNumber: [callNumber] };

/** Reservation of one berth for a time window of a vessel call */
entity BerthAllocations : cuid, managed {
  call        : Association to VesselCalls @mandatory;  // backlink to the parent
  berth       : Association to Berths      @mandatory @assert.target;
  fromTime    : Timestamp @mandatory;
  toTime      : Timestamp @mandatory;
  isConfirmed : Boolean default false;
  remarks     : String(250);
}