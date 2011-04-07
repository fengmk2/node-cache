
var net = require('net')
  , db = require('./cache');

var Server = function(tcp_port, http_port) {
	this.db = db.create('data.cache.aof', 1);
	
	this.tcp_port = tcp_port;
	var that = this;
	// tcp server
	that.tcp_server = net.createServer(function(socket) {
		socket.on('connect', function() {
			console.log('Connect from ' + socket.remoteAddress);
			socket.write('success\n');	
		}).on('data', function(data) {
			data = data.toString();
			data = data.substring(0, data.length - 1);
			var cmds = data.split(' ');
			var method = 'cmd_' + cmds.shift();
			if(that[method]) {
				var value = that[method].apply(that, cmds) || 'null';
				socket.write(value + '\n');
			} else {
				socket.write('err cmd: ' + data + '\n');	
			}
		});
	});
	
};

Server.prototype.start = function() {
	var that = this;
	that.db.load(function() {
		that.tcp_server.listen(that.tcp_port);
		console.log('tcp server listen on ' + that.tcp_port);
	});
};

Server.prototype.cmd_get = function(key) {
	return this.db.get(key);
};

Server.prototype.cmd_set = function(key, value) {
	this.db.set(key, value);
	return 1;
};

exports.create = function(tcp_port, http_port) {
	return new Server(tcp_port, http_port);
};