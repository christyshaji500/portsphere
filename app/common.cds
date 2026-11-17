using { portsphere as ps } from '../db/billing';     // ← CHANGED in 3.3c

// ── Value helps ─────────────────────────────────────────────
annotate ps.Vessels          with @cds.odata.valuelist @UI.Identification: [{ Value: name }];
annotate ps.BusinessPartners with @cds.odata.valuelist @UI.Identification: [{ Value: name }];
annotate ps.Berths           with @cds.odata.valuelist @UI.Identification: [{ Value: code }];
annotate ps.VesselCalls      with @cds.odata.valuelist @UI.Identification: [{ Value: callNumber }];   // ← NEW in 3.3a

// ── Master data labels (3.1) ───────────────────────────────
annotate ps.Vessels with {
  name          @title: 'Vessel';
  imoNumber     @title: 'IMO Number';
  lengthOverall @title: 'LOA (m)';
  maxDraft      @title: 'Draft (m)';
  grossTonnage  @title: 'Gross Tonnage';
}
annotate ps.BusinessPartners with {
  name     @title: 'Partner';
  bpNumber @title: 'BP Number';
}
annotate ps.Berths with {
  code           @title: 'Berth';
  name           @title: 'Berth Name';
  lengthMeters   @title: 'Length (m)';
  maxDraftMeters @title: 'Depth (m)';
}

// ── Vessel calls (3.1) ─────────────────────────────────────
annotate ps.VesselCalls with {
  callNumber   @title: 'Call No.';
  vessel       @title: 'Vessel'        @Common.Text: vessel.name       @Common.TextArrangement: #TextOnly;
  voyageNumber @title: 'Voyage';
  shippingLine @title: 'Shipping Line' @Common.Text: shippingLine.name @Common.TextArrangement: #TextOnly;
  agent        @title: 'Ship Agent'    @Common.Text: agent.name        @Common.TextArrangement: #TextOnly;
  eta          @title: 'ETA';
  etd          @title: 'ETD';
  ata          @title: 'ATA';
  atd          @title: 'ATD';
  status       @title: 'Status'        @Common.Text: status.name       @Common.TextArrangement: #TextOnly
               @Common.ValueListWithFixedValues;
  remarks      @title: 'Remarks'       @UI.MultiLineText;
}

annotate ps.BerthAllocations with {
  berth       @title: 'Berth' @Common.Text: berth.name @Common.TextArrangement: #TextFirst;
  fromTime    @title: 'From';
  toTime      @title: 'To';
  isConfirmed @title: 'Confirmed';
  remarks     @title: 'Remarks';
}

// ── Cargo (NEW in 3.3a) ────────────────────────────────────
annotate ps.Manifests with {
  manifestNumber @title: 'Manifest No.';
  call           @title: 'Vessel Call' @Common.Text: call.callNumber @Common.TextArrangement: #TextOnly;
  direction      @title: 'Direction'   @Common.Text: direction.name  @Common.TextArrangement: #TextOnly
                 @Common.ValueListWithFixedValues;
  filedBy        @title: 'Filed By'    @Common.Text: filedBy.name    @Common.TextArrangement: #TextOnly;
  filedAt        @title: 'Filed At';
}

annotate ps.BillsOfLading with {
  blNumber        @title: 'B/L No.';
  shipper         @title: 'Shipper'    @Common.Text: shipper.name      @Common.TextArrangement: #TextOnly;
  consignee       @title: 'Consignee'  @Common.Text: consignee.name    @Common.TextArrangement: #TextOnly;
  portOfLoading   @title: 'Port of Loading';
  portOfDischarge @title: 'Port of Discharge';
  cargoType       @title: 'Cargo Type' @Common.Text: cargoType.name    @Common.TextArrangement: #TextOnly
                  @Common.ValueListWithFixedValues;
  description     @title: 'Goods';
  grossWeightKg   @title: 'Gross Weight (kg)';
  hazardClass     @title: 'IMDG Class' @Common.Text: hazardClass.descr @Common.TextArrangement: #TextFirst
                  @Common.ValueListWithFixedValues;
  isHazardous     @title: 'Dangerous Goods';
}

