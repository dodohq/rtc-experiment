import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV === 'dev') dotenv.load();

function serveStatic(request, response) {
  console.log('request ', request.url);

  var filePath = '.' + request.url;
  if (filePath == './') {
    filePath = './index.html';
  }

  var extname = String(path.extname(filePath)).toLowerCase();
  var contentType = 'text/html';
  var mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.svg': 'application/image/svg+xml',
  };

  contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, function(error, content) {
    if (error) {
      if (error.code == 'ENOENT') {
        fs.readFile('./404.html', function(error, content) {
          response.writeHead(200, { 'Content-Type': contentType });
          response.end(content, 'utf-8');
        });
      } else {
        response.writeHead(500);
        response.end(
          'Sorry, check with the site admin for error: ' + error.code + ' ..\n',
        );
        response.end();
      }
    } else {
      response.writeHead(200, { 'Content-Type': contentType });
      response.end(content, 'utf-8');
    }
  });
}

const server = http.createServer(serveStatic).listen(process.env.PORT);

const wss = new WebSocket.Server({ server, clientTracking: true });

wss.on('connection', function(client) {
  client.on('message', function(message) {
    wss.broadcast(message, client);
  });
});

wss.broadcast = function(data, exclude) {
  const n = this.clients ? this.clients.size : 0;
  if (n < 1) return;
  for (let client of this.clients) {
    if (client === exclude) continue;
    if (client.readyState === client.OPEN) client.send(data);
    else console.error('Error: client state is still', client.readyState);
  }
};
