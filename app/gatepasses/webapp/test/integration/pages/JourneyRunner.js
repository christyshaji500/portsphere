sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"portsphere/gatepasses/test/integration/pages/GatePassesList.gen",
	"portsphere/gatepasses/test/integration/pages/GatePassesObjectPage.gen"
], function (JourneyRunner, GatePassesListGenerated, GatePassesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('portsphere/gatepasses') + '/test/flp.html#app-preview',
        pages: {
			onTheGatePassesListGenerated: GatePassesListGenerated,
			onTheGatePassesObjectPageGenerated: GatePassesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

