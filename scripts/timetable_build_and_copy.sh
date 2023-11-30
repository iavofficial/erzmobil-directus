#!/bin/bash

cd ../code/timetableextension
npm run build
mkdir -p ../../extensions/panels/timetableextension
# cp dist/index.js ../../extensions/panels/timetableextension/index.js

cp dist/index.js ../../extensions/panels/timetableextension/index.cjs
echo "copy timetable done"