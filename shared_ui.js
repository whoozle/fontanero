var actions = null;
var objects = null;
var combine = false;
var first_object = null;
var throw_obj = false;

function panel() {
	if (map == null)
		return;
	var hero = map.hero, level = hero.level;

	var html = "<dl><dt id='f'>" + hero.name + " the Fontanero<small>Level: " + hero.level + " (" + hero.levels[level-1] + ")</small></dt><dd>";
	html += "<b>HP:</b> " + hero.hp + " (" + hero.max_hp() +  ")" + 
	(hero.poisoned? " <b id='ps'>[POISONED]</b> ":"") + 
	(hero.blinded? " <b id='bl'>[BLINDED]</b>":"") + 
	(hero.confused? " <b id='cf'>[CONFUSED]</b>":"") + 
	"<br><b>Cash:</b> $" + hero.cash + " / " + hero.level_cap() +"<br>" + 
	"<b>Pipes found:</b> " + map.pipes + "<br><b>Pipes fixed:</b> " + map.fixed; 
	if (throw_obj) {
		html += '<dt>Choose direction:</dt><dd>Press up, down, left or right to throw ' + first_object.name +'</dd>';
		$('#panel')['html'](html);
		return;
	} else if (objects) {
		html += '<dt>Choose item:</dt><dd><ol>';
		for(var i = 0; i < objects.length; ++i) {
			var o = objects[i];
			html += "<li>" + o[0].name + "</li>";
		}
		html += '</ol></dd>';
		$('#panel')['html'](html);
		return;
	} else {
		html += '<dt>You are carrying:</dt><dd>' + hero.inv + '</dd>';
	}

	actions = hero.get_actions(); //MUST BE CALLED FIRST (do auto-pickup and other stuff)
	var objs = hero.cell.objects;
	var mask = 0;
	html += '<dt>You see:</dt><dd>';
	if (objs.length) {
		for(var i = 0; i < objs.length; ++i) {
			var o = objs[i];
			mask |= o.type;
			html += (i? ', ': '') + o.name;
		}
	}
	else {
		html += 'nothing'
	}
	html += "</dd>";
	
	html += '<dt>Actions:</dt><dd id="a"><ul>';
	for(var i = 0; i < actions.length; ++i) {
		html += '<li>' + actions[i].name + "</li>";
	}
	html += '</ul></dd>';
	$('#panel')['html'](html);
}

function on_key(e) {
	var h = map.hero;
	if (map == null || e.metaKey || $("#mg")['is'](":visible") || h.hp <= 0)
		return;
	
	var key = e.which || e.keyCode;
	var key_char = String.fromCharCode(key).toLowerCase();
	key = key_char.charCodeAt(0);
	var used = false, call_tick = true;
	//log("key " + key + "(" + key_char + ")");

	switch(key) {
	case 27:
		used = true;
		combine = false;
		throw_obj = false;
		first_object = null;
		break;
	case 37:
	case 38:
	case 39:
	case 40:
		var dx = [-1, 0, 1, 0][key - 37], dy = [0, -1, 0, 1][key - 37];
		if (h.confused > 0) {
			dx = -dx;
			dy = -dy;
		}
		if (throw_obj) {
			h.throw_obj(first_object, dx, dy);
			call_tick = false;
		} else
			h.move(dx, dy);
		used = true;
		throw_obj = false;
		first_object = null;
		objects = null;
		break;
	default:
		if (objects != null) {
			var i = key - 0x61; //ord('a');
			if (in_range(i, 0, objects.length)) {
				var o = objects[i];
				var a = o[1], obj = o[0];
				if (combine && first_object == null) {
					first_object = obj;
					objects = h.get_objects(a, DRINKABLE);
					call_tick = false;
					used = true;
					break;
				}
				if (a.need_dir) {
					first_object = obj;
					throw_obj = true;
					call_tick = false;
					used = true;
					break;
				}
				a.apply(obj, first_object);
			} 
			used = true;
			objects = null;
		} else if (actions != null) {
			for(var i = 0; i < actions.length; ++i) {
				var a = actions[i];
				if (a.key == key_char) {
					objects = h.get_objects(a);
					combine = a.combine;
					first_object = null;
					switch(objects.length) {
					case 0:
						a.apply(); //auto-action w/o object (like (s)leep)
						objects = null;
						break;
					case 1:
						var obj = objects[0][0];
						if (combine) { //choose even one object
							call_tick = false;
							break;
						}
						if (a.need_dir) {
							first_object = obj;
							throw_obj = true;
							call_tick = false;
							break;
						}
						a.apply(obj);
						objects = null;
						break;
					default:
						call_tick = false;
					}
					actions = null;
					used = true;
					break;
				}
			}
		}
	}
	if (used) {
		e.preventDefault();
		if (call_tick)
			map.tick();
		panel();
	}
}

function intro() {
	log("You've entered the <s>dungeon</s> cellar to fix all broken pipes and vents.");
}

/*
window.onbeforeunload = function (evt) {
	evt = evt || window.event;
	if (evt) {
		evt.returnValue = "Are you sure you want to leave?";
	}
	return message;
}
*/

$(document)['bind']($['browser']['mozilla'] ? 'keypress' : 'keydown', on_key);
