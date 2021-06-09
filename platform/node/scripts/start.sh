#!/bin/bash

ID=$1
shift

node index.js -d .nodes/$ID -t 0.0.0.0:1230$ID -w 0.0.0.0:2340$ID -a 0.0.0.0:3450$ID
