import os
from dotenv import load_dotenv
import requests
import json
import pprint

load_dotenv()

admin_mail = os.getenv('DESTINATION_ADMIN_MAIL')
admin_password = os.getenv('DESTINATION_ADMIN_PASSWORD')
# permissions_url = os.getenv('DESTINATION_URL')
baseurl = os.getenv('DESTINATION_BASE_URL')

SOURCE_ADMIN_ROLE = os.getenv('SOURCE_ADMIN_ROLE')
SOURCE_BETRIEB_ROLE = os.getenv('SOURCE_BETRIEB_ROLE')
SOURCE_BUSFAHRER_ROLE = os.getenv('SOURCE_BUSFAHRER_ROLE')
SOURCE_KANNBUCHEN_ROLE = os.getenv('SOURCE_KANNBUCHEN_ROLE')
SOURCE_KANNSEHEN_ROLE = os.getenv('SOURCE_KANNSEHEN_ROLE')

DESTINATION_ADMIN_ROLE = os.getenv('DESTINATION_ADMIN_ROLE')
DESTINATION_BETRIEB_ROLE = os.getenv('DESTINATION_BETRIEB_ROLE')
DESTINATION_BUSFAHRER_ROLE = os.getenv('DESTINATION_BUSFAHRER_ROLE')
DESTINATION_KANNBUCHEN_ROLE = os.getenv('DESTINATION_KANNBUCHEN_ROLE')
DESTINATION_KANNSEHEN_ROLE = os.getenv('DESTINATION_KANNSEHEN_ROLE')

with open('permissions.json','r') as file:
    permissions = json.load(file)

role_id_mappings = {
    SOURCE_ADMIN_ROLE : DESTINATION_ADMIN_ROLE,
    SOURCE_BETRIEB_ROLE : DESTINATION_BETRIEB_ROLE,
    SOURCE_BUSFAHRER_ROLE : DESTINATION_BUSFAHRER_ROLE,
    SOURCE_KANNBUCHEN_ROLE : DESTINATION_KANNBUCHEN_ROLE,
    SOURCE_KANNSEHEN_ROLE : DESTINATION_KANNSEHEN_ROLE
}

for permission in permissions:
    old_roleid = permission["role"]
    if old_roleid in role_id_mappings:
        new_roleid = role_id_mappings[old_roleid]
        permission["role"] = new_roleid
        if "id" in permission:
            del permission["id"]
    else:
        del permission

with open('permissions_updated.json','w') as outputfile:
    json.dump(permissions, outputfile, indent=4)