
// http://redis.io/topics/protocol

var RedisProtocal = exports.RedisProtocal = {
		
	CR: 13,
	LF: 10,
	CRLF: [13, 10], // \r\n
	NOA: 42, // *<number of arguments> CR LF
	NOB: 36, // $<number of bytes of argument 1> CR LF
	
	// replies
	SLR: 43, // With a single line reply the first byte of the reply will be "+"
	ERR: 45, // With an error message the first byte of the reply will be "-"
	INT: 58, // With an integer number the first byte of the reply will be ":"
	BR: 36,  // With bulk reply the first byte of the reply will be "$"
	MBR: 42, // With multi-bulk reply the first byte of the reply will be "*"
	
	OK_REPLY: '+OK\r\n',
	PONG_REPLY: '+PONG\r\n',
	NULL_REPLY: '$-1\r\n',
	ZERO_REPLY: ':0\r\n',
	ONE_REPLY: ':1\r\n',
	
	decode: function(buffer, callback) {
		// "*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n"
		var pos = 0
		  , val = null
		  , state = 'type'
		  , type = null
		  , tmp_length = '';
		var bulks = null
		  , bulk = null;
		while(pos < buffer.length) {
			val = buffer[pos];
//			console.log(String.fromCharCode(val))
			pos++;
			if(state == 'type') {
				type = val;
				if(this.MBR == type) {
					state = 'multi bulk count';
					tmp_length = '';
				} else if(this.BR == type) {
					state = 'bulk length';
					tmp_length = '';
				} else if(this.SLR == type) {
					state = 'single line';
					bulk = new Buffer(buffer.length);
					bulk.end = 0;
				} else if(this.ERR == type) {
					state = 'error line';
					bulk = new Buffer(buffer.length);
					bulk.end = 0;
				} else if(this.INT == type) {
					state = 'integer';
					tmp_length = '';
				} else {
					callback(new Error('Unknow type ' + type));
					return;
				}
			} else if('single line' == state) {
				if(this.CR == val) {
					state = 'final lf';
					bulk = bulk.slice(0, bulk.end).toString();
				} else {
					bulk[bulk.end++] = val;
				}
			} else if('error line' == state) {
				if(this.CR == val) {
					state = 'final lf';
					callback(Error(bulk.slice(0, bulk.end).toString()));
					return;
				} else {
					bulk[bulk.end++] = val;
				}
			} else if('integer' == state) {
				if(this.CR == val) {
					state = 'final lf';
					bulk = parseInt(tmp_length);
				} else {
					tmp_length += String.fromCharCode(val);
				}
			} else if('multi bulk count' == state) {
				if(this.CR == val) {
					state = 'multi bulk count lf';
				} else {
					tmp_length += String.fromCharCode(val);
				}
			} else if('multi bulk count lf' == state) {
				if(this.LF == val) {
					state = 'type';
					bulks = new Array(parseInt(tmp_length));
					bulks.end = 0;
				} else {
					callback(Error("didn't see LF after NL reading multi bulk count"));
					return;
				}
			} else if('bulk length' == state) {
				if(this.CR == val) {
					state = 'bulk length lf';
				} else {
					tmp_length += String.fromCharCode(val);
				}
			} else if('bulk length lf' == state) {
				if(this.LF == val) {
					var length = parseInt(tmp_length);
					if(length == -1) {
						bulks[bulks.end++] = null;
						state = 'final cr';
					} else if(length == 0) {
						bulks[bulks.end++] = '';
						state = 'final cr';
					} else {
						state = 'bulk data';
						bulk = new Buffer(length);
						bulk.end = 0;
					}
				} else {
					callback(new Error("didn't see LF after NL while reading bulk length"));
					return;
				}
			} else if('bulk data' == state) {
				bulk[bulk.end++] = val;
				if(bulk.end == bulk.length) {
					bulks[bulks.end++] = bulk;
					state = 'final cr';
				}
			} else if('final cr' == state) {
				if(this.CR == val) { // \r
	                state = "final lf";
	            } else {
	            	callback(Error("saw " + val + " when expecting final CR"));
	            	return;
	            }
			} else if('final lf' == state) {
				if(this.LF == val) { // \r
					if(bulks && bulks.end == bulks.length) {
						callback(bulks);
					}
	                state = "type";
	            } else {
	            	callback(Error("saw " + val + " when expecting final LR"));
	            	return;
	            }
			}
		}
//		callback(bulks || bulk);
	},
	
	encode: function(bulk) {
		if(bulk == null) {
			return this.NULL_REPLY;
		}
		if(bulk instanceof Error) {
			return '-' + bulk.message + '\r\n';
		}
		if(typeof bulk === 'number') {
			return ':' + bulk + '\r\n';
		}
		if(typeof bulk === 'string') {
			return new Buffer('$' + bulk.length + '\r\n' + bulk + '\r\n');
		}
		if(bulk instanceof Buffer) {
			var s = '$' + bulk.length + '\r\n';
			var new_buffer = new Buffer(bulk.length + s.length + 2);
			new_buffer.write(s);
			bulk.copy(new_buffer, s.length, 0, bulk.length);
			new_buffer.write('\r\n', bulk.length + s.length);
			return new_buffer;
		}
		// MBR
		var bs = [], length = 0, tmp = null;
		tmp = new Buffer('*' + bulk.length + '\r\n');
		bs.push(tmp);
		length += tmp.length;
		for(var i=0; i<bulk.length; i++) {
			var b = bulk[i];
			if(b === null || b === undefined) {
				tmp = new Buffer('$-1\r\n');
				bs.push(tmp);
				length += tmp.length;
			} else if(typeof b == 'number') {
				tmp = new Buffer(':' + Number + '\r\n');
				bs.push(tmp);
				length += tmp.length;
			} else if(typeof b == 'string') {
				tmp = new Buffer('$' + b.length + '\r\n' + b + '\r\n');
				bs.push(tmp);
				length += tmp.length;
			} else if(b instanceof Buffer) {
				var s = '$' + b.length + '\r\n';
				var tmp = new Buffer(s.length + b.length + 2);
				tmp.write(s);
				b.copy(tmp, s.length, 0, b.length);
				tmp.write('\r\n');
				bs.push(tmp);
				length += tmp.length;
			}
		}
		tmp = new Buffer(length);
		var pos = 0;
		for(var i=0; i<bs.length; i++) {
			var b = bs[i];
			b.copy(tmp, pos, 0, b.length);
			pos += b.length;
		}
		return tmp;
	}
};