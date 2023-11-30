import amqp from 'amqplib';
import axios from 'axios';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { constValues } from './const';
import preconfiguredRoles from './roles.json';
import { stopItemsCreateHandler, stopItemsUpdateHandler, stopItemsDeleteHandler } from './stopsEventHandler';
import { busItemsUpdateHandler, busItemsDeleteHandler } from './busEventHandler';
import { orderItemsCreateHandler, orderItemsDeleteHandler } from './orderEventHandler';
import moment from 'moment-timezone';
import { useApi, useStores } from '@directus/extensions-sdk';


export default async ({ action, filter, init }, { env, services, getSchema, exceptions, logger }) => {

	// setup
	const { InvalidPayloadException, ServiceUnavailableException } = exceptions;
	const { ItemsService } = services;
	var schema = await getSchema();

	const customAccountability = {
		ip: '127.0.0.1',
		admin: true,
	};

	const tokenService = new ItemsService("token", {
		schema: schema,
		accountability: customAccountability
	});

	const userService = new ItemsService("user", {
		schema: schema,
		accountability: customAccountability
	});

	const ordersService = new ItemsService("order", {
		schema: schema,
		accountability: customAccountability
	});

	interface FcmTokenDto {
		user_created: string,
		start: string,
		stop: string,
		date: string,
		tokens: string[]
	};


	console.log('init amqp-extension');

	const fcmApp_user_file = env.FCM_FILE_USER ? env.FCM_FILE_USER : "user_erzmobil.json"
	const fcmApp_driver_file = env.FCM_FILE_DRIVER ? env.FCM_FILE_DRIVER : "driver_erzmobil.json"
	const fcmApp_user_projectid = env.FCM_USER_PROJECTID ? env.FCM_USER_PROJECTID : "erzmobil-user"
	const fcmApp_driver_projectid = env.FCM_DRIVER_PROJECTID ? env.FCM_DRIVER_PROJECTID : "erzmobil-driver"

	logger.debug('env.FCM_FILE_USER: ' + env.FCM_FILE_USER)
	logger.debug('env.FCM_FILE_DRIVER: ' + env.FCM_FILE_DRIVER)
	logger.debug('env.FCM_USER_PROJECTID: ' + env.FCM_USER_PROJECTID)
	logger.debug('env.FCM_DRIVER_PROJECTID: ' + env.FCM_DRIVER_PROJECTID)

	logger.debug('const fcmApp_user_file: ' + fcmApp_user_file)
	logger.debug('const fcmApp_driver_file: ' + fcmApp_driver_file)
	logger.debug('const fcmApp_user_projectid: ' + fcmApp_user_projectid)
	logger.debug('const fcmApp_driver_projectid: ' + fcmApp_driver_projectid)

	var fcmApp_user = initializeApp({
		credential: cert(path.join(__dirname, fcmApp_user_file)),
		projectId: fcmApp_user_projectid
	}, 'user');

	var fcmApp_driver = initializeApp({
		credential: cert(path.join(__dirname, fcmApp_driver_file)),
		projectId: fcmApp_driver_projectid
	}, 'driver')

	logger.info(env.CUSTOM_AUTH_DRIVER_CLIENT_ID);
	logger.info(env.CUSTOM_AUTH_USER_CLIENT_ID);
	logger.info(env.CUSTOM_AUTH_POOL_ID);

	init('app.after', async ({ app }) => {
		await setApiKeyFromEnv(env, logger);
		await setupRoles(env, logger);
	});

	let amqpChannel: amqp.Channel = await amqpInit();

	/* -----------------------------------Stops ---------------------------------*/

	filter('stop.items.create', async (input, { collection }, { database, schema }) => {
		input.label = input.name;
	});

	action('stop.items.create', async (input, { collection, database, schema }) => {
		await stopItemsCreateHandler(input, amqpChannel, ServiceUnavailableException);
	});

	filter('stop.items.update', async (input, { collection }, { database, schema }) => {
		input.label = input.name;
	});

	action('stop.items.update', async (input, { collection, database, schema }) => {
		await stopItemsUpdateHandler(input, ItemsService, database, schema, amqpChannel, ServiceUnavailableException);
	});

	filter('stop.items.delete', async (input, { collection }, { database, schema }) => {
		await stopItemsDeleteHandler(input, ItemsService, collection, database, schema, amqpChannel, ServiceUnavailableException);
	});

	/* -----------------------------------Bus---------------------------------*/


	action('bus.items.update', async (input, { collection, database, schema }) => {
		await busItemsUpdateHandler(input, amqpChannel, ItemsService, database, schema);
	});

	filter('bus.items.delete', async (input, { collection }, { database, schema }) => {
		await busItemsDeleteHandler(input, ItemsService, collection, database, schema, amqpChannel, ServiceUnavailableException);
	});


	/* -----------------------------------Order ---------------------------------*/

	filter('order.items.create', async (input, { collection }, { database, schema }) => {
		input.customerStatus = true;
	})

	action('order.items.create', async (input, { collection, database, schema }) => {
		await orderItemsCreateHandler(ItemsService, database, schema, input, amqpChannel);
	});

	// filter('order.items.delete', async (input, { collection }, { database, schema }) => {
	// 	await orderItemsDeleteHandler(ItemsService, collection, database, schema, input, amqpChannel, env, fcmApp_driver, ServiceUnavailableException, axios);
	// });
	filter('order.items.update', async (input, { collection }, { database, schema }) => {
		input.departure_time = input.start_time_minimum;
		input.arrival_time = input.destination_time_maximum;
	})

	action('order.items.update', async (input, { collection, database, schema }) => {
		// await orderItemsDeleteHandler(ItemsService, collection, database, schema, input, amqpChannel, env, fcmApp_driver, ServiceUnavailableException, axios);
		logger.debug('order.items.update fired.')
		logger.debug('input: ' + JSON.stringify(input));
		//logger.debug('collection: ' + collection);
		//logger.debug('database: ' + database);
		//logger.debug('schema: ' + schema);
		if (input["payload"]["status"] !== undefined) {
			if (input["payload"]["status"] == "Cancelled") {
				logger.debug('order ' + input["keys"][0] + ' was cancelled by the user.');
				logger.debug('starting order cancel routine');
				await orderItemsDeleteHandler(ItemsService, input["collection"], database, schema, input, input["keys"][0], amqpChannel, env, fcmApp_driver, ServiceUnavailableException, axios);
			}
		} else {
		}
	});

	/********************************** AMQP RECEIVE ******************************** */

	async function onMessageReceived(msg: amqp.ConsumeMessage | null) {
		if (msg != null) {
			let parsedContent;
			try {
				parsedContent = JSON.parse(msg.content.toString());
			} catch (err) {
				console.error(err);
			}
			if (parsedContent != null) {
				if (msg.fields.routingKey == constValues.rabbitmq_routing_routingkey_routeconfirmed) {


					logger.info('RouteConfirmedIntegrationEvent');
					logger.info('msg.fields.routingkey: ' + msg.fields.routingKey);

					// set order to Reserved! 

					const options = {
						headers: {
							'Content-Type': 'application/json'
						}
					};

					//try {

					var orderDetails = {};
					var order = await axios.patch(env.PUBLIC_URL + '/items/order' + '/' + parsedContent.orderId + '?fields=*.*&access_token=' + env.API_ACCESS_TOKEN, {
						route_id: parsedContent.newRouteId == undefined ? parsedContent.routeId : parsedContent.newRouteId,
						status: "Reserved",
						start_time_minimum: parsedContent.startTimeMinimum,
						start_time_maximum: parsedContent.startTimeMaximum,
						destination_time_minimum: parsedContent.destinationTimeMinimum,
						destination_time_maximum: parsedContent.destinationTimeMaximum
					}, options).then((order) => {
						// console.log(order);
						return order;
					});


					// send E-Mail

					const startTimeMinimumLocalDateTime = moment(parsedContent.startTimeMinimum).tz("Europe/Berlin");

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
						subject: "[Erzmobil] Eine neue Fahrt wurde erfolgreich gebucht - "
							+ dateTimeString + " Uhr"
							+ " von " + order.data.data.start_address_id.name
							+ " nach " + order.data.data.destination_address_id.name,
						message: "Hallo, \n\n"
							+ "eine Buchung mit der Buchungsnummer " + order.data.data.id
							+ " wurde soeben erfolgreich bestätigt. \n"
							+ "Startzeit: " + dateTimeString + " Uhr\n"
							+ "Start: " + order.data.data.start_address_id.name + "\n"
							+ "Ziel: " + order.data.data.destination_address_id.name + "\n"
							+ "Rollstuhlplätze: " + order.data.data.seats_wheelchair + "\n"
							+ "Sitzplätze: " + order.data.data.seats + "\n"
							+ "Rufnummer Kunde: " + order.data.data.user_created?.phoneNumber
					}


					logger.debug(JSON.stringify(mnr.toEmails));
					logger.debug(JSON.stringify(mailRecipents));
					logger.debug(JSON.stringify(mnr));

					if (env.SEND_MAIL !== undefined && env.SEND_MAIL == true) {
						if (env.MAIL_API_URL !== undefined && env.MAIL_API_URL.startsWith('http')) {
							try {
								console.log('env.MAIL_API_URL is set. Sending mail...');
								axios.post(env.MAIL_API_URL, mnr, {
									headers: {
										'Content-Type': 'application/json'
									}
								});
							} catch (error) {
								logger.error(error);
							}
						}
					}

					if (env.SEND_FCM !== undefined && env.SEND_FCM == true) {
						console.log('send fcm to drivers');

						const driverTokens = await getDriverTokens(tokenService);
						logger.debug('getDriverTokens returned:' + JSON.stringify(driverTokens));

						if (driverTokens !== undefined && driverTokens.length > 0) {

							getMessaging(fcmApp_driver).sendMulticast({
								tokens: driverTokens,
								data: {
									id: "1",
									date: startTimeMinimumLocalDateTime.toISOString(),
									start: order.data.data.start_address_id.name,
									stop: order.data.data.destination_address_id.name
								},
								android: {
									notification: {
										bodyLocKey: "notification_message_new_tour",
										titleLocKey: "notification_title_new_tour",
										bodyLocArgs: [startTimeMinimumLocalDateTime.format("DD.MM.YY HH:mm")]
									}
								},
								apns: {
									payload: {
										aps: {
											alert: {
												locKey: "notificationMessageNewTour",
												titleLocKey: "notificationTitleNewTour",
												locArgs: [startTimeMinimumLocalDateTime.format("DD.MM.YY HH:mm")]
											}
										}
									}
								}
							}).then((respo) => {
								logger.debug('response from fcm driver transmit: ' + JSON.stringify(respo));
							}).catch((error) => {
								logger.error('Error during fcm transmission!');
							})
						}
					}

					if (env.SEND_FCM !== undefined && env.SEND_FCM == true) {
						console.log('send fcm to user');

						const userToken = await getUserToken(tokenService, order.data.data.user_created.id);

						logger.debug('getUserToken returned:' + JSON.stringify(userToken));

						if (userToken !== undefined && userToken.length > 0) {
							getMessaging(fcmApp_user).sendMulticast({
								tokens: userToken,
								data: {
									id: "2",
									date: startTimeMinimumLocalDateTime.toISOString(),
									start: order.data.data.start_address_id.name,
									stop: order.data.data.destination_address_id.name
								},
								android: {
									notification: {
										bodyLocKey: "notification_message_journey_update",
										titleLocKey: "notification_title_journey_update",
										bodyLocArgs: [startTimeMinimumLocalDateTime.format("DD.MM.YY HH:mm")]
									}
								},
								apns: {
									payload: {
										aps: {
											alert: {
												locKey: "notificationMessageJourneyUpdate",
												titleLocKey: "notificationTitleJourneyUpdate",
												locArgs: [startTimeMinimumLocalDateTime.format("DD.MM.YY HH:mm")]
											}
										}
									}
								}
							}).then((respo) => {
								logger.debug('response fcm user transmit: ' + JSON.stringify(respo));
							}).catch((error) => {
								logger.error('Error during fcm transmission!');
							})
						}
					}

				} else if (msg.fields.routingKey == constValues.rabbitmq_routing_routingkey_routechanged) {
					logger.info('RouteChangedIntegrationEvent');
					logger.info('msg.fields.routingkey: ' + msg.fields.routingKey);
					// set order to Reserved! 

					const options = {
						headers: {
							'Content-Type': 'application/json'
						}
					};

					try {
						var orderDetails = {};
						var order = await axios.patch(env.PUBLIC_URL + '/items/order' + '/' + parsedContent.orderId + '?fields=*.*&access_token=' + env.API_ACCESS_TOKEN, {
							route_id: parsedContent.newRouteId == undefined ? parsedContent.routeId : parsedContent.newRouteId,
							status: "Reserved",
							start_time_minimum: parsedContent.startTimeMinimum,
							start_time_maximum: parsedContent.startTimeMaximum,
							destination_time_minimum: parsedContent.destinationTimeMinimum,
							destination_time_maximum: parsedContent.destinationTimeMaximum
						}, options).then((order) => {
							return order;
						});
					} catch (error) {
						logger.error(error);
					}

				} else if (msg.fields.routingKey == constValues.rabbitmq_routing_routingkey_routerejected) {
					logger.info('RouteRejectedIntegrationEvent');
					logger.info('orderId: ' + parsedContent.orderId);
					logger.info('cancellationReason: ' + parsedContent.cancellationReason);
					const options = {
						headers: {
							'Content-Type': 'application/json'
						}
					};

					try {
						await axios.patch(env.PUBLIC_URL + '/items/order' + '/' + parsedContent.orderId + '?access_token=' + env.API_ACCESS_TOKEN, {
							status: "Cancelled",
							cancellation_reason: "cancelled by RouteRejected Event"
						}, options);
					} catch (err) {
						logger.error(err);
					}

					try {
						await axios.post(env.PUBLIC_URL + '/items/rejected?access_token=' + env.API_ACCESS_TOKEN, {
							orderId: parsedContent.orderId,
							reason: parsedContent.cancellationReason
						}, options);
					} catch (err) {
						logger.error(err);
					}

				} else if (msg.fields.routingKey == constValues.rabbitmq_routing_routingkey_routefrozen) {
					logger.info('routeFrozenIntegrationEvent');
					logger.info('routeFrozen: ' + parsedContent?.routeId);
					// logger.debug(JSON.stringify(parsedContent));
					if (env.SEND_FCM !== undefined && env.SEND_FCM == true) {
						const ordersByRouteId: FcmTokenDto[] = await getOrdersByRouteId(ordersService, parsedContent?.routeId);
						logger.debug('ordersByRouteId: ' + JSON.stringify(ordersByRouteId));
						const ordersWithUserTokenByRouteId: FcmTokenDto[] = await addUserTokensToOrders(tokenService, ordersByRouteId);
						logger.debug('ordersWithUserTokenByRouteId:' + JSON.stringify(ordersByRouteId));

						await sendUserReminderNotification(ordersWithUserTokenByRouteId);
						await sendDriverReminderNotification(tokenService, ordersWithUserTokenByRouteId);
					}

				} else if (msg.fields.routingKey == constValues.rabbitmq_routing_routingkey_routestarted) {
					console.log('routeStartedIntegrationEvent');
					console.log(parsedContent);
					try {
						axios.get(env.PUBLIC_URL + '/items/order?filter[route_id][_eq]=' + parsedContent.routeId + '&filter[status][_eq]=Reserved&access_token=' + env.API_ACCESS_TOKEN)
							.then((orders) => {
								var ids: any[] = [];
								orders.data.data.forEach((order: any) => {
									ids.push(order.id);
								});
								axios.patch(env.PUBLIC_URL + '/items/order?access_token=' + env.API_ACCESS_TOKEN, {
									keys: ids,
									data: {
										status: "RideStarted",
										ride_started_on: new Date().toISOString()
									}
								}).then((rideStartedResponse) => {
									// console.log(rideStartedResponse);
								}).catch((err) => {
									logger.error(err);
								});
							});
					} catch (err) {
						logger.error(err);
					}
				} else if (msg.fields.routingKey == constValues.rabbitmq_routing_routingkey_routefinished) {
					console.log('routeFinishedIntegrationEvent');
					console.log(parsedContent);
					try {
						axios.get(env.PUBLIC_URL + '/items/order?filter[route_id][_eq]=' + parsedContent.routeId + '&filter[status][_eq]=RideStarted&access_token=' + env.API_ACCESS_TOKEN)
							.then((orders) => {
								var ids: any[] = [];
								orders.data.data.forEach((order: any) => {
									ids.push(order.id);
								});
								axios.patch(env.PUBLIC_URL + '/items/order?access_token=' + env.API_ACCESS_TOKEN, {
									keys: ids,
									data: {
										status: "RideFinished",
										ride_finished_on: new Date().toISOString()
									}
								}).then((rideStartedResponse) => {
								}).catch((err) => {
									logger.log(err);
								});
								// return orders;
							});
					} catch (err) {
						logger.error(err);
					}
				}

			}
			amqpChannel.ack(msg);
		}

		async function getUserToken(tokenService: any, userId: any) {
			const userTokens = await tokenService.readByQuery({
				fields: ['fcmToken'],
				filter: {
					user_created: {
						_eq: userId
					}
				}
			});

			if (userTokens.length == 0) {
				return [];
			}
			return userTokens.map(res => res['fcmToken']);
		}

		async function getDriverTokens(tokenService: any) {
			const driverTokens = await tokenService.readByQuery({
				fields: ['fcmToken'],
				filter: {
					isDriver: {
						_eq: true
					}
				}, limit: -1,
			});
			if (driverTokens.length == 0) {
				return [];
			}
			return driverTokens.map(res => res['fcmToken']);
		}

		async function sendDriverReminderNotification(tokenService: any, ordersWithUserTokenByRouteId: FcmTokenDto[]) {
			try {
				if (ordersWithUserTokenByRouteId == undefined || ordersWithUserTokenByRouteId.length < 1) {
					return [];
				}
				// first, get relevant driver tokens
				const driverTokens = await getDriverTokens(tokenService);
				// now choose the first stop in the route
				ordersWithUserTokenByRouteId.sort((orderA, orderB) => moment(orderA.date).unix() - moment(orderB.date).unix());

				var timeZonedDate = moment(ordersWithUserTokenByRouteId[0]!.date).tz("Europe/Berlin");
				// then create the notification
				var multicastMessage: MulticastMessage = {
					tokens: driverTokens,
					data: {
						id: "5",
						date: ordersWithUserTokenByRouteId[0]!.date,
						start: ordersWithUserTokenByRouteId[0]!.start,
						stop: ordersWithUserTokenByRouteId[0]!.stop
					},
					android: {
						notification: {
							bodyLocKey: "notification_message_tour_reminder",
							titleLocKey: "notification_title_tour_reminder",
							bodyLocArgs: [ordersWithUserTokenByRouteId[0]!.start, timeZonedDate.format("HH:mm")]
						}
					},
					apns: {
						payload: {
							aps: {
								alert: {
									locKey: "notificationMessageTourReminder",
									titleLocKey: "notificationTitleTourReminder",
									locArgs: [ordersWithUserTokenByRouteId[0]!.start, timeZonedDate.format("HH:mm")]
								}
							}
						}
					}
				}
				logger.debug('fcm driver: ' + JSON.stringify(multicastMessage));

				// send.
				getMessaging(fcmApp_driver).sendMulticast(multicastMessage)
					.then((response) => {
						logger.debug('response fcm driver send: ' + JSON.stringify(response));
					}).catch((error) => {
						logger.error(error);

					});
			} catch (error) {
				logger.error(error);
			}
			return [];
		}

		async function sendUserReminderNotification(ordersOnRoute: FcmTokenDto[]) {
			try {
				logger.info(JSON.stringify(ordersOnRoute));

				ordersOnRoute.forEach((order: FcmTokenDto) => {
					if (order.tokens !== undefined && order.tokens.length > 0) {
						// order.tokens.forEach((token : string))
						var timeZonedDate = moment(order.date).tz("Europe/Berlin");
						getMessaging(fcmApp_user).sendMulticast({
							tokens: order.tokens,
							data: {
								id: "8",
								date: order.date,
								start: order.start,
								stop: order.stop
							},
							android: {
								notification: {
									bodyLocKey: "notification_message_journey_reminder",
									titleLocKey: "notification_title_journey_reminder",
									bodyLocArgs: [order.start, timeZonedDate.format("HH:mm")]
								}
							},
							apns: {
								payload: {
									aps: {
										alert: {
											locKey: "notificationMessageJourneyReminder",
											titleLocKey: "notificationTitleJourneyReminder",
											locArgs: [order.start, timeZonedDate.format("HH:mm")]
										}
									}
								}
							}
						})
							.then((resp) => {
								logger.debug('result fcm user send: ' + JSON.stringify(resp));

							}).catch((error) => {
								logger.error(error);
							});
					}
				});
			} catch (error) {
				logger.error(error);
			}
		}
	}

	async function addUserTokensToOrders(tokenService: any, ordersByRouteId: FcmTokenDto[]) {
		for (let index = 0; index < ordersByRouteId.length; index++) {
			const tokens = await tokenService.readByQuery({
				fields: ['fcmToken'],
				filter: {
					user_created: {
						_eq: ordersByRouteId[index]!.user_created
					}
				}
			});

			tokens.forEach((token: any) => {
				ordersByRouteId[index]!.tokens.push(token['fcmToken']);
			});
		}
		return ordersByRouteId;
	}

	async function getOrdersByRouteId(ordersService: any, routeId: number) {
		var ordersOnRoute: FcmTokenDto[] = [];
		await ordersService.readByQuery({
			fields: ['*.*'],
			filter: { route_id: { _eq: routeId } }
		}).then((orders: any) => {
			orders.forEach((order: any) => {
				ordersOnRoute.push({
					user_created: order["user_created"]["id"],
					start: order["start_address_id"]["name"],
					stop: order["destination_address_id"]["name"],
					date: order["departure_time"],
					tokens: []
				});
			});
		});
		return ordersOnRoute;
	}

	async function amqpInit(): Promise<any> {

		console.log('amqp connection init');
		console.log('Using following rabbit mq settings ' + env.RABBIT_IP + ' ' + env.RABBITMQ_DEFAULT_USER + ' ' + env.RABBITMQ_DEFAULT_PASS);
		try {
			const conn = await amqp.connect({
				hostname: env.RABBIT_IP,
				username: env.RABBITMQ_DEFAULT_USER,
				password: env.RABBITMQ_DEFAULT_PASS,
				vhost: env.RABBITMQ_DEFAULT_VHOST
			});

			// if error, retry
			conn.on('error', (err) => {
				console.error(err);
				console.error('AMQP Error. Reconnecting');
				return setTimeout(amqpInit, 1000);
			});

			// if error, retry
			conn.on('close', (err) => {
				console.error(err);
				console.error('AMQP reconnecting');
				return setTimeout(amqpInit, 1000);
			});

			// if connection established, create both queues and consume the receiving-queue
			amqpChannel = await conn.createChannel();

			await amqpChannel.assertExchange("busnow_event_bus", "direct",
				{ durable: false });

			await amqpChannel.assertQueue(constValues.rabbitmq_directus_receiving_queue,
				{ durable: false }
			);

			await amqpChannel.bindQueue(constValues.rabbitmq_directus_receiving_queue, constValues.rabbitmq_routing_exchange,
				constValues.rabbitmq_routing_routingkey_routechanged);

			await amqpChannel.bindQueue(constValues.rabbitmq_directus_receiving_queue, constValues.rabbitmq_routing_exchange,
				constValues.rabbitmq_routing_routingkey_routeconfirmed);
			await amqpChannel.bindQueue(constValues.rabbitmq_directus_receiving_queue, constValues.rabbitmq_routing_exchange,
				constValues.rabbitmq_routing_routingkey_routefrozen);
			await amqpChannel.bindQueue(constValues.rabbitmq_directus_receiving_queue, constValues.rabbitmq_routing_exchange,
				constValues.rabbitmq_routing_routingkey_routestarted);
			await amqpChannel.bindQueue(constValues.rabbitmq_directus_receiving_queue, constValues.rabbitmq_routing_exchange,
				constValues.rabbitmq_routing_routingkey_routefinished);
			await amqpChannel.bindQueue(constValues.rabbitmq_directus_receiving_queue, constValues.rabbitmq_routing_exchange,
				constValues.rabbitmq_routing_routingkey_routerejected);

			await amqpChannel.consume(constValues.rabbitmq_directus_receiving_queue, onMessageReceived);

			console.log('amqp connection established');
		} catch (err) {
			console.error('Error during amqp.connect(), retry...');
			console.error(err);
			return setTimeout(amqpInit, 1000);
		}
	}

	//#endregion
};

