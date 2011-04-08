
var assert = require('assert')
  , protocal = require('../lib/redis_protocal').RedisProtocal;

module.exports = {
	'decode': function() {
//		var s = new Buffer("*12\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n");
//		var bulks = protocal.decode(s);
//		assert.eql(bulks.length, 12);
		var cases = {
			'bulks count': [
			     "*12\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n",
			     function(bulks) {
			    	 assert.eql(bulks.length, 12);
			    	 assert.eql(bulks[0], new Buffer('SET'));
			    	 assert.eql(bulks[1], new Buffer('mykey'));
			    	 assert.eql(bulks[2], new Buffer('myvalue'));
			    	 assert.eql(bulks[11], new Buffer('myvalue'));
			     }
			],
			'single line': ['+OK\r\n', 'OK'],
			'error line': ['-This is Error\r\n', function(error) {
				assert.ok(error instanceof Error);
				assert.eql(error.message, 'This is Error');
			}],
			'integer': [':20110401\r\n', function(val) {
				assert.eql(val, 20110401);
			}],
		};
		for(var k in cases) {
			var test_case = cases[k];
			var bulks = protocal.decode(new Buffer(test_case[0]));
			if(typeof test_case[1] === 'function') {
				test_case[1](bulks);
			} else {
				assert.eql(bulks, test_case[1]);
			}
		}
	},
	'encode': function() {
		var infos = ['redis_version:2.2.2',
		             'uptime_in_seconds:148',
		             'used_cpu_sys:0.01',
		             'used_cpu_user:0.03',
		             'used_memory:768384',
		             'used_memory_rss:1536000',
		             'mem_fragmentation_ratio:2.00',
		             'changes_since_last_save:118',
		             'keyspace_hits:174',
		             'keyspace_misses:37',
		             'allocation_stats:4=56,8=312,16=1498,...',
		             'db0:keys=1240,expires=0'];
		var reply = protocal.encode(infos);
		console.dir(reply.toString());
	}
};