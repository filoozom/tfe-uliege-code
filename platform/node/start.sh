#!/bin/bash

ID=$1
shift

node index.js -d .nodes/$ID -t 0.0.0.0:1230$ID -w 0.0.0.0:2340$ID -a 127.0.0.1:3450$ID
