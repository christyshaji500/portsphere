sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"portsphere/portbilling/test/integration/pages/VesselCallsList.gen",
	"portsphere/portbilling/test/integration/pages/VesselCallsObjectPage.gen",
	"portsphere/portbilling/test/integration/pages/InvoicesObjectPage.gen"
], function (JourneyRunner, VesselCallsListGenerated, VesselCallsObjectPageGenerated, InvoicesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('portsphere/portbilling') + '/test/flp.html#app-preview',
        pages: {
			onTheVesselCallsListGenerated: VesselCallsListGenerated,
			onTheVesselCallsObjectPageGenerated: VesselCallsObjectPageGenerated,
			onTheInvoicesObjectPageGenerated: InvoicesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

