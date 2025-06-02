/*
Copyright © 2025 IAV GmbH Ingenieurgesellschaft Auto und Verkehr, All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
*/
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
	rabbitmq_routing_routingkey_currentroute_changed_driver_warning = 'CurrentRouteChangedDriverWarningIntegrationEvent',
	rabbitmq_routing_routingkey_routerejected = 'RouteRejectedIntegrationEvent',
	rabbitmq_routing_routingkey_routestarted = 'RouteStartedIntegrationEvent',
	rabbitmq_routing_routingkey_routefinished = 'RouteFinishedIntegrationEvent',
	rabbitmq_routing_routingkey_routefrozen = 'RouteFrozenIntegrationEvent',
}