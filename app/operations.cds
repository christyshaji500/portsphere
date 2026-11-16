using OperationsService as srv from '../srv/operations-service';

// ── List Report + Object Page for vessel calls ─────────────
annotate srv.VesselCalls with @(
  UI.HeaderInfo: {
    TypeName      : 'Vessel Call',
    TypeNamePlural: 'Vessel Calls',
    Title         : { Value: callNumber },
    Description   : { Value: vessel.name }
  },

  // filter bar
  UI.SelectionFields: [ status_code, vessel_ID, agent_ID, eta ],

  // list columns
  UI.LineItem: [
    { Value: callNumber },
    { Value: vessel_ID },
    { Value: voyageNumber },
    { Value: agent_ID },
    { Value: eta },
    { Value: etd },
    { Value: status_code, Criticality: status.criticality }
  ],

  // object page header: coloured status
  UI.HeaderFacets: [ { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Status' } ],
  UI.DataPoint #Status: { Value: status_code, Title: 'Status', Criticality: status.criticality },

  // object page header buttons = the state machine actions
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'OperationsService.arrive',    Label: 'Arrive' },
    { $Type: 'UI.DataFieldForAction', Action: 'OperationsService.berth',     Label: 'Berth' },
    { $Type: 'UI.DataFieldForAction', Action: 'OperationsService.startWork', Label: 'Start Work' },
    { $Type: 'UI.DataFieldForAction', Action: 'OperationsService.complete',  Label: 'Complete' },
    { $Type: 'UI.DataFieldForAction', Action: 'OperationsService.depart',    Label: 'Depart' },
    { $Type: 'UI.DataFieldForAction', Action: 'OperationsService.cancel',    Label: 'Cancel Call' }
  ],

  // object page sections
  UI.FieldGroup #Parties : { Data: [ { Value: vessel_ID }, { Value: voyageNumber }, { Value: shippingLine_ID }, { Value: agent_ID } ] },
  UI.FieldGroup #Schedule: { Data: [ { Value: eta }, { Value: etd }, { Value: ata }, { Value: atd } ] },
  UI.FieldGroup #Notes   : { Data: [ { Value: remarks } ] },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Parties',  Label: 'Vessel & Parties',  Target: '@UI.FieldGroup#Parties' },
    { $Type: 'UI.ReferenceFacet', ID: 'Schedule', Label: 'Schedule',          Target: '@UI.FieldGroup#Schedule' },
    { $Type: 'UI.ReferenceFacet', ID: 'Berths',   Label: 'Berth Allocations', Target: 'berthAllocations/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', ID: 'Notes',    Label: 'Remarks',           Target: '@UI.FieldGroup#Notes' }
  ]
);

// fields the server fills – shown read-only on screen
annotate srv.VesselCalls with {
  callNumber @Common.FieldControl: #ReadOnly;
  status     @Common.FieldControl: #ReadOnly;
  ata        @Common.FieldControl: #ReadOnly;
  atd        @Common.FieldControl: #ReadOnly;
}

// ── Buttons: enabled only in the right status + refresh after the action ──
annotate srv.VesselCalls with actions {
  arrive @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'PLANNED' ] } },
    Common.SideEffects     : { TargetProperties: [ 'in/status_code', 'in/ata' ] }
  ) (ata @title: 'Actual arrival (leave empty for now)');

  berth @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'ARRIVED' ] } },
    Common.SideEffects     : { TargetProperties: [ 'in/status_code' ], TargetEntities: [ 'in/berthAllocations' ] }
  );

  startWork @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'BERTHED' ] } },
    Common.SideEffects     : { TargetProperties: [ 'in/status_code' ] }
  );

  complete @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'WORKING' ] } },
    Common.SideEffects     : { TargetProperties: [ 'in/status_code' ] }
  );

  depart @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'COMPLETED' ] } },
    Common.SideEffects     : { TargetProperties: [ 'in/status_code', 'in/atd' ] }
  ) (atd @title: 'Actual departure (leave empty for now)');

  cancel @(
    Core.OperationAvailable: { $edmJson: { $Or: [
      { $Eq: [ { $Path: 'in/status_code' }, 'PLANNED' ] },
      { $Eq: [ { $Path: 'in/status_code' }, 'ARRIVED' ] }
    ] } },
    Common.SideEffects     : { TargetProperties: [ 'in/status_code', 'in/remarks' ] }
  ) (reason @title: 'Reason for cancellation');
}

// ── Berth allocations table inside the object page ─────────
annotate srv.BerthAllocations with @(
  UI.LineItem: [
    { Value: berth_ID },
    { Value: fromTime },
    { Value: toTime },
    { Value: isConfirmed },
    { Value: remarks }
  ]
);