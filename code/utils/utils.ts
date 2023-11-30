export async function isUserInRoleByUserId(userId: string, req: any, roleName: string) {
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
    }

    const roleId = await rolesService.readByQuery(searchRoleId);

    logger.debug('isUserInRoleByUserAccountability::roleId: ' + JSON.stringify(roleId));
    logger.debug('isUserInRoleByUserAccountability::userRoleId: ' + JSON.stringify(userRoleId));

    return userRoleId[0]["role"] == roleId[0]["id"];
}