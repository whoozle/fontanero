#!/bin/sh

rm -rf fontanero fontanero.zip
mkdir fontanero
cp www/text.html fontanero/index.html
cp t.png fontanero
cp www/x.png fontanero
zip -r -9 fontanero.zip fontanero readme.txt
rm -rf fontanero
