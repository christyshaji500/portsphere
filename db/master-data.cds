namespace portsphere;

using { cuid, managed, Country } from '@sap/cds/common';
using { portsphere.VesselTypes, portsphere.PartnerRoles } from './codelists';
using from '@sap/cds-common-content';

/** Physical berth (quay position) where ships moor */
entity Berths : cuid, managed {
  code           : String(10)    @mandatory;
  name           : String(60)    @mandatory;
  terminal       : String(40);
  lengthMeters   : Decimal(7, 2) @mandatory;  // max vessel length it can take
  maxDraftMeters : Decimal(5, 2) @mandatory;  // water depth limit
  craneCount     : Integer default 0;
  isActive       : Boolean default true;
}
annotate Berths with @assert.unique: { code: [code] };

/** Ship master data – identified worldwide by its IMO number */
entity Vessels : cuid, managed {
  imoNumber     : String(7)     @mandatory  @assert.format: '^[0-9]{7}$';
  name          : String(80)    @mandatory;
  type          : Association to VesselTypes @mandatory;
  flag          : Country;                     // country of registration
  lengthOverall : Decimal(7, 2) @mandatory;   // LOA in meters
  beam          : Decimal(5, 2);              // width in meters
  maxDraft      : Decimal(5, 2) @mandatory;   // depth below waterline in meters
  grossTonnage  : Integer;
  owner         : Association to BusinessPartners;
}
annotate Vessels with @assert.unique: { imo: [imoNumber] };

/** Every external party: shipping lines, agents, customs brokers, shippers, consignees */
entity BusinessPartners : cuid, managed {
  bpNumber : String(10)  @mandatory;
  name     : String(100) @mandatory;
  role     : Association to PartnerRoles @mandatory;
  email    : String(120);
  phone    : String(20);
  country  : Country;
  taxId    : String(20);  // e.g. GSTIN for Indian partners
  isActive : Boolean default true;
}
annotate BusinessPartners with @assert.unique: { bpNumber: [bpNumber] };