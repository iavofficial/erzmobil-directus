#!/bin/bash

cd ../code/system-push/system-push-module/
npm run build
mkdir -p ../../../extensions/modules/systempush
# cp dist/index.js ../../../extensions/modules/systempush/index.js
cp dist/index.js ../../../extensions/modules/systempush/index.cjs
echo "copy systempush-module done"