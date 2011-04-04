function gettile(cell) {
	if (!cell.visited)
		return -1;
	var actor = cell.actor;
	var hero = map.hero;
	var blinded = hero.blinded > 0;

	if (actor == hero)
		return 4;

	if (actor != null) {
		if (blinded)
			return 24;

		if (actor.boss)
			return 22;

		var name = actor.name;
		var tiles = {
			'wasp': 9, 
			'spider': 14, 
			'rat': 15,
			'bat': 16, 
			'snake': 17, 
			'poisonous bat': 16, 
			'vampire bat': 16, 
			'poisonous snake': 17,
			'rabid mole': 18,
			'mutant': 19,
			'zombie': 20,
			'ghost': 21
		}
		var tile = tiles[name];
		return tile? tile: 24;
	}
	
	var objs = cell.objects;
	var n = objs.length;
	if (n) {
		if (blinded)
			return 24;

		var mask = 0;
		for(var i = 0; i < n; ++i) {
			mask |= (objs[i].type & ~PICKABLE);
		}
		if (n == 1 || (mask & (mask - 1)) == 0) {
			var o = objs[0];
			var type = o.type;
			if (o.name.indexOf("pipes") >= 0)
				return (type&FIXABLE)? 12: 13;
			if (type & DRINKABLE)
				return 11;
			if (type & EDIBLE)
				return 7;
			if (type & READABLE)
				return 8;
			
			switch(o.name) {
			case "gold":
				return 6; 
			case "key":
				return 10;
			}
		}
		return 5;
	}
	switch(cell.type) {
	case CELL_FLOOR:
		return cell.blood? 23: 0;
	case CELL_ENTRANCE:
		return 2;
	case CELL_EXIT:
		return 3;
	case CELL_WALL:
		return 1;
	default:
		return -1;
	}
}

function repaint(cell) {
	var c = $('#c' + cell.y + '_' + cell.x);
	var t = gettile(cell);
	if (t >= 0) {
		c['css']({
			'visibility': 'visible',
			'background-position' : "0 " + (t * -16) + "px"
		})['addClass']('t' + t);
	} else 
		c['css']('visibility', 'hidden');
}

function repaint_all() {
	var str = '<i id="th"/>', t;
	var w = map.width, h = map.height;
	for(var y = 0; y < h; ++y) {
		for(var x = 0; x < w; ++x) {
			if (x == 0)
				t = 'u'
			else
				t = 'i';
			str += "<" + t + " id='c" + y + "_" + x + "'/>";
		}
	}
	//alert(str);
	var view = $('#map')
	view['html'](str);
	map.foreach(function(cell) {
			repaint(cell);
			var c = $('#c' + cell.y + '_' + cell.x);
			c['click'](function() {
				var hero = map.hero;
				var hero_cell = hero.cell;
				var dx = sgn(cell.x - hero_cell.x), dy = sgn(cell.y - hero_cell.y);
				hero.smart_move(dx, dy);
				map.tick();
				panel();
			});
		}
	);

	panel();
}

function animate_throw(x, y, obj, actor, message) {
	var c = map.hero.cell, dx = x - c.x, dy = y - c.y;
	distance = Math.max(Math.abs(dx), Math.abs(dy));
	$('#th')['css']({
		'left' : (c.x + sgn(dx)) * 16,
		'top' : (c.y + sgn(dy)) * 16
	})
	['show']()
	['animate']({
		'left' : x * 16,
		'top' : y * 16
	}, 20 * distance, function() {
		$(this)['hide']();
		log(message);
		if (obj) {
			obj.type |= PICKABLE;
			map.insert_object(obj, x, y);
		}
		if (actor) {
			map.hero.attack(actor, true);
		}
		map.tick();
	});
}

function win(hero) {
	var str = '<p id="mr">PURE WIN!!!<br>Got $' + hero.cash + '<br>Being dead ' + hero.dead + ' times. <br><br><b>Programmed by:</b><br>Vladimir Menshakov<br>&amp;<br>Vladimir Zhuravlev<br>&copy;2010</p>';
	$('#mg')['html'](str)['show']();
}

window['S'] = function() {
	if (map == null)
		$('body')['append']("<div id='p'><h1>" + document.title + "</h1><div id='c'><p id='map'/><button id='s'/><p id='l'/></div><div id='panel'/></div><div id='mg'/>");

	$('#s')['click'](function(){
		this.innerHTML = 'Turn shadows ' + ($('body')['toggleClass']('on')['hasClass']('on') ? 'off' : 'on');
	})['click']();
	if ($['browser']['msie']) {
		$('body')['addClass']('ie');
		$('#s')['click']();
	}

	var w = 40, h = 24; 
	map = new dungeon_map(w, h);
	
	$('#c')['css']('width', (w * 16 + 16));
	
	map.repaint = repaint;
	map.repaint_all = repaint_all;
	map.win = win;

	intro();
	map.generate();
	panel();
	//win(10000);
}
