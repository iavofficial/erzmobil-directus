#!/bin/bash

# Build docker-image with tag name $1

if [ "$#" -ne 1 ]; then
    echo "Please provide version number"
    exit
fi

echo "Version number:"
echo $1

cd ..
docker build -t directus-bootstrap:$1 .

# boot it up