sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"portsphere/vesselcalls/test/integration/pages/VesselCallsList.gen",
	"portsphere/vesselcalls/test/integration/pages/VesselCallsObjectPage.gen"
], function (JourneyRunner, VesselCallsListGenerated, VesselCallsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('portsphere/vesselcalls') + '/test/flp.html#app-preview',
        pages: {
			onTheVesselCallsListGenerated: VesselCallsListGenerated,
			onTheVesselCallsObjectPageGenerated: VesselCallsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

