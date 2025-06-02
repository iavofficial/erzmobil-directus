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