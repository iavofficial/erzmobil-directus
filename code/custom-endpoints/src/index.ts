import moment from "moment";
import "moment-recur-ts";
import { orderByDistance, isPointWithinRadius } from "geolib";
import { resourceLimits } from "worker_threads";

export default (router, { env, services, exceptions, schema, logger }) => {
  const { ItemsService } = services;
  const { RolesService } = services;
  const { UsersService } = services;
  const { ServiceUnavailableException, InvalidPayloadException } = exceptions;

  router.get("/cognito", (req, res, next) => {
    res.json({
      userPoolId: env.CUSTOM_AUTH_POOL_ID,
      userClientId: env.CUSTOM_AUTH_USER_CLIENT_ID,
      driverClientId: env.CUSTOM_AUTH_DRIVER_CLIENT_ID,
    });
  });

  router.get("/test", (req, res, next) => {
    console.log("test invoked");
    res.json({ test: req.accountability });
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

  async function isUserInRole(userId: string, req: any, roleName: string) {
    const customAccountability = {
      ip: req.ip,
      admin: true,
    };

    const rolesService = new RolesService({
      schema: req.schema,
      accountability: customAccountability,
    });

    const searchRoleId = {
      fields: ['users.id'],
      filter: {
        name: {
          _eq: roleName
        }
      },
      limit: -1
    }

    const usersInRole = await rolesService.readByQuery(searchRoleId);

    logger.debug('isUserInRole::userId: ' + JSON.stringify(userId));
    logger.debug('isUserInRole::usersInRole: ' + JSON.stringify(usersInRole));

    var userInRole = false;

    const usersInRoleList = usersInRole[0]["users"];
    if (usersInRoleList == undefined) {
      //return false as no users exist in this role or the role itself does not exist.
      logger.debug("no users in role list");
      return false;
    }

    logger.debug(JSON.stringify(usersInRoleList));

    usersInRoleList.forEach((user: any) => {
      logger.debug(JSON.stringify(user));
      if (userId == user["id"]) {
        userInRole = true;
      }
    });

    return userInRole;
  }

  router.get("/canbook", async (req, res, next) => {
    // const userRoleId = req?.accountability["role"];
    const userId = req?.accountability["user"];
    const roleName = "KannBuchen";

    if (userId == undefined) {
      res.json(false);
      return;
    }
    const canBook = await isUserInRoleByUserId(userId, req, roleName);
    res.json(canBook);
  });



  router.post("/token", async (req, res, next) => {
    if (req.body == undefined) {
      res.json();
      return;
    }
    if (Object.keys(req.body).length === 0) {
      res.json();
      return;
    }

    if (req.body["fcmToken"] == undefined) {
      res.json();
      return;
    }

    const tokenService = new ItemsService("token", {
      schema: req.schema,
      accountability: req.accountability
    });

    var alreadyThereTokens = await tokenService.readByQuery({
      fields: ['fcmToken'],
      filter: { fcmToken: { _eq: req.body["fcmToken"] } }
    });
    if (alreadyThereTokens.length == 0) {

      const userId = req.accountability["user"];
      var body = req.body;
      body["isDriver"] = await isUserInRole(userId, req, "Busfahrer");
      res.json(await tokenService.createOne(body));

    } else {
      res.json(alreadyThereTokens);
    }

  });

  router.delete("/token/:token", async (req, res, next) => {
    logger.debug(JSON.stringify(req.params));
    if (!req.params["token"]) {
      return res.json();
    }
    try {
      const userId = req?.accountability["user"];
      if (userId == undefined) {
        return res.json();
      }

      const tokenService = new ItemsService("token", {
        schema: req.schema,
        accountability: req.accountability
      });

      var tokenIds: number[] = await tokenService.readByQuery({
        fields: ['*']
      }
      ).then((tokens: any[]) => {
        logger.debug(JSON.stringify(tokens));
        var tokenIds: number[] = [];
        if (tokens != undefined) {
          tokens.forEach(token => {
            logger.debug(JSON.stringify(token));
            logger.debug(req.params["token"]);
            logger.debug(JSON.stringify(req.params));
            if (token["fcmToken"] == req.params["token"]) {
              tokenIds.push(token["id"]);
            }
          })
        }
        return tokenIds;
      });

      if (tokenIds.length > 0) {
        await tokenService.deleteMany(tokenIds);
      }
      res.json(tokenIds);

    } catch (error) {
      logger.error(error);
      res.json();
    }
  });

  router.get("/routes/:routeId/phoneNumbers", (req, res, next) => {
    if (!req.params.routeId) {
      return next(new InvalidPayloadException("Missing parameters!"));
    }
    try {
      const perm = req.accountability.permissions.filter(
        (permission) => permission["collection"] == "order"
      );

      // console.log(perm);
      const accountability = {
        ip: req.ip,
        admin: true,
      };

      const operatingTimeService = new ItemsService("order", {
        schema: req.schema,
        accountability: accountability,
      });
      operatingTimeService
        .readByQuery({ fields: ["route_id", "user_created.*"] }) // just picking the id and everything from users information
        .then((results) => {
          console.log(results);
          return results;
        })

        .then(
          (results) =>
            results.filter((element) => element.route_id == req.params.routeId) // Looks if there is any order with the same routeid
        )
        .then((results) => {
          console.log(results);
          var data = [];
          results.forEach((element) => {
            if (element.user_created.phoneNumber != undefined) {
              data.push({
                id: element.route_id,
                // firstName: element.user_created.first_name,
                // lastName: element.user_created.last_name,
                user_created: {
                  phoneNumber: element.user_created.phoneNumber,
                },
              });

            }
          });
          console.log(data);
          return { data: data };
        })
        .then((results) => res.json(results))
        .catch((error) => {
          return next(new ServiceUnavailableException(error.message));
        });
    } catch (error) {
      logger.error(error);
    }
  });

  router.get("/operatingtime/:communityId/:from/:to", (req, res, next) => {
    logger.debug("/operatingtime was invoked!");
    if (!req.params.from || !req.params.to) {
      return next(new InvalidPayloadException("Missing parameters!"));
    }

    try {
      const perm = req.accountability.permissions.filter(
        (permission) => permission["collection"] == "OperatingTime"
      );
      // console.log(JSON.stringify(req.accountability));
      logger.debug(JSON.stringify(perm));

      var permissionGranted = false;
      perm.forEach((permission) => {
        if (permission["action"].includes("read")) {
          permissionGranted = true;
        }
      });

      if (!permissionGranted) {
        return res.json([]);
      }

      const operatingTimeService = new ItemsService("OperatingTime", {
        schema: req.schema,
        accountability: req.accountability,
      });
      operatingTimeService
        .readByQuery({ fields: ["*.*"] })
        .then((results) => {
          console.log(results);
          return results;
        })
        .then((results) =>
          results.filter(
            (element) => element.busId.community_id == req.params.communityId
          )
        )
        .then((results) => {
          // logger.debug(results);
          var busses = [];
          results.forEach((element) => {
            busses.push({
              busId: element.busId.id,
              communityId: element.busId.community_id,
              name: element.busId.name,
              seats: element.busId.seats,
              seatsWheelchair: element.busId.seats_wheelchair,
              seatsBlockedPerWheelchair: element.busId.seatsBlockedByWheelchair,
              availabilitySlots: [],
              blockingSlots: []
            });
          });

          var returnDto = [
            ...new Map(busses.map((item) => [item["busId"], item])).values(),
          ];
          results.forEach((element) => {
            returnDto.forEach((bus) => {
              if (element.busId.id == bus.busId) {
                var elems = moment
                  .recur({
                    start: element.fromDate,
                    end: element.toDate,
                  })
                  .every(element.days)
                  .daysOfWeek()
                  .all();
                elems.forEach((onemoment) => {
                  bus.availabilitySlots.push({
                    startDate: onemoment.clone().set({
                      hour: element.fromTime.split(":")[0],
                      minute: element.fromTime.split(":")[1],
                    }),
                    endDate: onemoment.clone().set({
                      hour: element.toTime.split(":")[0],
                      minute: element.toTime.split(":")[1],
                    }),
                    exclusion: element.exclusion,
                  });
                });
              }
            });
          });
          return returnDto;
        })

        // algorithm for calculating remaining availability slots after reducing them by blocking time slots 
        .then((results: any[]) => {
          // logger.debug(JSON.stringify(results));

          results.forEach((bus) => {
            // first get all exlucions aka "blocking time slots"
            var exclusions = bus.availabilitySlots.filter(slot => slot.exclusion == true);
            // then iterate over the exclusions
            exclusions.forEach((exclusion: any[]) => {

              if (new Date(exclusion.startDate).getTime() >= new Date(req.params.from).getTime() && new Date(exclusion.endDate).getTime() <= new Date(req.params.to).getTime()) {
                bus.blockingSlots.push({ startDate: exclusion.startDate, endDate: exclusion.endDate });
              }

              var newAvailabilitySlots: any[] = [];
              // treat the exclusion as an request
              bus.availabilitySlots.forEach((availSlot) => {
                //Caution: The order of this if-else-statements is essential!
                // isOverlapping
                // |---------| 	Exclusion
                //   |-----|	Slot
                if (
                  new Date(exclusion.startDate).getTime() <= new Date(availSlot.startDate).getTime() &&
                  new Date(exclusion.endDate).getTime() >= new Date(availSlot.endDate).getTime()
                ) {

                }
                // |------| Exclusion
                //          |-------| Slot
                else if (
                  new Date(exclusion.endDate).getTime() <= new Date(availSlot.startDate).getTime()
                  // new Date(exclusion.startDate).getTime() < new Date(availSlot.startDate).getTime() &&
                  // new Date(availSlot.endDate).getTime() < new Date(exclusion.endDate).getTime()
                ) {
                  newAvailabilitySlots.push({
                    startDate: availSlot.startDate,
                    endDate: availSlot.endDate,
                  });
                }
                //              |------------| Exclusion
                // |----| Slot
                else if (
                  new Date(availSlot.endDate).getTime() <= new Date(exclusion.startDate).getTime()
                ) {
                  newAvailabilitySlots.push({
                    startDate: availSlot.startDate,
                    endDate: availSlot.endDate,
                  });
                }
                //is InBetween, so shorter than one slot
                // 			|----|		Exclusion
                //		|------------| 	Slot
                else if (
                  new Date(availSlot.startDate).getTime() <=
                  new Date(exclusion.startDate).getTime() &&
                  new Date(exclusion.endDate).getTime() <=
                  new Date(availSlot.endDate).getTime()
                ) {
                  // Split Timeslot into two separate slots

                  newAvailabilitySlots.push({
                    startDate: availSlot.startDate,
                    endDate: exclusion.startDate,
                  });

                  newAvailabilitySlots.push({
                    startDate: exclusion.endDate,
                    endDate: availSlot.endDate,
                  });
                }
                // slotIsPartialBeforeReq
                // 		|---------|	Exclusion
                // 	|--------|		Slot

                else if (
                  new Date(availSlot.startDate).getTime() <=
                  new Date(exclusion.startDate).getTime() &&
                  new Date(exclusion.startDate).getTime() <=
                  new Date(availSlot.endDate).getTime()
                ) {
                  newAvailabilitySlots.push({
                    startDate: availSlot.startDate,
                    endDate: exclusion.startDate,
                  });

                }
                // slotIsPartialAfterReq
                // 		|-----------| Exclusion
                //				|----------| Slot
                else if (
                  new Date(availSlot.startDate).getTime() <=
                  new Date(exclusion.endDate).getTime() &&
                  new Date(exclusion.endDate).getTime() <=
                  new Date(availSlot.endDate).getTime()
                ) {
                  newAvailabilitySlots.push({
                    startDate: exclusion.endDate,
                    endDate: availSlot.endDate,
                  });
                }
              });
              // !
              // add the remaining timeslots as the new availability timeslots for the bus!
              bus.availabilitySlots = newAvailabilitySlots;
            });
          });
          return results;
        })
        .then((results) => {
          results.forEach((bus) => {
            var relevantTimeslots: any[] = [];
            bus.availabilitySlots.forEach((availSlot) => {
              // isOverlapping
              // |---------| 	Req
              //   |-----|	Slot
              if (
                new Date(req.params.from).getTime() <=
                new Date(availSlot.startDate).getTime() &&
                new Date(availSlot.endDate).getTime() <=
                new Date(req.params.to).getTime()
              ) {
                relevantTimeslots.push({
                  startDate: availSlot.startDate,
                  endDate: availSlot.endDate,
                });
              }
              //is InBetween, so shorter than one slot
              // 			|----|		Req
              //		|------------| 	Slot
              else if (
                new Date(availSlot.startDate).getTime() <=
                new Date(req.params.from).getTime() &&
                new Date(req.params.to).getTime() <=
                new Date(availSlot.endDate).getTime()
              ) {
                relevantTimeslots.push({
                  startDate: req.params.from,
                  endDate: req.params.to,
                });
              }
              // slotIsPartialBeforeReq
              // 		|---------|	Req
              // 	|--------|		Slot
              else if (
                new Date(availSlot.startDate).getTime() <=
                new Date(req.params.from).getTime() &&
                new Date(req.params.from).getTime() <=
                new Date(availSlot.endDate).getTime()
              ) {
                relevantTimeslots.push({
                  startDate: req.params.from,
                  endDate: availSlot.endDate,
                });
              }
              // slotIsPartialAfterReq
              // 		|-----------| Req
              //				|----------| Slot
              else if (
                new Date(availSlot.startDate).getTime() <=
                new Date(req.params.to).getTime() &&
                new Date(req.params.to).getTime() <=
                new Date(availSlot.endDate).getTime()
              ) {
                relevantTimeslots.push({
                  startDate: availSlot.startDate,
                  endDate: req.params.to,
                });
              }
            });
            bus.availabilitySlots = relevantTimeslots;
          });
          return results;
        })
        .then((results) => res.json(results))
        .catch((error) => {
          return next(new ServiceUnavailableException(error.message));
        });
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  router.get('/roadclosures/:communityId/:from/:to', (req, res, next) => {
    if (!req.params.from || !req.params.to || !req.params.communityId) {
      return next(new InvalidPayloadException("Missing parameters!"));
    }

    try {

      const perm = req.accountability.permissions.filter(
        (permission) => permission["collection"] == "RoadClosure"
      );
      // console.log(JSON.stringify(req.accountability));
      // logger.debug(JSON.stringify(perm));

      var permissionGranted = false;
      perm.forEach((permission) => {
        if (permission["action"].includes("read")) {
          permissionGranted = true;
        }
      });

      if (!permissionGranted) {
        return res.json([]);
      }

      const roadClosureService = new ItemsService("RoadClosure", {
        schema: req.schema,
        accountability: req.accountability,
      });
      roadClosureService
        .readByQuery({ fields: ["*.*"] })
        .then((results) => {
          // console.log(results);
          return results;
        })
        .then((results) => {
          // results.forEach((roadClosure) => {
          // logger.debug('roadClosure: ' + JSON.stringify(roadClosure));
          // });
          // return res.json(results);
          return results;
        })
        .then((results) => {
          var positions = [];
          results.forEach((roadClosure) => {
            // |-----| request
            //          |------| rC
            if (
              new Date(req.params.from).getTime() > new Date(roadClosure.from).getTime() &&
              new Date(req.params.from).getTime() < new Date(roadClosure.until).getTime()
              ||
              new Date(req.params.to).getTime() > new Date(roadClosure.from).getTime() &&
              new Date(req.params.to).getTime() < new Date(roadClosure.until).getTime()
            ) {
              positions.push({
                latitude: roadClosure.position.coordinates[1],
                longitude: roadClosure.position.coordinates[0]
              });
            }
          });
          return res.json(positions);
        });
    } catch (error) {
      next(InvalidPayloadException('Something went wrong!'));
    }

  });

  router.get("/stops/nearest", (req, res, next) => {
    if (!req.query.lat || !req.query.lng || !req.query.r || !req.query.n) {
      return next(new InvalidPayloadException("Missing parameters!"));
    }

    const perm = req.accountability.permissions.filter(
      (permission) => permission["collection"] == "stop"
    );
    if (!perm[0]["action"].includes("read")) {
      return res.json([]);
    }

    const stopService = new ItemsService("stop", {
      schema: req.schema,
      accountability: req.accountability,
    });
    stopService
      .readByQuery({ fields: ["*.*"], limit: -1 })
      .then((results) => {
        var stopLatLonList = [];
        results.forEach((stop) => {
          if (
            isPointWithinRadius(
              {
                latitude: stop.location?.coordinates[1],
                longitude: stop.location?.coordinates[0],
              },
              { latitude: req.query.lat, longitude: req.query.lng },
              req.query.r
            )
          ) {
            stopLatLonList.push({
              latitude: stop.location?.coordinates[1],
              longitude: stop.location?.coordinates[0],
            });
          }
        });
        return stopLatLonList;
      })
      .then((results) => {
        return orderByDistance(
          { latitude: req.query.lat, longitude: req.query.lng },
          results
        );
      })
      .then((stopLatLonListOrderedByDistance) => {
        //now that we got the list ordered by distance, we need to reapply the meta data
        return stopService.readByQuery({
          fields: ["*.*"],
          limit: -1,
          filter: {
            'active': { '_eq': true }
          }
        }).then((stops) => {
          var resultList = [];
          stopLatLonListOrderedByDistance.forEach((resultStop) => {
            stops.forEach((stop) => {
              if (
                resultStop.latitude == stop.location.coordinates[1] &&
                resultStop.longitude == stop.location.coordinates[0]
              ) {
                resultList.push({
                  id: stop.id,
                  communityId: stop.communityId?.id,
                  name: stop.name,
                  latitude: resultStop.latitude,
                  longitude: resultStop.longitude,
                });
              }
            });
          });
          return resultList;
        });
      })
      .then((results) => {
        if (req.query.n == 1) {
          res.json(results.slice(0, 1));
        } else {
          res.json(results.slice(0, req.query.n));
        }
      });
  });
};