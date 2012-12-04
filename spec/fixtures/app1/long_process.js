console.log("This is a test app being run by forge.");
console.log(process.argv);

var http = require('http');


var srv = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Here is a web page</h1>');
}).listen(9615);

console.log("HTTP Server listening on 9615");
