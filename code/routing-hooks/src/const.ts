export enum constValues {
    rabbitmq_directus_receiving_queue = 'Busnow.Directus.Messaging.Receive',
	rabbitmq_routing_exchange = 'busnow_event_bus',
	rabbitmq_routing_routingkey_orderstarted = 'OrderStartedIntegrationEvent',
	rabbitmq_routing_routingkey_routechanged = 'RouteChangedIntegrationEvent',
	rabbitmq_routing_routingkey_routeconfirmed = 'RouteConfirmedIntegrationEvent',
	rabbitmq_routing_routingkey_ordercancelled = 'OrderCancelledIntegrationEvent',
	rabbitmq_routing_routingkey_updatebusposition = 'UpdateBusPositionIntegrationEvent',
	rabbitmq_routing_routingkey_stopadded = 'StopAddedIntegrationEvent',
	rabbitmq_routing_routingkey_stopdeleted = 'StopDeletedIntegrationEvent',
	rabbitmq_routing_routingkey_stopupdated = 'StopUpdatedIntegrationEvent',
	rabbitmq_routing_routingkey_busdeleted = 'BusDeletedIntegrationEvent',
	rabbitmq_routing_routingkey_busupdated = 'BusUpdatedIntegrationEvent',

	/* receive from routing */
	rabbitmq_routing_routingkey_routerejected = 'RouteRejectedIntegrationEvent',
	rabbitmq_routing_routingkey_routestarted = 'RouteStartedIntegrationEvent',
	rabbitmq_routing_routingkey_routefinished = 'RouteFinishedIntegrationEvent',
	rabbitmq_routing_routingkey_routefrozen = 'RouteFrozenIntegrationEvent',
}