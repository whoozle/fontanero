#!/bin/sh
DIR=www

#echo "optimizing css[ui]..."
#java -jar tools/yuicompressor-2.4.2.jar -o $DIR/_s.css style.css

echo "optimizing css[text]..."
java -jar tools/yuicompressor-2.4.2.jar -o $DIR/_ts.css tstyle.css

GCC_OPT="--compilation_level ADVANCED_OPTIMIZATIONS"
#echo "optimizing game code[ui]..."
#cat game.js shared_ui.js ui.js > $DIR/_source.js
#echo -n "\$('head')['append'](\$(\"<style>" >> $DIR/_source.js
#cat $DIR/_s.css >> $DIR/_source.js
#echo '</style>"));' >> $DIR/_source.js
#java -jar tools/compiler.jar $GCC_OPT --js $DIR/_source.js --js_output_file $DIR/_j.js

echo "optimizing game code[text]..."
cat game.js shared_ui.js minigame.js tui.js | \
	grep -v cheat | \
	sed 's/\/\*\* @const \*\//var \0/' | \
	sed 's/\/\*==global==\*\//var \0/' | \
	sed 's/\.left/\._left/g' | \
	sed 's/\.right/\._right/g' | \
	sed 's/\.top/\._top/g' | \
	sed 's/\.bottom/\._bottom/g' | \
	sed 's/\.width/\._width/g' | \
	sed 's/\.height/\._height/g' | \
	sed 's/\.cells/\._cells/g' | \
	sed 's/\.name/\._name/g' | \
	sed 's/\.move/\._move/g' | \
	sed 's/\.type/\._type/g' | \
	sed 's/\.search/\._search/g' | \
	sed 's/\.add/\._add/g' | \
	sed 's/\.remove/\._remove/g' | \
	sed 's/\.distance/\._distance/g' | \
	sed 's/\.apply/\._apply/g' \
	> $DIR/_tsource.js

echo -n "\$('head')['append'](\$(\"<style>" >> $DIR/_tsource.js
cat $DIR/_ts.css | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/;}/}/g' >> $DIR/_tsource.js
echo '</style>"));' >> $DIR/_tsource.js
java -jar tools/compiler.jar $GCC_OPT --js $DIR/_tsource.js --variable_map_output_file $DIR/_jt_vars.map | sed 's/function/@/g' | sed "s/.length/@@/g" |sed "s/this\\./\`/g" > $DIR/_jt.js

#rm $DIR/_source.js

#echo "optimizing tiles..."
#pngcrush -rem alla -reduce -brute t.png $DIR/t.png > /dev/null

#echo "packing png file [ui]..."
#./js2png.php $DIR/_j.js $DIR/j.png
echo "packing png file [text]..."
./js2png.py $DIR/_jt.js $DIR/x.png
#rm $DIR/_j.js
SIZE=`identify www/x.png | awk '{ print $3; }'`
WIDTH=`echo $SIZE | cut -dx -f1`
HEIGHT=`echo $SIZE | cut -dx -f2`
echo "inserting width: $WIDTH, height: $HEIGHT"

echo "optimizing loader code[text]..."
cat loader.js | sed "s/WIDTH/$WIDTH/" | sed "s/HEIGHT/$HEIGHT/" > $DIR/loader.js
echo "loadpng('x.png', start);" >> $DIR/loader.js

java -jar tools/compiler.jar $GCC_OPT --js $DIR/loader.js --js_output_file $DIR/_s.js
#echo "creating loaders..."
##cutting first two lines:
#head -n2 < loader.html > $DIR/ui.html
#cat $DIR/_s.js >> $DIR/ui.html
#tail -n+3 loader.html >> $DIR/ui.html

head -n2 < loader.html > $DIR/text.html
cat $DIR/_s.js >> $DIR/text.html
tail -n+3 loader.html >> $DIR/text.html
cp t.png $DIR/t.png

#echo "calling advpng"
#advpng -z -4 www/x.png www/t.png
echo "optimizing with pngout..."
wine tools/pngout.exe -c0 www/x.png
wine tools/pngout.exe www/t.png

#echo -n "3d variant: "
#du -cb $DIR/j.png $DIR/ui.html | tail -n1
echo -n "tile variant: "
du -cb $DIR/x.png $DIR/text.html $DIR/t.png | tail -n1

