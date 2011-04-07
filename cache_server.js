
var createServer = require('./lib/server').create;

var server = createServer(9999);

server.start();