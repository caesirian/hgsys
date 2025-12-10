// server.js - Peer GUN simple (sin persistencia, en RAM)
const http = require('http');
const Gun = require('gun');
require('gun/lib/open'); // ensure persistence features exist

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('GUN peer running\n');
});

const gun = Gun({
  web: server,
  // peers: [] // este peer será el inicial; otros peers podrán conectarse a él
});

// opcional: exponer una simple estadística
gun.get('stats').put({ started: Date.now() });

server.listen(port, () => {
  console.log('GUN peer listening on port', port);
});