async function setApiKeyFromEnv(env: any, logger: any) {

	logger.debug("setApiKeyFromEnv - login using admin credentials");
	var access_token = await adminLogin(env, logger);

	if (access_token == "" || access_token == undefined) {
		logger.debug('the access_token is empty or undefined! returning.');
		return;
	}

	var adminUserId = await getAdminUserId(env, access_token, logger);

	if (adminUserId == "" || adminUserId == undefined) {
		logger.debug('the adminUserId is empty or undefined! returning.');
	}

	await setEnvAccessTokenToUserId(env, adminUserId, access_token, logger);

	logger.debug('done setting new access_token to adminUser:' + adminUserId);
}



async function setEnvAccessTokenToUserId(env: any, adminUserId: any, access_token: any, logger: any) {
	await axios.patch(env.PUBLIC_URL + '/users/' + adminUserId, {
		token: env.API_ACCESS_TOKEN
	}, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + access_token
		}
	}).catch((error) => {
		logger.error('Error during override of access_token.\n' + error);
	});
}

async function getAdminUserId(env: any, access_token: any, logger: any) {
	return await axios.get(env.PUBLIC_URL + '/users?filter[email][_eq]=' + env.ADMIN_EMAIL + '&fields[id]', {
		headers: {
			'Authorization': 'Bearer ' + access_token
		}
	}).then((rr) => {
		const id = rr?.data.data[0];
		return id;
	}).catch((error) => {
		logger.error('Error during search for admin user id.\n' + error);
	});
}

