/** @const */ CELL_VOID = 0;
/** @const */ CELL_FLOOR = 1;
/** @const */ CELL_WALL = 2;
/** @const */ CELL_ENTRANCE = 3;
/** @const */ CELL_EXIT = 4;

/** @const */ PICKABLE = 1;
/** @const */ EDIBLE = 2;
/** @const */ READABLE = 4;
/** @const */ DRINKABLE = 8;
/** @const */ WEARABLE = 16;
/** @const */ FIXABLE = 32;

var book_list = [
	["book of healing", READABLE | PICKABLE], 
	["book of vision", READABLE | PICKABLE], 
	["book of cure", READABLE | PICKABLE],
	["book of genocide", READABLE | PICKABLE]
];

var food_list = [
	["apple", PICKABLE | EDIBLE], 
	["bread", PICKABLE | EDIBLE], 
	["meat", PICKABLE | EDIBLE], 
	["egg", PICKABLE | EDIBLE], 
	["spaghetti", PICKABLE | EDIBLE], 
	["jelly", PICKABLE | EDIBLE], 

	["gold", PICKABLE], 

	["strange potion", DRINKABLE | PICKABLE],
	["soda", DRINKABLE | PICKABLE],
	["milk", DRINKABLE | PICKABLE],
	["water", DRINKABLE | PICKABLE],
	["tea", DRINKABLE | PICKABLE]
];

var monster_list = [
	["spider"],
	["wasp"],
	["rat", "bat", "snake"],
	["poisonous bat", "vampire bat", "poisonous snake"], 
	["rabid mole"], 
	["mutant", "zombie"],
	["ghost"]
];

/*==global==*/map = null;

var floor = Math.floor, random = Math.random, abs = Math.abs;

function hash(str) {
	return str.charCodeAt(0) ^ (str.charCodeAt(1) << 1) ^ str.length;
}

function in_range(x, a, b) {
	return x >= a && x < b;
}

function rand(min, max) {
	if (min instanceof Array)
		return min[floor(random() * min.length)];
	return floor(min + random() * (max - min));
}

function roll(probability) {
	return random() < probability;
}

function sgn(v) {
	return (v > 0)? 1: ((v < 0)? -1: 0);
}

function log(str) {
	$("#l")['append']("&gt; " + str + "<br>")['scrollTop'](1000000);
}

