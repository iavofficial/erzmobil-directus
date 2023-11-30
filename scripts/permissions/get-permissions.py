import os
from dotenv import load_dotenv
import requests
import json
import pprint

load_dotenv()

admin_mail = os.getenv('SOURCE_ADMIN_MAIL')
admin_password = os.getenv('SOURCE_ADMIN_PASSWORD')
# permissions_url = os.getenv('SOURCE_URL')
baseurl = os.getenv('SOURCE_BASE_URL')

credentials = {
    'email': admin_mail,
    'password': admin_password
}

headers = {
    'Content-Type': 'application/json'
}

accesstoken_raw = requests.post(baseurl + '/auth/login', data=json.dumps(credentials), headers=headers)

if accesstoken_raw.status_code != 200:
    print("Wrong credentials!")
    exit

accesstoken = accesstoken_raw.json()["data"]["access_token"]
# print(accesstoken)

permissions_raw = requests.get(baseurl + '/permissions',headers={'Authorization':'Bearer ' + accesstoken})
permissions = permissions_raw.json()["data"]

pprint.pprint(permissions)

with open('./permissions.json', 'w') as file:
    json.dump(permissions,file)

print(f'Successfully saved response JSON')