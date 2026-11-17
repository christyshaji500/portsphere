sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"portsphere/customsclearance/test/integration/pages/CustomsDeclarationsList.gen",
	"portsphere/customsclearance/test/integration/pages/CustomsDeclarationsObjectPage.gen"
], function (JourneyRunner, CustomsDeclarationsListGenerated, CustomsDeclarationsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('portsphere/customsclearance') + '/test/flp.html#app-preview',
        pages: {
			onTheCustomsDeclarationsListGenerated: CustomsDeclarationsListGenerated,
			onTheCustomsDeclarationsObjectPageGenerated: CustomsDeclarationsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

