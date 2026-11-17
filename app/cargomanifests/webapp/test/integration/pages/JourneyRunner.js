sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"portsphere/cargomanifests/test/integration/pages/ManifestsList.gen",
	"portsphere/cargomanifests/test/integration/pages/ManifestsObjectPage.gen",
	"portsphere/cargomanifests/test/integration/pages/BillsOfLadingObjectPage.gen"
], function (JourneyRunner, ManifestsListGenerated, ManifestsObjectPageGenerated, BillsOfLadingObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('portsphere/cargomanifests') + '/test/flp.html#app-preview',
        pages: {
			onTheManifestsListGenerated: ManifestsListGenerated,
			onTheManifestsObjectPageGenerated: ManifestsObjectPageGenerated,
			onTheBillsOfLadingObjectPageGenerated: BillsOfLadingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

