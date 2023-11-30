import os
from dotenv import load_dotenv
import requests
import json
import pprint

load_dotenv()

admin_mail = os.getenv('DESTINATION_ADMIN_MAIL')
admin_password = os.getenv('DESTINATION_ADMIN_PASSWORD')
# permissions_url = os.getenv('SOURCE_URL')
baseurl = os.getenv('DESTINATION_BASE_URL')

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

with open('permissions_updated.json','r') as file:
    permissions = json.load(file)

# pprint.pprint(permissions)
for permission in permissions:
    # pprint.pprint(permission)
    # pprint.pprint(permission)
    ret = requests.post(baseurl + '/permissions', headers={'Authorization':'Bearer ' + accesstoken}, json=permission)
    print(ret.status_code)
    # break

# permissions_post_response = requests.post(baseurl + '/permissions', headers={'Authorization':'Bearer ' + accesstoken}, data=json.dumps(permissions))

# print(permissions_post_response.status_code)