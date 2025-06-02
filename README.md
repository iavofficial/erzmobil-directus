# Directus

Directus ist eine Open-Source-Datenplattform, die die Datenverwaltung und den Datenzugang vereinfacht. Sie ermöglicht es Teams, unabhängig von ihren technischen Kenntnissen, mühelos mit Datenbanken und digitalen Datenbeständen zu arbeiten. Mit Directus können Sie eine Verbindung zu Ihrer SQL-Datenbank herstellen und CRUD-Operationen, Benutzerverwaltung, komplexe Abfragen, Webhooks und Automatisierung durchführen. Es bietet eine flexible und erweiterbare Architektur, die REST- und GraphQL-APIs, CLI-Tools und ein JavaScript-SDK unterstützt. Directus fördert die Kontrolle durch die Entwickler, die Skalierbarkeit und die Anpassungsoptionen und eignet sich daher für Headless CMS, Backend-as-a-Service, Datenmanagement und Analyseprojekte. Es handelt sich um eine datenorientierte Lösung ohne Herstellerbindung und mit umfassender Dokumentation.

https://directus.io

# Kontext SmartMobility-Lösung

Im Kontext der Mobilitätslösung dient Directus als Backend-as-a-Service bzw. Headless CMS.
Es bildet die zentrale Datenhaltung des Systems, gepaart mit dem nativen Dirctus-CMS Frontend, dar.
Um die Funktionalitäten für Mobility-Lösung abzubilden, wurde Directus mittels Extensions in seinem Fuktionsumfang erweitert.
Dazu gehören Extensions der folgenden Kategorien:

    - Endpunkte
    - sog. Hooks
    - Module
    - Views

Die entwickelten Extensions befinden sich im Ordner [code](code)

## Docker Container für Directus-Extensions

Dieser Container enthält alle benötigten, "compilierten" Extensions, die für die Abbildung der Funktionalität des Mobilitätssystems benötigt werden. Dazu gehören:

| Name  | Typ  | Beschreibung |
|---|---|---|
| custom-endpoints  | Endpoint  | Zusätzliche Endpunkte für REST-API. Z.b. Abfrage von OperatingTimes für Zeitraum X bis Y  |
|  mphooks | Hooks  | Aktionen, die bei Veränderung von Daten in Tabellen automatisch ausgelöst werden. Bsp.: Bus-Position wird aktualisiert und mit dem Routing synchronisiert (mittels RabbitMQ)  |
| routing-hooks  | Hooks  | Eigene Extension für die Herstellung der Kommunikation mit dem Routing - Abbildung aller Events zwischen Routing/Directus |
| system-push-endpoint  | Endpoint  | Zusätzliche Endpunkte, um Push-Benachrichtigungen an Nutzer/Fahrer zu senden. Sucht nach Tokens der jeweiligen Nutzer einer Gruppe und sendet Text an FCM-Service |
| system-push-module | Module  | Einbindbares Modul in die Directus-Oberfläche, um Funktionalität für System-Push-Benachrichtigungen visuell abzubilden  |

# Projektspezifische API

