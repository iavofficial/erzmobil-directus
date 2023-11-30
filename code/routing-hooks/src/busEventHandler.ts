import { constValues } from "./const";

export async function busItemsUpdateHandler(input: any, amqpChannel: amqp.Channel, ItemsService: any, database: any, schema: any) {
	console.log('bus.items.update event fired and filtered by extension');
	console.log(input);
	if (amqpChannel !== undefined && amqpChannel !== null) {
		if (input.payload.last_position) {
			var obj = {
				BusId: input.keys[0],
				Latitude: input.payload.last_position?.coordinates[1],
				Longitude: input.payload.last_position?.coordinates[0]
			};
			var dto = JSON.stringify(obj);
			amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_updatebusposition, Buffer.from(dto));
			console.log('amqpChannel.publish updateBusPos busDto: ' + dto);
		}

		if (input.payload.communityId || input.payload.name) {
			const busService = new ItemsService('bus', { knex: database, schema });
			await busService.readByQuery({ filter: { id: { _eq: input.keys[0] } }, fields: ['*'] })
				.then((buses) => {
					if (buses) {
						const bus = buses[0];
						var obj = {
							BusId: bus.id,
							Name: bus.name,
							CommunityId: bus.community_id
						};
						var dto = JSON.stringify(obj);
						amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_busupdated, Buffer.from(dto));
						console.log('amqpChannel.publish updateBus busDto: ' + dto);
					}
				});
		}
	}
}

export async function busItemsDeleteHandler(input: any, ItemsService: any, collection: any, database: any, schema: any, amqpChannel: amqp.Channel, ServiceUnavailableException: any) {
	console.log('bus.items.delete event fired and filtered by extension');
	console.log(input);
	const stopService = new ItemsService(collection, { knex: database, schema });
	await stopService.readByQuery({ filter: { id: { _eq: input[0] } }, fields: ['*'] })
		.then((buses) => {
			if (buses) {
				const bus = buses[0];
				if (amqpChannel !== undefined && amqpChannel !== null) {
					var obj = {
						Id: bus.id,
						CommunityId: bus.community_id,
						Name: bus.name
					};
					var dto = JSON.stringify(obj);
					amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_busdeleted, Buffer.from(dto));
					console.log('amqpChannel.publish busDeleted stopDto: ' + dto);
				} else {
					throw new ServiceUnavailableException();
				}
			}
		});
}