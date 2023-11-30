#!/bin/bash

cd ../code/cron-baduser/
npm run build
mkdir -p ../../extensions/hooks/cron-baduser
# cp dist/index.js ../../extensions/hooks/cron-baduser/index.js
cp dist/index.js ../../extensions/hooks/cron-baduser/index.cjs
echo "copy cron-baduser done"