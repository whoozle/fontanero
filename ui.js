// viewport size
WINDOW_WIDTH = 12
WINDOW_HEIGHT = 12

// map dimensions
MAP_WIDTH = 80;
MAP_HEIGHT = 30;
TILE_SIZE = 32;

function create_html () {
	$('body')['append']($('<div id="wrapper"><div id="map"><div id="floor"></div><div id="walls"></div></div><div id="hero"></div></div><div id="panel"></div><div id="log"></div>'));

	var mw = MAP_WIDTH*TILE_SIZE,
		mh = MAP_HEIGHT*TILE_SIZE,
		ww = WINDOW_WIDTH*TILE_SIZE,
		wh = WINDOW_HEIGHT*TILE_SIZE;

	$('#wrapper')['css']({
		width: ww*2, 
		height: wh
	});
	$('#map')['css']({
		width: mw*2, 
		height: mh,
		'margin-left': ww,
		'margin-top': Math.floor(WINDOW_HEIGHT/2)*TILE_SIZE
	});
	$('#floor')['css']({
		width: mw, 
		height: mh
	});
}

function get_neighbors (x, y) {
	var v = { type: CELL_VOID },
		c = map.cells;
	return {
		self: (c[y] && c[y][x] || v).type, 
		left: 	(c[y] && c[y][x-1] || v).type,
		right: 	(c[y] && c[y][x+1] || v).type,
		top: 	(c[y-1] && c[y-1][x] || v).type,
		bottom: (c[y+1] && c[y+1][x] || v).type
	}
}

function draw_tile (classname, left, top, z) {
	return '<b class="' + classname + '" style="left:' + left + 'px;top:' + top + 'px;' + (z? ('z-index:'+z) : '') + '"></b>'
}

function draw_object (x, y, z) {
	var cell = map.cells[y][x],
		s = '',
		left = (x-y)*TILE_SIZE,
		top = (x+y)*TILE_SIZE/2,
		o = a = '<b style="left:' + left + 'px;' +
						'top:' + top + 'px;' + 
						'z-index' + z + '" class="';

	if (cell.objects.length) {

		// draw object
		s += o + (cell.objects.length > 1 + !!cell.actor ? 'pile' : cell.objects[0].name) + '"></b>'
	}
	// draw actor (if any)
	if (cell.actor && (cell.actor != map.hero)) {
		s += a + cell.actor.name + '"></b>'
	}
	
	return s;
}

function draw_level() {
	var // predictable_rand initial value
		Xn = map.level,
		m = Math.pow(2, 32),
		a =	69069,
		c = 5;
		
		// wall decoration classes
		DECORATION = ['paint', 'switch', 'plug', 'display', 'calendar', 'ibelieve'],
		D_FREQ = 0.05;

	var p_rand = function() {
		Xn = (a*Xn + c) % m;
		return Xn/m;
	}
	
	for(var y=0, floor='', walls=''; y<MAP_HEIGHT; y++) {
		for(var x=0; x<MAP_WIDTH; x++) {
			var obj='<b id="o'+x+'_'+y+'">',
				left = (x-y)*TILE_SIZE,
				top = (x+y)*TILE_SIZE/2,
				z = (x + y)*10,
				cells = get_neighbors(x, y),
				deco = (p_rand() < D_FREQ ? (' d ' + DECORATION[Math.floor(p_rand()*DECORATION.length)]) : '' );
			// draw map elements
			switch (cells.self) {
				case CELL_VOID: 
						floor += draw_tile('u', x*TILE_SIZE, y*TILE_SIZE);
						break;
				case CELL_WALL: 
						floor += draw_tile('u', x*TILE_SIZE, y*TILE_SIZE);
						if ((y<=0) || (cells.top != CELL_WALL)) {
							walls += draw_tile('w l a', left, top, z+1);
						}
						if ((y>=MAP_WIDTH-1) || (cells.bottom != CELL_WALL)) {
							walls += draw_tile('w l' + deco, left, top, z+8);
						} 
						if ((x<=0) || (cells.left != CELL_WALL)) {
							walls += draw_tile('w r a', left, top, z+2);
						}
						if ((x>=MAP_WIDTH-1) || (cells.right != CELL_WALL)) {
							walls += draw_tile('w r', left, top, z+9);
						} 
						break;
				case CELL_ENTRANCE:
				case CELL_EXIT:
						walls += draw_tile((cells.self == CELL_EXIT ? 'exit' : 'enter'), left, top, z+3);
						break;
			}
			// draw object containers
			var s = draw_object(x, y, z+4)
			if (s) {
				// create container for this field
				walls += obj + s + '</b>'
			}
		}
	}
	$('#floor')['html'](floor);
	$('#walls')['html'](walls);
	$('#hero')['css']('z-index', (map.hero.cell.x + map.hero.cell.y)*10+6);
}

function move_camera(x, y) {
	var m = document.getElementById('map');
	m.style.left = (y-x)*TILE_SIZE + 'px';
	m.style.top = -(y+x)*TILE_SIZE/2 + 'px';
}

function repaint (cell) {
	var x = cell.x, y = cell.y;
	objs = $('#o'+x+'_'+y);
	if (cell.actor == map.hero) {
		$('#hero')['css']('z-index', (x+y)*10+6);
		move_camera(x, y);
	}
	if (!objs.length) {
		objs = $('<b id="o'+x+'_'+y+'"></b>');
		$('#walls')['append'](objs);
	}
	objs['empty']()['html'](draw_object(x, y, (x+y)*10+4))
}

function repaint_all() {
	draw_level();
	move_camera(map.hero.cell.x, map.hero.cell.y);
}

function S() {
	create_html();

	map = new dungeon_map(MAP_WIDTH, MAP_HEIGHT);

	map.repaint = repaint;
	map.repaint_all = repaint_all;
	
	map.generate();

	panel();
	intro();
}

window['S'] = S;
if ((navigator.userAgent.indexOf('Windows') == -1) && (navigator.userAgent.indexOf('Macintosh') == -1)) 
	document.documentElement.id = "linux";

