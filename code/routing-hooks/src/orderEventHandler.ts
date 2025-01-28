import { AxiosStatic } from "axios";
import { constValues } from "./const";
import { getMessaging } from "firebase-admin/messaging";
import moment from 'moment-timezone';

export async function orderItemsDeleteHandler(ItemsService: any, collection: any, database: any, schema: any, input: any, orderId: number, amqpChannel: amqp.Channel, env: any, fcmApp_driver, ServiceUnavailableException: any, axios: AxiosStatic) {
    console.log('order.items.delete event fired and filtered by extension');
    const orderService = new ItemsService(collection, { knex: database, schema });
    await orderService.readByQuery({ filter: { id: { _eq: orderId } }, fields: ['*.*'] })
        .then(async (order) => {

            if (amqpChannel == undefined || amqpChannel == null) {
                throw new ServiceUnavailableException();
            }

            console.log(JSON.stringify(order));

            if (order[0].route_id == null || order[0].start_time_minimum == null || order[0].destination_time_minimum == null) {
                return [];
            }

            var dto = JSON.stringify({
                Id: order[0].id,
                StartLatitude: order[0].start_address_id.location.coordinates[1],
                StartLongitude: order[0].start_address_id.location.coordinates[0],
                EndLatitude: order[0].destination_address_id.location.coordinates[1],
                EndLongitude: order[0].destination_address_id.location.coordinates[0],
                IsDeparture: order[0].is_departure,
                Time: order[0].time,
                Seats: order[0].seats,
                SeatsWheelchair: order[0].seats_wheelchair
            });
            amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_ordercancelled, Buffer.from(dto));
            console.log('amqpChannel.publish cancelled orderDto:' + dto);


            // const startTimeMinimumLocalDateTime = moment(order[0].start_time_minimum);
            const startTimeMinimumLocalDateTime = moment(order[0].start_time_minimum).tz("Europe/Berlin");
            moment.locale('de');
            const dateTimeString = startTimeMinimumLocalDateTime.format("DD.MM.YY HH:mm");

            var mailRecipents = ['mobility.on.demand.dev@iav.de']
            if (env.MAIL_RECIPENTS != undefined) {

                var envMailRecipents = env.MAIL_RECIPENTS;
                if (envMailRecipents.length != undefined && envMailRecipents.length > 0) {
                    mailRecipents = envMailRecipents;
                }
            }

            var mnr = {
                toEmails: mailRecipents,
                subject: "[Erzmobil] Eine Fahrt wurde abgesagt - "
                    + dateTimeString + " Uhr"
                    + " von " + order[0].start_address_id.name
                    + " nach " + order[0].destination_address_id.name,
                message: "Hallo, \n\n"
                    + "eine Buchung mit der Buchungsnummer " + order[0].id
                    + " wurde soeben abgesagt. \n"
                    + "Startzeit: " + dateTimeString + " Uhr\n"
                    + "Start: " + order[0].start_address_id.name + "\n"
                    + "Ziel: " + order[0].destination_address_id.name + "\n"
                    + "Rollstuhlplätze: " + order[0].seats_wheelchair + "\n"
                    + "Sitzplätze: " + order[0].seats + "\n"
                    + "Rufnummer Kunde: " + order[0].user_created?.phoneNumber
            };

            console.log(mnr);

            if (env.SEND_MAIL !== undefined && env.SEND_MAIL == true) {
                if (env.MAIL_API_URL !== undefined && env.MAIL_API_URL.startsWith('http')) {
                    try {
                        await axios.post(env.MAIL_API_URL, mnr);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
            if (env.SEND_FCM !== undefined && env.SEND_FCM) {

                console.log('send fcm to driver');
                await axios.get(env.PUBLIC_URL + '/items/token?fields=*.*&filter[isDriver][_eq]=true&access_token=' + env.API_ACCESS_TOKEN)
                    .then((result) => {
                        var tokenResult = result.data.data;
                        console.log(tokenResult);
                        var tokens: any = [];
                        if (tokenResult == undefined) {
                            return;
                        }
                        if (tokenResult.length < 1) {
                            return;
                        }
                        tokenResult.forEach((token: any) => {
                            tokens.push(token.fcmToken);
                        });
                        console.log(tokens);
                        if (tokens !== undefined && tokens.length > 0) {

                            getMessaging(fcmApp_driver).sendEachForMulticast({
                                tokens: tokens,
                                data: {
                                    id: "9",
                                    date: startTimeMinimumLocalDateTime.toISOString(),
                                    start: order[0].start_address_id.name,
                                    stop: order[0].destination_address_id.name
                                },
                                android: {
                                    notification: {
                                        bodyLocKey: "notification_message_journey_cancelled",
                                        titleLocKey: "notification_title_journey_cancelled",
                                        // bodyLocArgs: [startTimeMinimumLocalDateTime.format("DD.MM.YY HH:mm")]
                                    }
                                },
                                apns: {
                                    payload: {
                                        aps: {
                                            alert: {
                                                locKey: "notificationMessageJourneyCancelled",
                                                titleLocKey: "notificationTitleJourneyCancelled",
                                                // locArgs: [startTimeMinimumLocalDateTime.format("DD.MM.YY HH:mm")]
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    });
            }

            return order;
        });
}

export async function orderItemsCreateHandler(ItemsService: any, database: any, schema: any, input: any, amqpChannel: amqp.Channel) {
    console.log('order.items.create event fired and filtered by extension');
    const orderService = new ItemsService('order', { knex: database, schema });
    await orderService.readByQuery({ filter: { id: { _eq: input.key } }, fields: ['id', 'start_address_id.*.*', 'destination_address_id.*.*', 'time', 'seats', 'seats_wheelchair', 'is_departure'] })
        .then((order) => {
            if (amqpChannel !== undefined && amqpChannel !== null) {
                var dto = JSON.stringify({
                    Id: order[0].id,
                    StartLatitude: order[0].start_address_id.location.coordinates[1],
                    StartLongitude: order[0].start_address_id.location.coordinates[0],
                    EndLatitude: order[0].destination_address_id.location.coordinates[1],
                    EndLongitude: order[0].destination_address_id.location.coordinates[0],
                    IsDeparture: order[0].is_departure,
                    Time: order[0].time + "+00:00",
                    Seats: order[0].seats,
                    SeatsWheelchair: order[0].seats_wheelchair
                });
                amqpChannel.publish(constValues.rabbitmq_routing_exchange, constValues.rabbitmq_routing_routingkey_orderstarted, Buffer.from(dto));
                console.log('amqpChannel.publish orderDto:' + dto);
            }
        });
}