annotate ps.Containers with {
  containerNumber @title: 'Container No.';
  type            @title: 'Type'   @Common.Text: type.name   @Common.TextArrangement: #TextFirst
                  @Common.ValueListWithFixedValues;
  sealNumber      @title: 'Seal No.';
  grossWeightKg   @title: 'Gross Weight (kg)';
  status          @title: 'Status' @Common.Text: status.name @Common.TextArrangement: #TextOnly
                  @Common.ValueListWithFixedValues;
  yardLocation    @title: 'Yard Position';
  holdReason      @title: 'Hold Reason';
  dischargedAt    @title: 'Discharged At';
  gatedOutAt      @title: 'Gated Out At';
  teu             @title: 'TEU';
}

annotate ps.CustomsDeclarations with {
  declarationNumber @title: 'Declaration No.';
  type              @title: 'Type'   @Common.Text: type.name   @Common.TextArrangement: #TextOnly
                    @Common.ValueListWithFixedValues;
  broker            @title: 'Customs Broker' @Common.Text: broker.name @Common.TextArrangement: #TextOnly;
  status            @title: 'Status' @Common.Text: status.name @Common.TextArrangement: #TextOnly
                    @Common.ValueListWithFixedValues;
  assessableValue   @title: 'Assessable Value';
  dutyAmount        @title: 'Duty';
  filedAt           @title: 'Filed At';
  clearedAt         @title: 'Cleared At';
  officerRemarks    @title: 'Officer Remarks' @UI.MultiLineText;
}

// ── Customs (3.3b) ─────────────────────────────────────────
annotate ps.BillsOfLading with @cds.odata.valuelist @UI.Identification: [{ Value: blNumber }];

annotate ps.CustomsDeclarations with {
  bl              @title: 'B/L' @Common.Text: bl.blNumber @Common.TextArrangement: #TextOnly;
  assessableValue @Measures.ISOCurrency: currency_code;
  dutyAmount      @Measures.ISOCurrency: currency_code;
}

// ── Release (3.3c) ─────────────────────────────────────────
annotate ps.Containers     with @cds.odata.valuelist @UI.Identification: [{ Value: containerNumber }];
annotate ps.DeliveryOrders with @cds.odata.valuelist @UI.Identification: [{ Value: doNumber }];

annotate ps.DeliveryOrders with {
  doNumber    @title: 'DO No.';
  bl          @title: 'B/L'        @Common.Text: bl.blNumber    @Common.TextArrangement: #TextOnly;
  issuedBy    @title: 'Issued By'  @Common.Text: issuedBy.name  @Common.TextArrangement: #TextOnly;
  issuedTo    @title: 'Issued To'  @Common.Text: issuedTo.name  @Common.TextArrangement: #TextOnly;
  validUntil  @title: 'Valid Until';
  freightPaid @title: 'Freight Paid';
  remarks     @title: 'Remarks';
}

annotate ps.GatePasses with {
  passNumber    @title: 'Pass No.';
  movement      @title: 'Movement (IN / OUT)';
  container     @title: 'Container'      @Common.Text: container.containerNumber @Common.TextArrangement: #TextOnly;
  deliveryOrder @title: 'Delivery Order' @Common.Text: deliveryOrder.doNumber    @Common.TextArrangement: #TextOnly;
  transporter   @title: 'Transporter'    @Common.Text: transporter.name          @Common.TextArrangement: #TextOnly;
  truckNumber   @title: 'Truck No.';
  driverName    @title: 'Driver';
  validFrom     @title: 'Valid From';
  validTo       @title: 'Valid To';
  gateInAt      @title: 'Gate In';
  gateOutAt     @title: 'Gate Out';
}