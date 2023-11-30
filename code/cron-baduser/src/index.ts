import { defineHook } from '@directus/extensions-sdk';

export default defineHook(async ({ schedule }, { services, database, getSchema, logger }) => {
    const { ItemsService, UsersService } = services;

    const customAccountability = {
        id: '127.0.0.1',
        admin: true,
    }

    const schema = await getSchema();

    const users = new UsersService({
        database: database,
        schema: schema,
        accountability: customAccountability
    });

    const orders = new ItemsService("order", {
        database: database,
        schema: schema,
        accountability: customAccountability
    });
    
    schedule("0 3 * * *", async () => {

        const now = new Date();
        var earlier = new Date();
        earlier.setDate(now.getDate() - 1);

        var orderz = await orders.readByQuery({
            sort: ['time'], fields: ['*'], limit: 100,
            filter:
            {
                "_and": [{
                    'time': { '_nnull': true },
                },
                {
                    'departure_time': { '_nnull': true },
                },
                {
                    "departure_time":
                        { "_between": [earlier, now] }
                },
                {
                    "customerStatus":
                        { "_eq": false }
                }
                ]
            }
        });

        var userIds: any = [];

        orderz.forEach((order: any) => {
            logger.debug(order["user_created"]);
            userIds.push(order["user_created"]);
        });

        logger.debug(JSON.stringify(userIds));

        var userz = await users.readByQuery({
            filter: {
                "id": {
                    "_in": userIds
                }
            }
        });

        userz.forEach(async (user: any) => {
            await database('directus_users').update({ NichtErschienenZaehler: user["NichtErschienenZaehler"] + 1 }).where({ id: user["id"] });
        });

    })
})