async function adminLogin(env: any, logger: any) {
	return await axios.post(env.PUBLIC_URL + '/auth/login', {
		email: env.ADMIN_EMAIL,
		password: env.ADMIN_PASSWORD
	}, {
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((resp) => {
		return resp.data.data.access_token;
	}).catch((error) => {
		logger.error('Error during /auth/login from directus extension.\n' + error);
	});
}


function checkForRolesAlreadyThere(rolesResultList: any[], preconfiguredRoles: any[]) {
	for (const role of rolesResultList) {
		for (const preconfiguredRole of preconfiguredRoles) {
			if (role.name == preconfiguredRole.name) {
				return true;
			}
		}
	}
	return false;
}

async function setupRoles(env: any, logger: any) {
	logger.info("setupRoles - using access_token");
	var rolesResultList = await axios.get(env.PUBLIC_URL + '/roles?access_token=' + env.API_ACCESS_TOKEN)
		.then((rolesResult) => {
			// logger.debug(rolesResult.data);
			// var rolesResultList = rolesResult.data.data;
			return rolesResult.data.data;
		}).catch((error) => {
			logger.error('Error during fetch of roles using access_token.\n' + error);
		});
	var rolesAlreadyThere = checkForRolesAlreadyThere(rolesResultList, preconfiguredRoles);
	logger.info('rolesAlreadyThere: ' + rolesAlreadyThere);
	if (rolesAlreadyThere) {
		logger.debug('setupRoles - done. already there');
		return;
	}
	// if not there, let's create them.
	await postRoles(env, logger);
	logger.info('setupRoles - done. posted');
}

async function postRoles(env: any, logger: any) {
	await axios.post(env.PUBLIC_URL + '/roles?access_token=' + env.API_ACCESS_TOKEN, preconfiguredRoles, {
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((resp) => {
		// logger.debug(resp);
	});
}