Die [Directus-API](https://docs.directus.io/reference/introduction.html) wird durch die entwickelten Extensions um folgende Endpunkte erweitert (s. [all.http](http/all.http))


#### Query Operating Times #1

<details>
<summary><code>GET</code> <code>{{BASE_URL}}/customendpoints/operatingtime/{communityId}/{isoFromDateTime}/{isoToDateTime}</code></summary>

##### Parameters

> | Name             | Type     | Data Type | Description                                    |
> | ---------------- | -------- | --------- | ---------------------------------------------- |
> | communityId      | required | string    | ID of the community                            |
> | isoFromDateTime  | required | string    | Start date and time in ISO 8601 format         |
> | isoToDateTime    | required | string    | End date and time in ISO 8601 format           |

##### Responses

```json
[
  {
    "busId": 11,
    "communityId": 1,
    "name": "ErzMobil",
    "seats": 6,
    "seatsWheelchair": 1,
    "seatsBlockedPerWheelchair": 2,
    "availabilitySlots": [],
    "blockingSlots": []
  }
]
```

</details>

---------------------------------------------------------------------------------------

#### Query Operating Times #2

<details>
<summary><code>GET</code> <code>/customendpoints/operatingtime/{communityId}/{isoFromDateTime}/{isoToDateTime}</code></summary>

##### Parameters

> | Name             | Type     | Data Type | Description                                    |
> | ---------------- | -------- | --------- | ---------------------------------------------- |
> | communityId      | required | string    | ID of the community                            |
> | isoFromDateTime  | required | string    | Start date and time in ISO 8601 format         |
> | isoToDateTime    | required | string    | End date and time in ISO 8601 format           |

##### Responses

```json
[
  {
    "busId": 11,
    "communityId": 1,
    "name": "ErzMobil",
    "seats": 6,
    "seatsWheelchair": 1,
    "seatsBlockedPerWheelchair": 2,
    "availabilitySlots": [
      {
        "startDate": "2023-07-12T06:00:00+00:00",
        "endDate": "2023-07-12T08:00:00+00:00"
      }
    ],
    "blockingSlots": []
  }
]
```

</details>

---------------------------------------------------------------------------------------


#### Query road closures with specified time intervals

<details>
<summary><code>GET</code> <code>/customendpoints/roadclosures/{communityId}/{isoFromDateTime}/{isoToDateTime}</code></summary>

##### Parameters

> | Name             | Type     | Data Type | Description                                    |
> | ---------------- | -------- | --------- | ---------------------------------------------- |
> | communityId      | required | string    | ID of the community                            |
> | isoFromDateTime  | required | string    | Start date and time in ISO 8601 format         |
> | isoToDateTime    | required | string    | End date and time in ISO 8601 format           |

##### Responses

> | HTTP Code | Content-Type                   | Response        |
> | --------- | ------------------------------ | --------------- |
> | 200       | `application/json;charset=UTF-8` | Road closures   |
</details>

---------------------------------------------------------------------------------------


#### Retrieve phone numbers for drivers only

<details>
<summary><code>GET</code> <code><b>/routes/:routeId/phoneNumbers</b></code></summary>

##### Parameters

> | Name     | Type     | Data Type | Description                  |
> | -------- | -------- | --------- | ---------------------------- |
> | routeId  | required | string    | ID of the specific route      |

##### Responses

> | HTTP Code | Content-Type                   | Response        |
> | --------- | ------------------------------ | --------------- |
> | 200       | `application/json;charset=UTF-8` | Phone numbers   |
</details>

---------------------------------------------------------------------------------------


#### Check eligibility for booking for end customers

<details>
<summary><code>GET</code> <code><b>/customendpoints/canbook</b></code></summary>

##### Parameters

> No parameters required.

##### Responses

| HTTP Code | Content-Type                   | Response |
| --------- | ------------------------------ | -------- |
| 200       | `text/plain;charset=UTF-8`     | `false`  |
| 200       | `text/plain;charset=UTF-8`     | `true`   |
</details>

---------------------------------------------------------------------------------------


#### Add or delete FCM token for push notifications

<details>
<summary><code>POST</code> <code>/token</code></summary>

##### Request Body

> No request body required.

##### Responses

> | HTTP Code | Content-Type                   | Response          |
> | --------- | ------------------------------ | ----------------- |
> | 200       | `text/plain;charset=UTF-8`     | Token added       |

</details>

<details>
<summary><code>DELETE</code> <code>/token/:token</code></summary>

##### Parameters

> | Name  | Type     | Data Type | Description               |
> | ----- | -------- | --------- | ------------------------- |
> | token | required | string    | FCM token to be deleted   |

##### Responses

> | HTTP Code | Content-Type                   | Response          |
> | --------- | ------------------------------ | ----------------- |
> | 200       | `text/plain;charset=UTF-8`     | Token deleted     |

</details>

-----------------------------------------------------------------------------------------------------------


#### Find nearest stop for given latitude, longitude, and radius

<details>
<summary><code>POST</code> <code><b>/stops/nearest</b></code></summary>

##### Request Body

```json
{
  "lat": "12.2",
  "lng": "13.3",
  "r": "500",
  "n": 1
}
```

##### Parameters

| Name | Type     | Data Type | Description                  |
| ---- | -------- | --------- | ---------------------------- |
| lat  | required | string    | Latitude of the location     |
| lng  | required | string    | Longitude of the location    |
| r    | required | string    | Radius in meters             |
| n    | optional | number    | Number of stops to retrieve  |

##### Responses

| HTTP Code | Content-Type                   | Response          |
| --------- | ------------------------------ | ----------------- |
| 200       | `application/json;charset=UTF-8` | Nearest stop data |
</details>


---------------------------------------------------------------------------------------


# Schnittstellendokumentation Directus <-> Apps

#### Get clients userId

<details>
 <summary><code>GET</code> <code><b>/users/me</b></code> <code>(returns clients userId in directus)</code></summary>

##### Parameters

> | name      |  type     | data type               | description                                                           |
> |-----------|-----------|-------------------------|-----------------------------------------------------------------------|
> | Authorization      |  required | Headers   | Authorizationtoken provided by /auth/login from Directus  |


##### Responses

> | http code     | content-type                      | response                                                            |
> |---------------|-----------------------------------|---------------------------------------------------------------------|
> | `200`         | `text/plain;charset=UTF-8`        | `true` / `false`                                |

</details>

---------------------------------------------------------------------------------------


#### Get directus cognito configuration

<details>
 <summary><code>GET</code> <code><b>/customendpoints/cognito</b></code> <code>(returns cognito configuration)</code></summary>


##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `text/plain;charset=UTF-8`          | `"userPoolId": "eu-central-1_tdwybtbCf","userClientId": "6ocqpe3d13dtpa0j72a30nkdek","driverClientId":"252a9fstcdet8l180mu4d5329a"`                        |

</details>

---------------------------------------------------------------------------------------


#### Get tickettypes

<details>
 <summary><code>GET</code> <code><b>/items/tickettype</b></code> <code>(returns items from tickettype-collection)</code></summary>


##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json;charset=UTF-8`          | `{"data": [{"Name": "Schnell zum Arzt-Ticket"},{"Name": "Feierabendsause"},{"Name": "Schüler ABC"}]}`|

</details>

---------------------------------------------------------------------------------------


#### Get new backend availiability

<details>
 <summary><code>GET</code> <code><b>/items/NewBackendAvailability</b></code> <code>(returns toggle value for directus availability)</code></summary>


##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `text/plain;charset=UTF-8`          | `true` / `false` |

</details>

---------------------------------------------------------------------------------------

#### Login using cognito token

<details>
 <summary><code>POST</code> <code><b>/awsmw/auth</b></code> <code>(login mechanism which exchanges a cognito token against a directus token)</code></summary>

##### Parameters

> | name      |  type     | data type               | description                                                           |
> |-----------|-----------|-------------------------|-----------------------------------------------------------------------|
> | IdToken |  required | JSON Body   |   |
> | RefreshToken | required | JSON Body | |
> | clientId | required | JSON Body | |


##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json;charset=UTF-8` | `{"accessToken": "...",  "expires": 2022-05-02T15:08:22.499Z,  "refreshToken": "..."}` |

</details>

---------------------------------------------------------------------------------------


#### Get stops

<details>
 <summary><code>GET</code> <code><b>/items/stop</b></code> <code>(returns stops (haltestellen) configured in directus)</code></summary>


##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json;charset=UTF-8` | `{  "data": [{"id":5,"name":"Test","location":{"coordinates":[13.326656180707829,52.51944337812006],"type": "Point"},"communityId": 2}]}` |

</details>

---------------------------------------------------------------------------------------


#### Get bus by community id

<details>
 <summary><code>GET</code> <code><b>/items/stop</b></code> <code>(returns stops (haltestellen) configured in directus)</code></summary>


##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json;charset=UTF-8` | `{  "data": [{"id":5,"name":"Test","location":{"coordinates":[13.326656180707829,52.51944337812006],"type": "Point"},"communityId": 2}]}` |

</details>

---------------------------------------------------------------------------------------


#### Get token

<details>
 <summary><code>GET</code> <code><b>/items/token/{token}</b></code> <code>(returns token)</code></summary>


##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json;charset=UTF-8` | `{"fcmToken":"kwjfalkjbafkjbflkjb", "isDriver": true}` |

</details>

---------------------------------------------------------------------------------------


#### Post new token

<details>
 <summary><code>POST</code> <code><b>/items/token</b></code> <code>POST a new token for FCM-Notifications</code></summary>

##### Parameters

> | name      |  type     | data type               | description                                                           |
> |-----------|-----------|-------------------------|-----------------------------------------------------------------------|
> | fcmToken |  required | JSON Body   |   |



##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json;charset=UTF-8` | `{"fcmToken":"kwjfalkjbafkjbflkjb"}` |

</details>

---------------------------------------------------------------------------------------


#### Post new token

<details>
 <summary><code>POST</code> <code><b>/items/token</b></code> <code>POST a new token for FCM-Notifications</code></summary>

##### Parameters

> | name      |  type     | data type               | description                                                           |
> |-----------|-----------|-------------------------|-----------------------------------------------------------------------|
> | fcmToken |  required | JSON Body   |   |



##### Responses

> | http code     | content-type                        | response                                                            |
> |---------------|-------------------------------------|---------------------------------------------------------------------|
> | `200`         | `application/json;charset=UTF-8` | `{"fcmToken":"kwjfalkjbafkjbflkjb", "isDriver": true}` |

</details>

---------------------------------------------------------------------------------------

