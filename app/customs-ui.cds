using CargoService as srv from '../srv/cargo-service';

annotate srv.CustomsDeclarations with @(
  UI.HeaderInfo: {
    TypeName: 'Customs Declaration', TypeNamePlural: 'Customs Declarations',
    Title: { Value: declarationNumber }, Description: { Value: bl.blNumber }
  },
  UI.SelectionFields: [ status_code, type_code, broker_ID ],
  UI.LineItem: [
    { Value: declarationNumber }, { Value: type_code }, { Value: bl_ID }, { Value: broker_ID },
    { Value: status_code, Criticality: status.criticality },
    { Value: dutyAmount }, { Value: filedAt }, { Value: clearedAt }
  ],
  UI.HeaderFacets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Status' },
    { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#Duty' }
  ],
  UI.DataPoint #Status: { Value: status_code, Title: 'Status', Criticality: status.criticality },
  UI.DataPoint #Duty  : { Value: dutyAmount, Title: 'Duty' },
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.file',              Label: 'File' },
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.assess',            Label: 'Assess' },
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.payDuty',           Label: 'Pay Duty' },
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.clear',             Label: 'Clear' },
    { $Type: 'UI.DataFieldForAction', Action: 'CargoService.rejectDeclaration', Label: 'Reject' }
  ],
  UI.FieldGroup #Declaration: { Data: [ { Value: type_code }, { Value: bl_ID }, { Value: broker_ID }, { Value: filedAt } ] },
  UI.FieldGroup #Amounts    : { Data: [ { Value: assessableValue }, { Value: dutyAmount } ] },
  UI.FieldGroup #Decision   : { Data: [ { Value: clearedAt }, { Value: officerRemarks } ] },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', ID: 'Declaration', Label: 'Declaration',     Target: '@UI.FieldGroup#Declaration' },
    { $Type: 'UI.ReferenceFacet', ID: 'Amounts',     Label: 'Assessment',      Target: '@UI.FieldGroup#Amounts' },
    { $Type: 'UI.ReferenceFacet', ID: 'Decision',    Label: 'Customs Decision', Target: '@UI.FieldGroup#Decision' }
  ]
);

// set only by actions → read-only on screen and ignored by CAP on input
annotate srv.CustomsDeclarations with {
  status          @Common.FieldControl: #ReadOnly;
  filedAt         @Common.FieldControl: #ReadOnly;
  clearedAt       @Common.FieldControl: #ReadOnly;
  assessableValue @Common.FieldControl: #ReadOnly;
  dutyAmount      @Common.FieldControl: #ReadOnly;
  officerRemarks  @Common.FieldControl: #ReadOnly;
}

annotate srv.CustomsDeclarations with actions {
  file @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'DRAFT' ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/filedAt' ] }
  );
  assess @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'FILED' ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/assessableValue', 'in/dutyAmount' ] }
  ) (assessableValue @title: 'Assessable value (INR)', dutyAmount @title: 'Duty amount (INR)');
  payDuty @(
    Core.OperationAvailable: { $edmJson: { $Eq: [ { $Path: 'in/status_code' }, 'ASSESSED' ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code' ] }
  );
  clear @(
    Core.OperationAvailable: { $edmJson: { $Or: [
      { $Eq: [ { $Path: 'in/status_code' }, 'ASSESSED' ] },
      { $Eq: [ { $Path: 'in/status_code' }, 'DUTY_PAID' ] }
    ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/clearedAt', 'in/officerRemarks' ] }
  ) (remarks @title: 'Remarks (optional)');
  rejectDeclaration @(
    Core.OperationAvailable: { $edmJson: { $Or: [
      { $Eq: [ { $Path: 'in/status_code' }, 'FILED' ] },
      { $Eq: [ { $Path: 'in/status_code' }, 'ASSESSED' ] }
    ] } },
    Common.SideEffects: { TargetProperties: [ 'in/status_code', 'in/officerRemarks' ] }
  ) (reason @title: 'Reason for rejection');
}