namespace portsphere;

using { cuid, managed } from '@sap/cds/common';
using { portsphere.BusinessPartners } from './master-data';
using { portsphere.BillsOfLading, portsphere.Containers } from './cargo';
using {
  portsphere.DocumentTypes, portsphere.DocumentStatuses, portsphere.SignatureStatuses
} from './codelists';

/** Fixed set of values → enum instead of a code-list table */
type GateMovement : String(3) enum {
  GateIn  = 'IN';    // symbol GateIn, stored value 'IN'
  GateOut = 'OUT';   // symbol GateOut, stored value 'OUT'
};

/** Generic official document (DO, gate pass, …) with PDF + signatures */
entity Documents : cuid, managed {
  documentNumber    : String(20)  @mandatory;
  type              : Association to DocumentTypes @mandatory;
  title             : String(120) @mandatory;
  status            : Association to DocumentStatuses default 'DRAFT';

  @Core.MediaType                  : mediaType
  @Core.ContentDisposition.Filename: fileName
  content           : LargeBinary;               // the PDF itself (generated in Phase 5)

  @Core.IsMediaType
  mediaType         : String(100) default 'application/pdf';
  fileName          : String(120);
  contentHash       : String(64);                // SHA-256 of final PDF → tamper detection
  verificationToken : String(36);                // public ID printed in the QR code
  lockedAt          : Timestamp;

  signatures        : Composition of many Signatures on signatures.document = $self;
}
annotate Documents with @assert.unique: { number: [documentNumber] };

/** One required signature on a document, signed in sequence */
entity Signatures : cuid, managed {
  document       : Association to Documents @mandatory;
  sequence       : Integer     @mandatory @assert.range: [1, 10];
  signerRole     : String(30)  @mandatory;       // e.g. Shipping Line, Consignee, Customs Officer
  signerName     : String(80);
  signerEmail    : String(120);
  status         : Association to SignatureStatuses default 'PENDING';
  signedAt       : Timestamp;

  @Core.MediaType: 'image/png'
  signatureImage : LargeBinary;                  // drawn on the signature pad
  hashAtSigning  : String(64);                   // document hash the signer approved
  comment        : String(250);
}

/** Shipping line authorises the consignee to collect import cargo */
entity DeliveryOrders : cuid, managed {
  doNumber    : String(20) @mandatory;
  bl          : Association to BillsOfLading    @mandatory @assert.target;
  issuedBy    : Association to BusinessPartners @mandatory @assert.target;  // shipping line / agent
  issuedTo    : Association to BusinessPartners @mandatory @assert.target;  // consignee or its CHA
  validUntil  : Date       @mandatory;
  freightPaid : Boolean default false;
  document    : Association to Documents;
  remarks     : String(250);
}
annotate DeliveryOrders with @assert.unique: { number: [doNumber] };

/** Permission for one truck to move one container in or out of the terminal */
entity GatePasses : cuid, managed {
  passNumber    : String(20)   @mandatory;
  movement      : GateMovement @mandatory @assert.range;   // only IN or OUT allowed
  container     : Association to Containers       @mandatory @assert.target;
  deliveryOrder : Association to DeliveryOrders   @assert.target;   // needed for import OUT (rule in Phase 2)
  transporter   : Association to BusinessPartners @assert.target;
  truckNumber   : String(15)   @mandatory @assert.format: '^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$';
  driverName    : String(80);
  validFrom     : Timestamp    @mandatory;
  validTo       : Timestamp    @mandatory;
  gateInAt      : Timestamp;
  gateOutAt     : Timestamp;
  document      : Association to Documents;
}
annotate GatePasses with @assert.unique: { number: [passNumber] };

/** Navigation backlinks added to existing entities */
extend BillsOfLading with {
  deliveryOrders : Association to many DeliveryOrders on deliveryOrders.bl = $self;
}
extend Containers with {
  gatePasses : Association to many GatePasses on gatePasses.container = $self;
}