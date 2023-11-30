#!/bin/bash

cd ../code/aws-middleware
npm run build
mkdir -p ../../extensions/endpoints/awsmw
# cp dist/index.js ../../extensions/endpoints/awsmw/index.js
cp dist/index.js ../../extensions/endpoints/awsmw/index.cjs
echo "copy awsmw done."