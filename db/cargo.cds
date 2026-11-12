namespace portsphere;

using { cuid, managed, Currency } from '@sap/cds/common';
using { portsphere.VesselCalls } from './vessel-operations';
using { portsphere.BusinessPartners } from './master-data';
using {
  portsphere.TradeDirections, portsphere.CargoTypes, portsphere.ContainerTypes,
  portsphere.HazardClasses, portsphere.ContainerStatuses,
  portsphere.DeclarationTypes, portsphere.DeclarationStatuses
} from './codelists';

/** Cargo list of one vessel call – IGM (import) or EGM (export) */
entity Manifests : cuid, managed {
  manifestNumber : String(15) @mandatory;
  call           : Association to VesselCalls      @mandatory @assert.target;
  direction      : Association to TradeDirections  @mandatory;
  filedBy        : Association to BusinessPartners @assert.target;   // line or agent
  filedAt        : Timestamp;
  billsOfLading  : Composition of many BillsOfLading on billsOfLading.manifest = $self;
}
annotate Manifests with @assert.unique: { manifestNumber: [manifestNumber] };

/** One shipment on the manifest */
entity BillsOfLading : cuid, managed {
  manifest        : Association to Manifests @mandatory;
  blNumber        : String(20)    @mandatory;
  shipper         : Association to BusinessPartners @assert.target;
  consignee       : Association to BusinessPartners @assert.target;
  portOfLoading   : String(5);    // UN/LOCODE, e.g. SGSIN
  portOfDischarge : String(5);    // e.g. INCOK
  cargoType       : Association to CargoTypes @mandatory;
  description     : String(255)   @mandatory;
  grossWeightKg   : Decimal(12, 2) @mandatory @assert.range: [0.01, 999999999];
  hazardClass     : Association to HazardClasses;   // empty = not dangerous

  // calculated on read – never stored
  isHazardous     : Boolean = case when hazardClass.code is null then false else true end;

  containers          : Composition of many Containers on containers.bl = $self;
  customsDeclarations : Association to many CustomsDeclarations on customsDeclarations.bl = $self;
}
annotate BillsOfLading with @assert.unique: { blNumber: [blNumber] };

/** Physical ISO container */
entity Containers : cuid, managed {
  bl              : Association to BillsOfLading @mandatory;
  containerNumber : String(11) @mandatory @assert.format: '^[A-Z]{4}[0-9]{7}$';  // ISO 6346
  type            : Association to ContainerTypes @mandatory;
  sealNumber      : String(15);
  grossWeightKg   : Decimal(10, 2) @mandatory @assert.range: [0.01, 99999];
  status          : Association to ContainerStatuses default 'ON_VESSEL';
  yardLocation    : String(12);   // block-row-bay-tier, e.g. A-03-02-1
  dischargedAt    : Timestamp;
  gatedOutAt      : Timestamp;

  // calculated from the container type: 20ft = 1, 40ft = 2
  teu             : Decimal(3, 1) = type.teu;
}

/** Bill of Entry (import) / Shipping Bill (export) filed by a customs broker */
entity CustomsDeclarations : cuid, managed {
  declarationNumber : String(20) @mandatory;
  type              : Association to DeclarationTypes @mandatory;
  bl                : Association to BillsOfLading    @mandatory @assert.target;
  broker            : Association to BusinessPartners @mandatory @assert.target;  // CHA
  filedAt           : Timestamp;
  assessableValue   : Decimal(15, 2);
  dutyAmount        : Decimal(15, 2);
  currency          : Currency;
  status            : Association to DeclarationStatuses default 'DRAFT';
  clearedAt         : Timestamp;
  officerRemarks    : String(500);
}
annotate CustomsDeclarations with @assert.unique: { number: [declarationNumber] };

/** Navigation from a vessel call to its manifests – added without editing vessel-operations.cds */
extend VesselCalls with {
  manifests : Association to many Manifests on manifests.call = $self;
}