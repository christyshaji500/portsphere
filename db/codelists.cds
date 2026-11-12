namespace portsphere;

using { sap.common.CodeList } from '@sap/cds/common';

/** Type of ship – drives berth & equipment needs */
entity VesselTypes : CodeList {
  key code : String(10);
}

/** Roles a business partner plays at the port */
entity PartnerRoles : CodeList {
  key code : String(15);
}

/** Lifecycle of a vessel call (one port visit) */
entity CallStatuses : CodeList {
  key code        : String(15);
      criticality : Integer; // Fiori colours: 0 neutral, 1 red, 2 orange, 3 green
}

/** Import / Export / Transshipment */
entity TradeDirections : CodeList {
  key code : String(3);
}

/** Cargo categories */
entity CargoTypes : CodeList {
  key code : String(10);
}

/** ISO container size/type codes */
entity ContainerTypes : CodeList {
  key code   : String(4);
      teu    : Decimal(3, 1);          // 20ft = 1 TEU, 40ft = 2 TEU
      reefer : Boolean default false;  // refrigerated → needs power plug in yard
}

/** IMDG dangerous goods classes */
entity HazardClasses : CodeList {
  key code : String(3);
}