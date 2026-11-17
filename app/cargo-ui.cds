using CargoService as srv from '../srv/cargo-service';

// ── Manifests: list + object page ──────────────────────────
annotate srv.Manifests with @(
  UI.HeaderInfo: {
    TypeName: 'Manifest', TypeNamePlural: 'Manifests',
    Title: { Value: manifestNumber }, Description: { Value: call.callNumber }
  },
  UI.SelectionFields: [ direction_code, call_ID ],
  UI.LineItem: [
    { Value: manifestNumber }, { Value: call_ID }, { Value: direction_code },
    { Value: filedBy_ID }, { Value: filedAt }
  ],
  UI.FieldGroup #General: { Data: [
    { Value: call_ID }, { Value: direction_code }, { Value: filedBy_ID }, { Value: filedAt }
  ] },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'General',          Target: '@UI.FieldGroup#General' },
    { $Type: 'UI.ReferenceFacet', ID: 'BLs',     Label: 'Bills of Lading', Target: 'billsOfLading/@UI.LineItem' }
  ]
);

// ── Bills of Lading: table in the manifest + own object page ──
annotate srv.BillsOfLading with @(
  UI.HeaderInfo: {
    TypeName: 'Bill of Lading', TypeNamePlural: 'Bills of Lading',
    Title: { Value: blNumber }, Description: { Value: description }
  },
  UI.LineItem: [
    { Value: blNumber }, { Value: consignee_ID }, { Value: shipper_ID },
    { Value: cargoType_code }, { Value: grossWeightKg }, { Value: isHazardous }
  ],
  UI.FieldGroup #Shipment: { Data: [
    { Value: shipper_ID }, { Value: consignee_ID }, { Value: portOfLoading }, { Value: portOfDischarge }
  ] },
  UI.FieldGroup #Goods: { Data: [
    { Value: description }, { Value: cargoType_code }, { Value: grossWeightKg },
    { Value: hazardClass_code }, { Value: isHazardous }
  ] },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Shipment',   Label: 'Shipment',   Target: '@UI.FieldGroup#Shipment' },
    { $Type: 'UI.ReferenceFacet', ID: 'Goods',      Label: 'Goods',      Target: '@UI.FieldGroup#Goods' },
    { $Type: 'UI.ReferenceFacet', ID: 'Containers', Label: 'Containers', Target: 'containers/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', ID: 'Customs',    Label: 'Customs',    Target: 'customsDeclarations/@UI.LineItem' }
  ]
);

// ── Containers: table with actions on the selected row ─────
annotate srv.Containers with @(
  UI.LineItem: [
    { Value: containerNumber },
    { Value: type_code },
    { Value: teu },
    { Value: status_code, Criticality: status.criticality },
    { Value: yardLocation },
    { Value: holdReason },
    { Value: dischargedAt },
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.discharge', Label: 'Discharge' },
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.hold',      Label: 'Customs Hold' },
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.load',      Label: 'Load' }
  ]
);

// server-set fields: read-only on screen AND ignored by CAP on input (3.1 lesson)
annotate srv.Containers with {
  status       @Common.FieldControl: #ReadOnly;
  dischargedAt @Common.FieldControl: #ReadOnly;
  gatedOutAt   @Common.FieldControl: #ReadOnly;
  holdReason   @Common.FieldControl: #ReadOnly;
}

annotate srv.Containers with actions {
  discharge @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'ON_VESSEL' ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/yardLocation', 'in/dischargedAt' ] }
  ) (yardLocation @title: 'Yard position (e.g. A-03-02-1)');

  hold @(
    Core.OperationAvailable: { $edmJson: { $Or: [
      { $Eq: [ { $Path: 'in/status_code' }, 'DISCHARGED' ] },
      { $Eq: [ { $Path: 'in/status_code' }, 'GATED_IN' ] }
    ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/holdReason' ] }
  ) (reason @title: 'Reason for customs hold');

  load @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'GATED_IN' ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code' ] }
  );
}

// ── Customs declarations as a read-only overview on the B/L page ──
// annotate srv.CustomsDeclarations with @(
//   UI.LineItem: [
//     { Value: declarationNumber },
//     { Value: type_code },
//     { Value: status_code, Criticality: status.criticality },
//     { Value: dutyAmount },
//     { Value: clearedAt }
//   ]
// );