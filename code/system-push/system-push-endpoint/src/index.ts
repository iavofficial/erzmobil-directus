import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';

export default async function (router, { env, services, exceptions, getSchema, logger, database }) {

	const { ItemsService } = services;
	const { RolesService } = services;
	const { UsersService } = services;
	const { ActivityService } = services;
	const schema = await getSchema();
	const actionPush = 'pushnotification';
	const { ServiceUnavailableException, InvalidPayloadException } = exceptions;

	console.log('init amqp-extension');

	const fcmApp_user_file = env.FCM_FILE_USER ? env.FCM_FILE_USER : "user_erzmobil.json"
	const fcmApp_user_projectid = env.FCM_USER_PROJECTID ? env.FCM_USER_PROJECTID : "erzmobil-user"
	
	var fcmApp_user = initializeApp({
		credential: cert(path.join(__dirname, fcmApp_user_file)),
		projectId: fcmApp_user_projectid
	}, 'user');

	logger.debug('env.FCM_FILE_USER: ' + env.FCM_FILE_USER)
	logger.debug('env.FCM_USER_PROJECTID: ' + env.FCM_USER_PROJECTID)
	
	logger.debug('fcmApp_user_file: ' + fcmApp_user_file)
	logger.debug('fcmApp_user_projectid: ' + fcmApp_user_projectid)

	router.post('/send', async (req, res) => {
		try {
			if (req.body['role'] == undefined) {
				res.status(400).send({ error: 'Missing parameters' });
				return;
			}

			if (req.body['content'] == undefined) {
				res.status(400).send({ error: 'Missing content' });
				return;
			}

			const role = req.body['role'];
			const content = req.body['content'];

			logger.debug('/send::');
			const userId = req?.accountability["user"];
			const roleName = "Betrieb";
			if ((req?.accountability["admin"] == false && (await isUserInRoleByUserId(userId, req, roleName)) == false)) {
				res.status(401).send({ error: 'Access denied' });
				return;
			}
			logger.debug('/send:: allowed!');

			// first check for existing activities within 1 Minute from this request.
			// if not, allow the new notification transmission
			const activityService = new ActivityService({ knex: database, schema: schema });

			logger.debug('/send:: create activity service');
			logger.debug('is admin? : ' + req?.accountability.admin);

			var lastPushActivity = await activityService.readByQuery({
				fields: ['action', 'timestamp'],
				filter: {
					action: {
						_eq: actionPush,
					},
				},
				sort: ['-timestamp'],
				limit: 1
			});

			//-----------SPAM CHECK

			logger.debug(JSON.stringify(lastPushActivity));

			var canCreateNewPushNotification = false;

			if (lastPushActivity.length == 0) {
				canCreateNewPushNotification = true;
			} else if (lastPushActivity.length >= 1) {
				if ((new Date().getTime()) - new Date(lastPushActivity[0]['timestamp']).getTime() > 60000) {
					canCreateNewPushNotification = true;
				}
			}

			// GUARD
			if (!canCreateNewPushNotification) {
				res.status(401).send({ error: 'Please wait another minute before trying again!' });
				return;
			}

			//-----------SPAM CHECK

			const customAccountability = {
				ip: req.ip,
				admin: true,
			};

			const tokenService = new ItemsService("token", {
				schema: schema,
				accountability: customAccountability
			});

			var tokensByRoleId = await tokenService.readByQuery({
				// fields: ['fcmToken','user_created.role'],
				fields: ['fcmToken', 'user_created.role.name'],
				filter: {
					user_created: {
						role: {
							name: {
								_eq: role
							}
						}
					}
				},
				limit: -1,
			});

			logger.debug(JSON.stringify(tokensByRoleId));

			if (tokensByRoleId.length <= 0) {
				res.status(204).send({ error: 'Empty list' });
				return;
			}
			var tokenArray: string[] = [];
			tokensByRoleId.forEach((tkn) => {
				tokenArray.push(tkn['fcmToken']);
			})

			if (tokenArray.length <= 0) {
				res.status(204).send({ errror: 'Empty list' });
			}

			//we create another entry into activity service to prohibit spamming
			await activityService.createOne({
				action: actionPush,
				user: userId,
				ip: req.accountability.ip,
				user_agent: 'Extension-API',
				collection: 'directus_users',
				comment: 'Systemnachricht: ' + content,
				item: userId
			});

			var returnMessage;
			var errorThrown = false;
			getMessaging(fcmApp_user).sendMulticast({
				tokens: tokenArray,
				data: {
					id: "4",
					systemInformation_de: content,
					systemInformation_en: content
				},
				android: {
					notification: {
						bodyLocKey: "notification_message_system_information",
						titleLocKey: "notification_title_system_information",
						bodyLocArgs: [content]
					}
				},
				apns: {
					payload: {
						aps: {
							alert: {
								locKey: "notificationMessageSystemInformation",
								titleLocKey: "notificationTitleSystemInformation",
								locArgs: [content]
							}
						}
					}
				}
			}).then((resp) => {
				returnMessage = resp;
				logger.debug('/send:: FCM Response');
				logger.debug(JSON.stringify(resp));
			}).catch((error) => {
				errorThrown = true;
				returnMessage = error;
			});

			if (errorThrown) {
				res.status(500).send({ error: returnMessage });
				return;
			}

			res.send(returnMessage);
			return;
		} catch (err) {
			res.status(500).send({ error: JSON.stringify(err) });
		}
	});

	async function isUserInRoleByUserId(userId: string, req: any, roleName: string) {
		const customAccountability = {
			ip: req.ip,
			admin: true,
		};

		const usersService = new UsersService({
			schema: req.schema,
			accountability: customAccountability
		});

		const searchUserRole = {
			fields: ['role'],
			filter: {
				id: {
					_eq: userId
				}
			}
		}

		const userRoleId = await usersService.readByQuery(searchUserRole);

		const roleId = await getRoleIdByRoleName(req, customAccountability, roleName);

		logger.debug('isUserInRoleByUserAccountability::roleId: ' + JSON.stringify(roleId));
		logger.debug('isUserInRoleByUserAccountability::userRoleId: ' + JSON.stringify(userRoleId));

		return userRoleId[0]["role"] == roleId[0]["id"];
	}


	async function getRoleIdByRoleName(req: any, customAccountability: { ip: any; admin: boolean; }, roleName: string) {
		const rolesService = new RolesService({
			schema: req.schema,
			accountability: customAccountability,
		});

		const searchRoleId = {
			fields: ['id'],
			filter: {
				name: {
					_eq: roleName
				}
			}
		};

		const roleId = await rolesService.readByQuery(searchRoleId);
		return roleId;
	}

};