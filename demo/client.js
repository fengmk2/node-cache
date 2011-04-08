var redis = require("redis"),
	assert = require('assert'),
    client = redis.createClient(9999, 's8.hk');

//client.on("error", function (err) {
//    console.log("Redis connection error to " + client.host + ":" + client.port + " - " + err);
//});

function loop() {
	client.set(123, '晕123', function(err, s) {
		assert.equal(s, 'OK');
		client.exists(123, function(err, s) {
			assert.equal(s, 1);
		});
		
		client.set(456, '晕123', function(err, s) {
			assert.equal(s, 'OK');
			client.del(123, 456, 789, function(err, s) {
				assert.equal(s, 2);
			});
		});
		
		client.set('foo', '', function(err, s) {
			assert.equal(s, 'OK');
			client.get('foo', function(err, s) {
				assert.equal('', s);
			});
		});
	});

	client.ping(function(err, s) {
		assert.equal('PONG', s);
//		loop();
	});
}

loop();

setTimeout(function() {
	client.quit();
}, 1000);

//client.set("string key", "string val", redis.print);
//client.hset("hash key", "hashtest 1", "some value", redis.print);
//client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
//client.hkeys("hash key", function (err, replies) {
//    console.log(replies.length + " replies:");
//    replies.forEach(function (reply, i) {
//        console.log("    " + i + ": " + reply);
//    });
//    client.quit();
//});
