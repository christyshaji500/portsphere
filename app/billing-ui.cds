using BillingService as srv from '../srv/billing-service';

// ── Work list: vessel calls to bill ────────────────────────
annotate srv.VesselCalls with @(
  UI.HeaderInfo: {
    TypeName: 'Vessel Call', TypeNamePlural: 'Vessel Calls',
    Title: { Value: callNumber }, Description: { Value: vessel.name }
  },
  UI.SelectionFields: [ status_code, shippingLine_ID ],
  UI.LineItem: [
    { Value: callNumber }, { Value: vessel_ID }, { Value: shippingLine_ID },
    { Value: ata }, { Value: atd },
    { Value: status_code, Criticality: status.criticality }
  ],
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'BillingService.generateInvoice', Label: 'Generate Invoice' }
  ],
  UI.FieldGroup #Visit: { Data: [ { Value: vessel_ID }, { Value: shippingLine_ID }, { Value: ata }, { Value: atd } ] },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Visit',    Label: 'Visit',    Target: '@UI.FieldGroup#Visit' },
    { $Type: 'UI.ReferenceFacet', ID: 'Invoices', Label: 'Invoices', Target: 'invoices/@UI.LineItem' }
  ]
);

annotate srv.VesselCalls with actions {
  generateInvoice @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'DEPARTED' ] } },
    Common.SideEffects: { TargetEntities: [ 'in/invoices' ] }
  );
}

// ── Invoice: KPIs in the header, items, lifecycle buttons ──
annotate srv.Invoices with @(
  UI.HeaderInfo: {
    TypeName: 'Invoice', TypeNamePlural: 'Invoices',
    Title: { Value: invoiceNumber }, Description: { Value: billTo.name }
  },
  UI.LineItem: [
    { Value: invoiceNumber }, { Value: invoiceDate }, { Value: dueDate },
    { Value: status_code, Criticality: status.criticality },
    { Value: netAmount }, { Value: grossAmount }
  ],
  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Status' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Net' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Tax' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Gross' }
  ],
  UI.DataPoint #Status: { Value: status_code, Title: 'Status', Criticality: status.criticality },
  UI.DataPoint #Net   : { Value: netAmount,   Title: 'Net' },
  UI.DataPoint #Tax   : { Value: taxAmount,   Title: 'GST' },
  UI.DataPoint #Gross : { Value: grossAmount, Title: 'Total' },
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'BillingService.issue',         Label: 'Issue' },
    { $Type: 'UI.DataFieldForAction', Action: 'BillingService.markPaid',      Label: 'Mark as Paid' },
    { $Type: 'UI.DataFieldForAction', Action: 'BillingService.cancelInvoice', Label: 'Cancel Invoice' }
  ],
  UI.FieldGroup #General: { Data: [
    { Value: call_ID }, { Value: billTo_ID }, { Value: invoiceDate }, { Value: dueDate },
    { Value: taxRate }, { Value: cancelReason }
  ] },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'Invoice',      Target: '@UI.FieldGroup#General' },
    { $Type: 'UI.ReferenceFacet', ID: 'Items',   Label: 'Charge Lines', Target: 'items/@UI.LineItem' }
  ]
);

annotate srv.Invoices with {
  invoiceNumber @Common.FieldControl: #ReadOnly;
  status        @Common.FieldControl: #ReadOnly;
  netAmount     @Common.FieldControl: #ReadOnly;
  cancelReason  @Common.FieldControl: #ReadOnly;
}

annotate srv.Invoices with actions {
  issue @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'DRAFT' ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/dueDate' ] }
  );
  markPaid @(
    Core.OperationAvailable: { $edmJson: { $Or: [
      { $Eq: [ { $Path: 'in/status_code' }, 'ISSUED' ] },
      { $Eq: [ { $Path: 'in/status_code' }, 'OVERDUE' ] }
    ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code' ] }
  );
  cancelInvoice @(
    Core.OperationAvailable: { $edmJson: { $Or: [
      { $Eq: [ { $Path: 'in/status_code' }, 'DRAFT' ] },
      { $Eq: [ { $Path: 'in/status_code' }, 'ISSUED' ] }
    ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/cancelReason' ] }
  ) (reason @title: 'Reason for cancellation');
}

annotate srv.InvoiceItems with @(
  UI.LineItem: [
    { Value: lineNo }, { Value: chargeType_code }, { Value: description },
    { Value: quantity }, { Value: rate }, { Value: amount }
  ]
);