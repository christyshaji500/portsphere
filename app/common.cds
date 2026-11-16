using { portsphere as ps } from '../db/vessel-operations';

// ── Value helps ─────────────────────────────────────────────
// @cds.odata.valuelist: CAP generates a value help for EVERY association
// pointing to these entities (no hand-written Common.ValueList needed).
annotate ps.Vessels          with @cds.odata.valuelist @UI.Identification: [{ Value: name }];
annotate ps.BusinessPartners with @cds.odata.valuelist @UI.Identification: [{ Value: name }];
annotate ps.Berths           with @cds.odata.valuelist @UI.Identification: [{ Value: code }];

// ── Master data labels ─────────────────────────────────────
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

// ── Vessel calls ───────────────────────────────────────────
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