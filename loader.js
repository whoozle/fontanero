function loadpng(filename, callback) {
	var canvas = $("<canvas>")
		['attr']({width: WIDTH, height: HEIGHT})
		//['css']({'width': WIDTH + 'px', 'height': HEIGHT + 'px'})
		['get'](0), ctx;
	if (!canvas.getContext || !(ctx = canvas.getContext("2d")) || !ctx.getImageData) {
		alert('No canvas');
		return;
	}
	
	$('body')['append'](
	$('<img>')
		['css']({position: 'absolute', left: -WIDTH})
		['load'](function() {
			var self = this;
			var w = WIDTH;
			var h = HEIGHT;
			ctx.drawImage(self, 0, 0);
			var image_data = ctx.getImageData(0, 0, w, h).data;
			var str_data = "";
			var len = image_data.length;
			for (var i = 0; i < len; i += 4) {
				var b = image_data[i];
				str_data += String.fromCharCode(b > 0? b + 31: 10);
			};
			callback(str_data);
			$(self)['remove']();
		})
		['attr']('src', filename)
	); //body.append
}

function start(code) {
	eval(code.replace(/@@/g, '.length').replace(/@/g, 'function').replace(/\`/g, 'this.'));
	S();
}
