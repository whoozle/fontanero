#!/bin/sh

DIR=www

sed 's/[^a-z\\.]/\n/ig' < $DIR/_jt.js | sed 's/\\.?[a-z]{1,2}//ig' | sort -u| xargs
