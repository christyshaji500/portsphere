sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"portsphere/deliveryorders/test/integration/pages/DeliveryOrdersList.gen",
	"portsphere/deliveryorders/test/integration/pages/DeliveryOrdersObjectPage.gen"
], function (JourneyRunner, DeliveryOrdersListGenerated, DeliveryOrdersObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('portsphere/deliveryorders') + '/test/flp.html#app-preview',
        pages: {
			onTheDeliveryOrdersListGenerated: DeliveryOrdersListGenerated,
			onTheDeliveryOrdersObjectPageGenerated: DeliveryOrdersObjectPageGenerated
        },
        async: true
    });

    return runner;
});

