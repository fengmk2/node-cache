
var net = require('net')
  , db = require('./cache')
  , protocal = require('./redis_protocal').RedisProtocal;

var Server = function(tcp_port, http_port) {
	this.db = db.create('data.cache.aof', 1);
	
	this.tcp_port = tcp_port || 6379; // redis is 6379
	var that = this;
	// tcp server
	that.tcp_server = net.createServer(function(socket) {
		socket.on('connect', function() {
			console.log(socket.remoteAddress + ' connect...');
		}).on('data', function(data) {
			console.dir(data.toString());
			protocal.decode(data, function(bulks) {
				if(bulks instanceof Error) {
					socket.write(protocal.encode(bulks));
				} else if(bulks) {
					var cmd = bulks.shift().toString();
//					console.log(cmd)
					if(that[cmd]) {
						var value = that[cmd].apply(that, bulks);
						if(cmd == 'quit') {
							try {
								socket.end(value);
								console.log(socket.remoteAddress + ' quit.');
							} catch(err) {
								console.log(socket.remoteAddress + ' write end: ' + err);
							}
						} else {
							try {
								socket.write(value);
							} catch(err) {
								console.log(socket.remoteAddress + ' write error: ' + err);
							}
						}
					} else {
						socket.write(protocal.encode(new Error('err cmd: ' + cmd)));
					}
				}
			});
		}).on('error', function(err) {
			console.log(socket.remoteAddress + ' error: ' + err);
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

Server.prototype.info = function(socket, args) {
	var infos = ['redis_version:2.2.2',
	             'node_cache_version:0.1',
	             'uptime_in_seconds:148',
	             'used_cpu_sys:0.01',
	             'used_cpu_user:0.03',
	             'used_memory:768384',
	             'used_memory_rss:1536000',
	             'mem_fragmentation_ratio:2.00',
	             'changes_since_last_save:118',
	             'keyspace_hits:174',
	             'keyspace_misses:37',
	             'db0:keys=' + this.db.key_count + ',expires=0'].join('\r\n');
	return protocal.encode(infos);
};

Server.prototype.quit = function() {
	return protocal.OK_REPLY;
};

Server.prototype.ping = function() {
	return protocal.PONG_REPLY;
};

Server.prototype.get = function(key) {
	return protocal.encode(this.db.get(key));
};

Server.prototype.set = function(key, value) {
	this.db.set(key, value);
//	console.log(this.db._cache)
	return protocal.OK_REPLY;
};

Server.prototype.del = function() {
	var count = this.db.del.apply(this.db, arguments);
//	console.log(this.db._cache)
	return protocal.encode(count);
};

Server.prototype.exists = function(key) {
	return this.db.exists(key) ? protocal.ONE_REPLY : protocal.ZERO_REPLY;
};

// http://redis.io/topics/protocol

exports.create = function(tcp_port, http_port) {
	return new Server(tcp_port, http_port);
};