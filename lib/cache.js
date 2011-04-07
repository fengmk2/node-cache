
/**
 * Pure javascript cache module, use aof for persistence.
 * 
 * var cache = require('node-cache');
 * var db = cache.create('./demo.aof', 1);
 * db.load(function() {
 *     console.log('success');
 * });
 * 
 */

var fs = require('fs')
  , path = require('path');

exports.create = function(filepath, flush_seconds) {
	return new Cache(filepath, flush_seconds);
};

var Cache = exports.Cache = function(filepath, flush_seconds) {
	this._cache = {};
	this._appends = [];
	this._filepath = filepath;
	
	this._fd = null;
	this._interval = null;
	this._flushing = false;
	var that = this;
	this._flush_seconds = null;
	if(flush_seconds) {
		this._flush_seconds = flush_seconds * 1000;
	}
};

Cache.prototype = {
	
//	_read: function(fd, buffer) {
//		fs.read(fd, buffer, 0, buffer.length, null, function(err, bytes) {
//			
//		});
//	},	
	
	readfile: function(callback) {
		var that = this;
		fs.readFile(that._filepath, 'utf8', function(err, data) {
			if(err) {
				callback(err);
			} else {
				var values = data.split('\n');
				for(var i=0; i<values.length; i++) {
					if(!values[i]) {
						continue;
					}
					var key_value = JSON.parse(values[i]);
					that._cache[key_value[0]] = key_value[1];
				}
				callback();
			}
		});
//		fs.open(that._filepath, 'r', function(err, fd) {
//			if(err) {
//				callback(err);
//			} else {
//				var size = 50 * 1024 * 1024 * 1024; // 50MB
//				var buffer = new Buffer(size);
//				that._read(fd, buffer, function() {
//					
//				});
//			}
//		});
	},	
	
	load: function(callback) {
		var that = this;
		path.exists(that._filepath, function(exists) {
			if(exists) {
				// load old datas
				that.readfile(function(err) {
					if(err) {
						callback(err);
					} else {
						that.openfile(callback);
					}
				});
			} else {
				that.openfile(callback);
			}
		});
	},
	
	openfile: function(callback) {
		var that = this;
		fs.open(that._filepath, 'a', function(err, fd) {
			that._fd = fd;
			if(that._flush_seconds) {
				// 设置了flush 时间
				that._interval = setInterval(function() {
					that.flush();
				}, that._flush_seconds);
			}
			callback(err);
		});
	},
	
	close: function(sync, callback) {
		if(this._interval) {
			clearInterval(this._interval);
		}
		if(!this._fd) {
			callback && callback();
			return;
		}
		var that = this;
		this.flush(sync, function() {
			if(that._fd) {
				if(sync) {
					fs.closeSync(that._fd);
					that._fd = null;
					callback && callback();
				} else {
					fs.close(that._fd, function() {
						that._fd = null;
//						console.log('fd close', arguments);
						callback && callback();
					});
				}
			}
		});
	},
	
	get: function(key) {
		return this._cache[key.toString()];
	},
	
	set: function(key, value) {
		key = key.toString();
		this._cache[key] = value;
		this._appends.push([key, value]);
	}, 
	
	// 持久化到文件中
	flush: function(sync, callback) {
		var size = 0;
		var that = this;
		if(that._flushing || that._appends.length == 0) {
			callback && callback(size);
			return;
		}
		that._flushing = true;
		var appends = that._appends;
		that._appends = [];
		var values = [];
		for(var i=0; i<appends.length; i++) {
			values.push(JSON.stringify(appends[i]));
		}
		values.push('\n');
		var buffer = new Buffer(values.join('\n'));
		size = buffer.length;
		if(sync) {
			fs.writeSync(that._fd, buffer, 0, size, null);
//			console.log('sync flush ' + size + ' bytes');
			that._flushing = false;
			callback && callback(size);
		} else {
			fs.write(that._fd, buffer, 0, size, null, function() {
//				console.log('async flush ' + size + ' bytes');
				that._flushing = false;
				callback && callback(size);
			});
		}
	}
};