#!/bin/bash

sh ./aws_build_and_deploy.sh  
sh ./customendpoint_build_and_copy.sh
sh ./mphooks_build_and_copy.sh
sh ./routinghooks_build_and_copy.sh
# sh ./timetableextension_build_and_copy.sh
sh ./systempush_endpoint_build_and_copy.sh
sh ./systempush_module_build_and_copy.sh

#03/2023 by a01wielo
sh ./cron_baduser_hook_build_and_copy.sh