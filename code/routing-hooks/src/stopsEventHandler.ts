import { constValues } from "./const";

export async function stopItemsCreateHandler(input: any, amqpChannel: amqp.Channel, ServiceUnavailableException: any) {
    console.log('bus.items.update event fired and filtered by extension');
    console.log(input);
    if (amqpChannel !== undefined && amqpChannel !== null) {
        var obj = {
            Id: input.key,
            CommunityId: input.payload.communityId,

            Name: input.payload.name,
            Latitude: input.payload.location?.coordinates[1],
            Longitude: input.payload.location?.coordinates[0]
        };
        var dto = JSON.stringify(obj);
        amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_stopadded, Buffer.from(dto));
        console.log('amqpChannel.publish stopAdded stopDto: ' + dto);
    } else {
        throw new ServiceUnavailableException();
    }
}

export async function stopItemsUpdateHandler(input: any, ItemsService: any, database: any, schema: any, amqpChannel: amqp.Channel, ServiceUnavailableException: any) {
    console.log('stop.items.update event fired and filtered by extension');
    console.log(input);
    const stopService = new ItemsService('stop', { knex: database, schema });
    await stopService.readByQuery({ filter: { id: { _eq: input.keys[0] } }, fields: ['*'] })
        .then((stops) => {
            const stop = stops[0];
            if (amqpChannel !== undefined && amqpChannel !== null) {
                var obj = {
                    Id: stop.id,
                    CommunityId: stop.communityId,
                    Name: stop.name,
                    Latitude: stop.location?.coordinates[1],
                    Longitude: stop.location?.coordinates[0]
                };
                var dto = JSON.stringify(obj);
                amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_stopupdated, Buffer.from(dto));
                console.log('amqpChannel.publish stopUpdated stopDto: ' + dto);
            } else {
                throw new ServiceUnavailableException();
            }
        });
}

export async function stopItemsDeleteHandler(input: any, ItemsService: any, collection: any, database: any, schema: any, amqpChannel: amqp.Channel, ServiceUnavailableException: any) {
    console.log('stop.items.delete event fired and filtered by extension');
    console.log(input);
    const stopService = new ItemsService(collection, { knex: database, schema });
    await stopService.readByQuery({ filter: { id: { _eq: input[0] } }, fields: ['*'] })
        .then((stops) => {
            if (stops) {
                const stop = stops[0];
                if (amqpChannel !== undefined && amqpChannel !== null) {
                    var obj = {
                        Id: stop.id,
                        CommunityId: stop.communityId,
                        Name: stop.name,
                        Latitude: stop.location?.coordinates[1],
                        Longitude: stop.location?.coordinates[0]
                    };
                    var dto = JSON.stringify(obj);
                    amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_stopdeleted, Buffer.from(dto));
                    console.log('amqpChannel.publish stopDeleted stopDto: ' + dto);
                } else {
                    throw new ServiceUnavailableException();
                }
            }
        });
}

