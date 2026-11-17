using ReleaseService as srv from '../srv/release-service';

// ── Gate passes ────────────────────────────────────────────
annotate srv.GatePasses with @(
  UI.HeaderInfo: {
    TypeName: 'Gate Pass', TypeNamePlural: 'Gate Passes',
    Title: { Value: passNumber }, Description: { Value: container.containerNumber }
  },
  UI.SelectionFields: [ movement, container_ID, transporter_ID ],
  UI.LineItem: [
    { Value: passNumber }, { Value: movement }, { Value: container_ID }, { Value: truckNumber },
    { Value: transporter_ID }, { Value: validFrom }, { Value: validTo },
    { Value: gateInAt }, { Value: gateOutAt },
    { $Type: 'UI.DataFieldForAction', Action: 'ReleaseService.gateIn',  Label: 'Gate In' },
    { $Type: 'UI.DataFieldForAction', Action: 'ReleaseService.gateOut', Label: 'Gate Out' }
  ],
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'ReleaseService.gateIn',  Label: 'Gate In' },
    { $Type: 'UI.DataFieldForAction', Action: 'ReleaseService.gateOut', Label: 'Gate Out' }
  ],
  UI.FieldGroup #Movement: { Data: [ { Value: movement }, { Value: container_ID }, { Value: deliveryOrder_ID } ] },
  UI.FieldGroup #Truck   : { Data: [ { Value: transporter_ID }, { Value: truckNumber }, { Value: driverName } ] },
  UI.FieldGroup #Window  : { Data: [ { Value: validFrom }, { Value: validTo }, { Value: gateInAt }, { Value: gateOutAt } ] },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Movement', Label: 'Movement',          Target: '@UI.FieldGroup#Movement' },
    { $Type: 'UI.ReferenceFacet', ID: 'Truck',    Label: 'Truck',             Target: '@UI.FieldGroup#Truck' },
    { $Type: 'UI.ReferenceFacet', ID: 'Window',   Label: 'Validity & Gate',   Target: '@UI.FieldGroup#Window' }
  ]
);

annotate srv.GatePasses with {
  passNumber @Common.FieldControl: #ReadOnly;
  gateInAt   @Common.FieldControl: #ReadOnly;
  gateOutAt  @Common.FieldControl: #ReadOnly;
}

annotate srv.GatePasses with actions {
  gateIn  @(Common.SideEffects: { TargetProperties: [ 'in/gateInAt' ] });
  gateOut @(Common.SideEffects: { TargetProperties: [ 'in/gateOutAt' ] });
}

// ── Delivery orders ────────────────────────────────────────
annotate srv.DeliveryOrders with @(
  UI.HeaderInfo: {
    TypeName: 'Delivery Order', TypeNamePlural: 'Delivery Orders',
    Title: { Value: doNumber }, Description: { Value: bl.blNumber }
  },
  UI.SelectionFields: [ bl_ID, issuedTo_ID, freightPaid ],
  UI.LineItem: [
    { Value: doNumber }, { Value: bl_ID }, { Value: issuedBy_ID }, { Value: issuedTo_ID },
    { Value: validUntil }, { Value: freightPaid }
  ],
  UI.FieldGroup #General: { Data: [
    { Value: bl_ID }, { Value: issuedBy_ID }, { Value: issuedTo_ID },
    { Value: validUntil }, { Value: freightPaid }, { Value: remarks }
  ] },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'Delivery Order', Target: '@UI.FieldGroup#General' }
  ]
);

annotate srv.DeliveryOrders with { doNumber @Common.FieldControl: #ReadOnly; }