function capitalize(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

var repaint_objects = function() {
	map.foreach(function(cell) {
		if (cell.visited && (cell.actor || cell.objects.length))
			map.repaint(cell);
	});
}

/** @constructor */

function movable() {
	this.cell = null;
	this.hp = rand(this.level * 5, this.level * 10);
	this.boss = false;
	this.poison_chance = 0;
	this.blind_chance = 0;

	this.drop_loot = function() {
		var c = this.cell;
		c.actor = null;
		if (this.boss || roll(0.5)) {
			c.objects.push(new dungeon_object("gold"));
		}
		c.blood = true;
	}
	this.damage = function(obj, hit) {
		//log("damaged for " + hit);
		obj.hp -= hit;
		if (obj.hp <= 0) {
			log(capitalize(this.blinded? "something": obj.name) + " dies.");
			if (obj.boss) {
				map.boss_killed = true;
				log("You killed the monster, return to the surface!");
			}
			
			if (obj instanceof hero) {
				var restart = confirm("You have died, continue?");
				if (restart) {
					obj.hp = rand(10, 20);
					obj.poisoned = 0;
					++obj.dead;
					return false;
				}
				else {
					S();
					return false;
				}
			}
			obj.drop_loot();
			map.repaint(obj.cell);
			return true;
		}
		if (roll(this.poison_chance)) {
			log(obj.name + " has been poisoned!");
			obj.poisoned = rand(3, 10);
		}
		if (roll(this.blind_chance)) {
			log(obj.name + " has been blinded!");
			obj.blinded = rand(20, 30);
			repaint_objects();
		}
		return false;
	}
	this.attack = function(obj, throwing) {
		var l = this.level;
		var my_hit = this instanceof hero;
		if (my_hit && !throwing)
			++l; //little hero's improvement
		if (!my_hit && !(obj instanceof hero))
			return false; //skip monsters attacks
		var hit = (!obj.boss || throwing)? rand(5 * l, 7 * l): 1;
		var blinded = this.blinded;
		var something = "something";
		log(
			(my_hit? 
				"You hit " + (blinded? something: obj.name): 
				capitalize(blinded? something: this.name) + " hits " + obj.name
			) + 
			" for " + hit + " hit points.");
		return this.damage(obj, hit);
	}
	
	this.move = function(dx, dy) {
		if (!(dx | dy) || (dx && dy))
			return false;
		
		var cell = this.cell;
		var x = cell.x + dx, y = cell.y + dy;
		if (x < 0 || x >= map.width || y < 0 || y >= map.height)
			return false;

		var new_cell = map.cells[y][x];
		if (new_cell.type == CELL_VOID || new_cell.type == CELL_WALL)
			return false;

		if (new_cell.actor != null) {
			this.attack(new_cell.actor);
			return true;
		}
		
		cell.actor = null;
		new_cell.actor = this;
		this.cell = new_cell;
		map.repaint(cell);
		map.repaint(new_cell);
		return true;
	}

	this.smart_move = function(dx, dy) {
		var dx2 = dx * dx, dy2 = dy * dy;
		var prefer_x = dx2 > dy2;
		if (!this.move(dx, dy)) {
			if (prefer_x)
				this.move(dx, 0) || this.move(0, dy);
			else
				this.move(0, dy) || this.move(dx, 0);
		}
	}
}

//basic actions

/** @constructor */

function hero_action(hero, key, name, mask, func) {
	this.hero = hero;
	this.key = key;
	this.name = name;
	this.mask = mask;
	this.func = func;
	this.combine = false;
	this.need_dir = false;

	this.apply = function(obj, obj2) {
		this.func.call(this.hero, obj, obj2);
	}
}

/** @constructor */

function inventory() {
	this.objects = [];
	
	this.add = function(obj, silent) {
		obj.type &= ~PICKABLE;
		if (obj.cell != null) {
			obj.cell.unlink(obj);
			obj.cell = null;
		}
		if (!silent)
			log("You picked up " + obj.name + ".");
		this.objects.push(obj);
	}
	
	this.find = function(name) {
		var objs = this.objects;
		for(var i = 0; i < objs.length; ++i) {
			var o = objs[i];
			if (o.name == name) 
				return o;
		}
		return null;
	}

	this.remove = function(obj) {
		var objs = this.objects, i = objs.indexOf(obj);
		if (i >= 0)
			objs.splice(i, 1);
	}
	
	this.get_actions = function() {
		var mask = 0;
		var objs = this.objects;
		for(var i = 0; i < objs.length; ++i) {
			mask |= objs[i].type;
		}
		return mask;
	}
	
	this.toString = function() {
		var c = {};
		var l = this.objects;
		if (!l.length)
			return "nothing";
		for(var i = 0; i < l.length; ++i) {
			var name = l[i].name;
			if (!c[name])
				c[name] = 1;
			else
				++c[name];
		}
		var r = "";
		for(var i in c) {
			var n = c[i];
			r += i;
			if (n > 1)
				r += "*" + n;
			r += ", ";
		}
		r = r.slice(0, -2);
		return r;
	}
}

/** @constructor */

function dungeon_monster(name, level) {
	this.name = name;
	this.level = level;
	
	movable.call(this);
	
	this.tick = function() {
		var hero = map.hero;
		var hero_cell = hero.cell, cell = this.cell;
		var dx = hero_cell.x - cell.x, dy = hero_cell.y - cell.y;
		var d = floor(Math.sqrt(dx * dx + dy * dy));
		var boss = this.boss;
		//now boss always moves randomly
		if (boss || d > 6) { //max distance
			dx = rand(-1, 2);
			dy = rand(-1, 2);
		} else {
			dx = sgn(dx);
			dy = sgn(dy);
		}
		this.smart_move(dx, dy);
	}
}

/** @constructor */

function hero() {
	this.name = "Mario";
	this.level = 1;
	this.MAX_LEVEL = 7;
	movable.call(this);
	this.cash = 0;
	this.inv = new inventory();
	this.poisoned = 0;
	this.blinded = 0;
	this.confused = 0;
	this.dead = 0;
	this.levels = ["Beggar", "Poor", "Labourer", "Professional", "Prosperous", "Millionaire", "Billionaire"];
	
	this.max_hp = function() {
		return 100 + this.level * 50;
	}
	
	this.level_cap = function() {
		return Math.pow(10, this.level + 1);
	}

	this.hp = this.max_hp();

	this.unlink = function(obj) {
		if (obj.cell != null)
			obj.cell.unlink(obj);
		else 
			this.inv.remove(obj);
	}
	
	this.pickup = function(obj) {
		this.inv.add(obj);
	}
	
	this.read = function(obj) {
		log("You read " + obj.name + ".");
		this.unlink(obj);
		var name = obj.name;
		if (name.indexOf("healing") >= 0) {
			this.hp = this.max_hp();
			log("You feel fully restored.");
		} else if (name.indexOf("vision") >= 0) {
			log("You feel somewhat enlightened.");
			map.foreach(function(cell) {
					if (!cell.visited) {
						cell.visited = true;
						map.repaint(cell);
					}
				});
		} else if (name.indexOf("cure") >= 0) {
			this.poisoned = 0;
			this.confused = 0;
			if (this.blinded) {
				this.blinded = 0;
				repaint_objects();
			}
		} else if (name.indexOf("genocide") >= 0) {
			map.foreach(function(cell) {
					if (cell.actor != null && cell.actor != map.hero && !cell.actor.boss) {
						cell.actor.drop_loot();
						cell.actor = null;
						map.repaint(cell);
					}
				});
		}
	}
	
	this.heal = function(n) {
		var hp = this.hp, hp0 = hp;
		hp += n;
		var max_hp = this.max_hp();
		if (hp > max_hp) {
			//add satiated effect? 
			hp = max_hp;
		}
		if (hp != hp0) {
			log("You restored " + (hp - hp0) + " health points.");
		}
		this.hp = hp;
	}

	this.eat = function(obj) {
		this.unlink(obj);
		var msg = ["Umph, it's rotten!", "Tastes great!", "Smells awful.", "You feel satiated."];
		log(rand(msg));
		var max_hp = this.max_hp();
		this.heal(rand(1, max_hp / 10));
	}
	
	this.throw_obj = function(obj, dx, dy) {
		this.unlink(obj);
		var text = "You threw " + obj.name + " and hit ";
		var cell = map.hero.cell;
		var x = cell.x, y = cell.y;
		for(;;) {
			cell = map.cells[y + dy][x + dx];
			if (cell.type == CELL_WALL) {
				text += "the wall";
				break;
			}
			if (cell.actor) {
				//hit something
				text += cell.actor.name;
				obj = null;
				break;
			}
			x += dx; y += dy;
		}
		animate_throw(x, y, obj, cell.actor, text + '.');
	}

	this.combine = function(obj1, obj2) {
		var obj = null;
		this.unlink(obj1);
		this.unlink(obj2);
		var r = (hash(obj1.name) + hash(obj2.name)) & 0x0f;
		var text = "got nothing.";
		if (in_range(r, 0, 4)) { //0, 1, 2, 3
			var book = book_list[r];
			obj = new dungeon_object(book[0], book[1]);
			text = "got " + obj.name + ".";
		} else if (in_range(r, 4, 8)) { //4, 5, 6, 7
			this.confused = rand(30, 40);
			text = "felt dizzy.";
		} else if (in_range(r, 8, 12)) {//8,9,10,11
			if (map.ambushed())
				text = "were attacked from ambush!";
		}
		//12,13,14,15 - nothing
		
		log("You tried to combine " + obj1.name + " and " + obj2.name + " and " + text);
		if (obj)
			this.inv.add(obj, true);
	}
	
	this.drink = function(obj) {
		this.unlink(obj);
		log("Refreshing!");
		var max_hp = this.max_hp();
		this.heal(rand(max_hp / 5, max_hp / 3));
		if (roll(0.05)) {
			log("You feel dizzy.");
			this.confused = rand(30, 40);
		}
	}
	
	this.search = function() {
		map.insert_random_object(food_list);
		if (roll(0.1))
			map.insert_random_monsters(1);
		if (roll(0.05))
			map.insert_random_object(book_list);
	}
	
	this.fix = function(obj) {
		obj.type &= ~FIXABLE;
		obj.name = "fixed pipes";
		var size = floor(3 * this.level / this.MAX_LEVEL + 3);
		run_mini_game(size, this.level_cap(), 10 - size);
	}
	this.add_cash = function(g) {
		var cap = this.level_cap();
		log("You got $" + g + ".");
		this.cash += g;
		if (this.level < this.MAX_LEVEL && this.cash >= cap) {
			++this.level;
			log(rand(["Occasionally you feel stronger!", "You gained next level!"]));
			this.cash -= cap;
		}
	}
	
	this.cheat = function() { this.add_cash(this.level_cap()); this.hp = this.max_hp(); } //keep this in one-line (grepped out by build.sh)
	
	this.get_actions = function() {
		var cell = this.cell;
		var objs = cell.objects;
		var mask = 0;
		for(var i = 0; i < objs.length; ) {
			var o = objs[i];
			switch(o.name) {
			case "gold": {
					objs.splice(i, 1);
					var cap = this.level_cap();
					var g = rand(cap / 10, cap / 5);
					this.add_cash(g);
					map.repaint(cell);
					continue;
				}
			case "key": {
					this.inv.add(o, true);
					objs.splice(i, 1);
					log("You picked up key to the next level.");
					map.repaint(cell);
					continue;
				}
			default:
				mask |= o.type;
				++i;
			}
		}
		mask |= this.inv.get_actions();
		var a = [];
		if (mask & PICKABLE)
			a.push(new hero_action(this, 'p', '<em>P</em>ickup', PICKABLE, this.pickup));
		if (mask & EDIBLE) {
			a.push(new hero_action(this, 'e', '<em>E</em>at', EDIBLE, this.eat));
			var t = new hero_action(this, 't', '<em>T</em>hrow', EDIBLE, this.throw_obj)
			t.need_dir = true;
			a.push(t);
			if (mask & DRINKABLE) {
				var ha = new hero_action(this, 'a', '<em>A</em>lchemy', EDIBLE | DRINKABLE, this.combine);
				ha.combine = true;
				a.push(ha);
			}
		}
		if (mask & READABLE)
			a.push(new hero_action(this, 'r', '<em>R</em>ead', READABLE, this.read));
		if (mask & DRINKABLE)
			a.push(new hero_action(this, 'd', '<em>D</em>rink', DRINKABLE, this.drink));
		if (mask & FIXABLE)
			a.push(new hero_action(this, 'f', '<em>F</em>ix', FIXABLE, this.fix));
		
		a.push(new hero_action(this, 's', '<em>S</em>earch', 0, this.search));
		a.push(new hero_action(this, 'h', 'C<em>h</em>eat', 0, this.cheat));
		
		var ct = cell.type;
		if (ct == CELL_EXIT || ct == CELL_ENTRANCE)
			a.push(new hero_action(this, 'x', 'E<em>x</em>it', 0, this.exit));
		return a;
	}
	
	this.get_objects = function(action, filter) {
		var r = [];
		var objs = this.cell.objects.concat(this.inv.objects);
		var mask = 0;
		if (!filter)
			filter = EDIBLE;
		for(var i = 0; i < objs.length; ++i) {
			var o = objs[i];
			if (action.combine? filter & o.type: action.mask & o.type)
				r.push([o, action]);
		}
		return r;
	}
	
	this.exit = function() {
		if (this.cell.type == CELL_ENTRANCE) {
			map.up();
		} else
			map.down();
	}
	
	this.tick = function() {
		if (this.poisoned > 0) {
			log(rand(["You are slowly dying.", "You feel sick."]));
			this.cell.blood = true;
			var hp = this.max_hp();
			this.damage(this, rand(hp / 20, hp / 10));
			--this.poisoned;
		}
		if (this.blinded > 0) {
			--this.blinded;
			if (this.blinded <= 0)
				repaint_objects();
		}
		if (this.confused > 0)
			--this.confused;
	}
}

/** @constructor */

function dungeon_object(name, type) {
	this.type = type;
	this.name = name;
}

/** @constructor */

function map_cell(type) {
	this.type = type;
	this.objects = [];
	this.actor = null;
	this.visited = false;
	this.blood = false;

	this.unlink = function(obj) {
		var objs = this.objects, i = objs.indexOf(obj);
		if (i >= 0)
			objs.splice(i, 1);
		map.repaint(this);
	}
}

/** @constructor */

function dungeon_room(l, t, r, b) {
	this.left = l;
	this.right = r;
	this.top = t;
	this.bottom = b;
	this.width = r - l;
	this.height = b - t;
	
	this.intersects = function(room) {
		//disallowing side-by-side walls
		return this.left <= room.right && this.right >= room.left && this.top <= room.bottom && this.bottom >= room.top;
	}
	this.manhattan = function(room) {
		var x1 = (this.left + this.right) >> 1;
		var x2 = (room.left + room.right) >> 1;
		var y1 = (this.top + this.bottom) >> 1;
		var y2 = (room.top + room.bottom) >> 1;
		return abs(x1 - x2) + abs(y1 - y2);
	}
	
	this.render = function(cells) {
		var l = this.left, r = this.right; t = this.top, b = this.bottom;
		for(var y = t; y < b; ++y) {
			for(var x = l; x < r; ++x) {
				var cell = cells[y][x];
				if (cell.type != CELL_VOID)
					continue;
				cell.type = (x == l || x == r - 1 || y == t || y == b - 1)? CELL_WALL: CELL_FLOOR;
				cell.room = [l, t, r, b];
			}
		}
	}
}


/** @constructor */

function dungeon_map(width, height) {
	this.width = width;
	this.height = height;
	this.cells = [];
	this.objects = [];
	this.repaint = null;
	this.repaint_all = null;
	this.levels = [];
	this.level = 0;
	this.hero = new hero();
	this.pipes = 0;
	this.fixed = 0;
	this.boss_killed = false;
	
	this.patch = function(x, y, type) {
		if (in_range(x, 0, this.width) && in_range(y, 0, this.height)) {
			var cell = this.cells[y][x];
			if (cell.type == CELL_VOID) {
				cell.type = type;
				return true;
			}
		}
		return false;
	}

	this.patch_random = function(room, type) {
		while(true) {
			var x = rand(room.left + 1, room.right - 1), y = rand(room.top + 1, room.bottom - 1);
			var cell = this.cells[y][x];
			if (cell.type == CELL_FLOOR) {
				cell.type = type;
				return cell;
			}
		}
	}
	
	this.connect = function(room1, room2) {
		var x = (room1.left + room1.right) >> 1;
		var y = (room1.top + room1.bottom) >> 1;
		var x2 = (room2.left + room2.right) >> 1;
		var y2 = (room2.top + room2.bottom) >> 1;
		while(x != x2 || y != y2) {
			var rx = abs(x - x2), ry = abs(y - y2);
			var dx = rx? (x2 - x) / rx: 0, dy = ry? (y2 - y) / ry: 0;
			var t = random();
			if (t < 0.3)
				dx = 0;
			else if (t > 0.7)
				dy = 0;

			if (dx != 0 && dy != 0) {
				if (rx >= ry)
					dy = 0;
				else
					dx = 0;
			}

			var cell = this.cells[y][x];
			switch(cell.type) {
			case CELL_VOID:
			case CELL_WALL:
				cell.type = CELL_FLOOR;
				break;
			}
			for(var wy = -1; wy <= 1; ++wy)
				for(var wx = -1; wx <= 1; ++wx) {
					if (wx | wy)
						this.patch(x + wx, y + wy, CELL_WALL);
				}
			
			x += dx;
			y += dy;
		}
	}
	
	this.insert_object = function(object, x, y) {
		var cell = this.cells[y][x];
		object.cell = cell;
		cell.objects.push(object);
		this.repaint(cell);
	}

	this.insert_actor = function(actor, cell) {
		actor.cell = cell;
		cell.actor = actor;
	}
	
	this.insert_random_object = function(objs) {
		var x = rand(0, this.width), y = rand(0, this.height);
		if (this.cells[y][x].type != CELL_FLOOR)
			return;
			
		var o = rand(objs);
		var e = new dungeon_object(o[0], o[1]);
		this.insert_object(e, x, y);
	}
	
	this.generate = function() {
		var MAX_SIZE = 0.3;
		var MIN_SIZE = 5; //with walls around
		var MAX_ASPECT = 1.75;
		var MIN_ASPECT = 1 / MAX_ASPECT;
		var MAX_ROOMS = 10;
		var MAX_ROOM_ATTEMPTS = 5;
		var rooms = [];

		var width = this.width, height = this.height;
		
		this.cells = [];
		var cells = this.cells;
		for(var y = 0; y < height; ++y) {
			cells[y] = [];
			var row = cells[y];
			for(var x = 0; x < width; ++x) {
				row.push(new map_cell(CELL_VOID));
				var cell = row[x];
				cell.x = x;
				cell.y = y;
			}
		}
		
		var hero = this.hero;
		if (hero.level == hero.MAX_LEVEL) {
			//final boss
			var room = new dungeon_room(1, 1, width - 2, height - 2);
			room.render(cells);
			var enter_cell = cells[height >> 1][width >> 1];
			enter_cell.type = CELL_ENTRANCE;
			for(var i = 0; i < width * height / 4; ++i) {
				cells[rand(1, height)][rand(1, width)].blood = true; //dont care about bounds anyway
			}
			this.levels[this.level] = cells;
			this.insert_actor(hero, enter_cell);
			var rabbit = new dungeon_monster("Killer Rabbit of Caerbannog", 25);
			rabbit.boss = true;
			this.insert_actor(rabbit, this.cells[height / 2][width / 2 + 7]);
			log(" Follow!  But! follow only if ye be men of valor, " + 
				"for the entrance to this cave is guarded by a creature so foul, " + 
				"so cruel that no man yet has fought with it and lived!  " + 
				"Bones of four fifty men lie strewn about its lair. " + 
				"So, brave " + hero.name + ", if you do doubt your courage or" +
				"your strength, come no further, for death awaits you " + 
				"all with nasty big pointy teeth.");

			this.update_view();
			this.repaint_all();
			return;
		}

		for(var i = 0; i < MAX_ROOMS * MAX_ROOM_ATTEMPTS; ++i) {
			var w = rand(MIN_SIZE, (this.width - MIN_SIZE - 2) * MAX_SIZE);
			var aspect = MIN_ASPECT + random() * (MAX_ASPECT - MIN_ASPECT);
			var h = (w * aspect) | 0;
			var x = rand(0, width - w);
			var y = rand(0, height - h);
			if (x + w >= width || y + h >= height || w < MIN_SIZE || h < MIN_SIZE)
				continue;
			var room = new dungeon_room(x, y, x + w, y + h);
			var j;
			for(j = 0; j < rooms.length; ++j) {
				if (room.intersects(rooms[j]))
					break;
			}
			if (j == rooms.length) {
				room.id = rooms.length;
				rooms.push(room);
				room.render(cells);
			}
			if (rooms.length >= MAX_ROOMS)
				break;
		}
		var enter_id = rand(0, rooms.length);
		var exit_id = enter_id;
		while(enter_id == exit_id) {
			exit_id = rand(0, rooms.length);
		}
		var enter_cell = this.patch_random(rooms[enter_id], CELL_ENTRANCE);
		var exit_cell = this.patch_random(rooms[exit_id], CELL_EXIT);
		
		for(var i = 0; i < rooms.length; ++i) {
			var room = rooms[i];
			room.distances = [];
			room.connected = [];
			for(var j = 0; j < rooms.length; ++j) {
				room.distances.push((i != j)? room.manhattan(rooms[j]): 0);
			}
		}
		for(var i = 0; i < rooms.length - 1; ++i) {
			var room = rooms[i];
			var d = room.distances.slice();
			d.sort();
			var m = d[floor(Math.sqrt(d.length))];
			if (rooms.length <= 4)
				m = d[d.length - 1];
			
			//alert(m);
			for(var j = i + 1; j < rooms.length; ++j) {
				if (room.distances[j] <= m) {
					room.connected.push(j);
					rooms[j].connected.push(i);
					this.connect(room, rooms[j]);
				}
			}
		}
		
		var visited = Array();
		var check = [enter_id];
		var connected = [];
		while(true) {
			while(check.length) {
				i = check.pop();
				if (connected.indexOf(i) < 0)
					connected.push(i);
				
				var room = rooms[i];
				for(var j = 0; j < room.connected.length; ++j) {
					var v = room.connected[j];
					if (connected.indexOf(v) < 0) {
						check.push(v);
						connected.push(v);
					}
				}
			}
			if (connected.length < rooms.length) {
				var closest_room1 = null, closest_room2 = null, closest_room_dist = 0;
				for(var i = 0; i < rooms.length; ++i) {
					if (connected.indexOf(i) < 0) //skip connected nodes
						continue;
					var room1 = rooms[i];
					for(var j = 0; j < rooms.length; ++j) {
						if (connected.indexOf(j) < 0) {
							var room2 = rooms[j];
							if (closest_room1 == null || room1.manhattan(room2) < closest_room_dist) {
								closest_room1 = room1;
								closest_room2 = room2;
								closest_room_dist = room1.manhattan(room2);
							}
						}
					}
				}
				if (closest_room1 == null) {
					alert("closest_room1 == null");
					break;
				}
				//alert("connecting " + closest_room1.id + " and " + closest_room2.id);
				closest_room1.connected.push(closest_room2.id);
				closest_room2.connected.push(closest_room1.id);
				check.push(closest_room1.id);
				check.push(closest_room2.id);
				this.connect(closest_room1, closest_room2);
			} else
				break;
		}
		//generating objects here
		
		this.insert_actor(hero, enter_cell);
		this.levels[this.level] = cells;
		this.repaint_all();
		this.update_view();
		
		while(true) {
			var x = rand(0, width), y = rand(0, height);
			if (cells[y][x].type != CELL_FLOOR)
				continue;
			var o = new dungeon_object("key", PICKABLE);
			this.insert_object(o, x, y);
			break;
		}

		if (roll(0.3)) {
			while(true) {
				var x = rand(0, width), y = rand(0, height);
				if (cells[y][x].type != CELL_FLOOR)
					continue;
				var o = new dungeon_object("pipes", FIXABLE);
				this.insert_object(o, x, y);
				++this.pipes;
				break;
			}
			log("Your senses tell you about broken pipe on this floor!");
		}

		for(var i = 0; i < rooms.length * 5; ++i)
			this.insert_random_object(food_list);
		this.insert_random_object(book_list);
		this.insert_random_monsters(rooms.length * 5);
	}
	
	this.ambushed = function() {
		var hero_cell = this.hero.cell;
		var cells = []
		for(var dy = -1; dy <= 1; ++dy)
			for(var dx = -1; dx <= 1; ++dx) {
				if (dx | dy) {
					var cell = this.cells[hero_cell.y + dy][hero_cell.x + dx];
					if (cell.type == CELL_FLOOR && !cell.actor)
						cells.push(cell);
				}
			}
		if (cells.length) {
			var cell = rand(cells);
			this.insert_actor(this.generate_monster(), cell);
			this.repaint(cell);
			return true;
		}
		return false;
	}
	
	this.generate_monster = function() {
		var hero = this.hero, monster_list_length = monster_list.length;
		var level = 1 + floor(monster_list_length * (hero.level - 1) / hero.MAX_LEVEL);
		if (level > 3 && level < monster_list_length) //a bit harder
			++level;
		var monsters = monster_list.slice(0, level);
		var monsters_len = monsters.length;
		var m_level = rand(monsters_len > 3? monsters_len - 3: 0, monsters_len);
		//log("monster level: " + level + " of " + monster_list.length + "-&gt;" + m_level);
		var o = rand(monsters[m_level]);
		var m = new dungeon_monster(o, m_level + 1);
		if (o.indexOf("poison") >= 0)
			m.poison_chance = 0.2;
		if (o == "ghost" || o == "mutant" || o == "wasp")
			m.blind_chance = 0.3;
		/*
		if (o == "spider") {
			m.blind_chance = 1;
			m.poison_chance = 1;
		}
		*/
		return m;
	}
	
	this.insert_random_monsters = function(n) {
		//log("spawning " + n + "monsters");
		for(var i = 0; i < n; ++i) {
			var x = rand(0, this.width), y = rand(0, this.height);
			var c = this.cells[y][x];
			if (c.type == CELL_FLOOR && !c.actor) {
				this.insert_actor(this.generate_monster(), c);
				this.repaint(c);
			}
		}
	}

	this.init_hero = function(cell_type) {
		this.foreach(function(cell) {
				if (cell.type == cell_type) {
					map.hero.cell = cell;
				}
			});
	}
	
	this.up = function() {
		var l = this.level, levels = this.levels;
		if (l == 0) {
			//add final here!
			if (this.boss_killed && this.fixed >= this.pipes)
				this.win(this.hero);
			else
				log("You must fix all pipes(and probably kill someone), until then there's no way out!");
			return;
		}
		log("you climbed up the stairs to the level " + l + ".");
		this.cells = levels[--l];
		this.level = l;
		this.init_hero(CELL_EXIT);
		this.insert_random_monsters(5);
		this.repaint_all();
	}
	
	
	this.down = function() {
		var l = this.level + 1, levels = this.levels;
		var hero = this.hero; //every new level requires a key to unlock it.
		var key = hero.inv.find("key");

		if (l >= levels.length && key == null) {
			log("This door is locked. Find the key to unlock it.");
			return;
		}
		
		this.level = l;
		log("you stepped down the stairs to the level " + (l + 1) + ".");
	
		if (l >= levels.length) {
			hero.inv.remove(key);
			this.generate();
		} else {
			this.cells = levels[l];
			this.init_hero(CELL_ENTRANCE);
			this.repaint_all();
			this.insert_random_monsters(5);
		}
	}
	
	this.view_line = function(x, y, dx, dy) {
		if (!(dx | dy))
			return;
		var w = this.width, h = this.height;
		//log("trying view " + x + ", " + y + ", " + dx + ", " + dy);
		while(in_range(x, 0, w) && in_range(y, 0, h)) {
			var c = this.cells[y][x];
			if (!c.visited) {
				c.visited = true;
				this.repaint(c);
			}
			if (c.type == CELL_WALL)
				break;
			x += dx; y += dy;
		}
	}
	this.update_view = function() {
		var w = this.width, h = this.height;
		var hero = this.hero;
		var cell = hero.cell;
		if (cell.room) {
			//entering the room
			var room = cell.room;
			for(var y = room[1]; y < room[3]; ++y) {
				for(var x = room[0]; x < room[2]; ++x) {
					var c = this.cells[y][x];
					if (!c.visited) {
						c.visited = true;
						this.repaint(c);
					}
				}
			}
		}
		for(var y = -1; y <= 1; ++y)
			for(var x = -1; x <= 1; ++x)
				this.view_line(hero.cell.x, hero.cell.y, x, y);
	}
	
	this.tick = function() {
		this.update_view();
		var m = [];
		this.foreach(function(cell) {
				var a = cell.actor;
				if (a != null)
					m.push(a);
			});
		for (var i = 0; i < m.length; ++i)
			m[i].tick();
	}
	
	this.foreach = function(func) {
		for(var y = 0; y < this.height; ++y) 
			for(var x = 0; x < this.width; ++x)
				func(this.cells[y][x]);
	}
}

document.title = "Fontanero. 10k Adventure for Gold and Glory. v3";
