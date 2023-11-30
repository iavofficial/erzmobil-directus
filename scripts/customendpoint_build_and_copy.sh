#!/bin/bash

cd ../code/custom-endpoints/
npm run build
mkdir -p ../../extensions/endpoints/customendpoints
# cp dist/index.js ../../extensions/endpoints/customendpoints/index.js
cp dist/index.js ../../extensions/endpoints/customendpoints/index.cjs
echo "copy custom-endpoints done"