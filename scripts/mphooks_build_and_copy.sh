#!/bin/bash

cd ../code/custom-endpoints/
npm run build
mkdir -p ../../extensions/hooks/mphooks
# cp dist/index.js ../../extensions/hooks/mphooks/index.js
cp dist/index.js ../../extensions/hooks/mphooks/index.cjs
echo "copy mphooks done"