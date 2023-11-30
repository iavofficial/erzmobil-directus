#!/bin/bash

cd ../code/
for d in */; do
    echo "$d"
    cd $d
    npm install
    cd ..
done