const express = require('express');
const server = require('http').createServer();
const app = express();
const sqlite = require('sqlite3').verbose();
const WebSocketServer = require('ws').Server;

app.use('/images', express.static('images'));

app.get('/', function(req, res) {
   res.sendFile('index.html', { root: __dirname });
});

server.on('request', app);
server.listen(3000, function() {
   console.log("Server started on port 3000");
});

// Database
const db = new sqlite.Database('./visitors.sqlite', (err) => {
   if (err) {
       console.error('Database Error:', err);
   } else {
       console.log('Connected to database');
       // Create table
       db.run('CREATE TABLE IF NOT EXISTS visitors (count INTEGER, time TEXT)');
   }
});

// WebSocket
const wss = new WebSocketServer({ server: server });

wss.broadcast = function(data) {
   wss.clients.forEach(function(client) {
       if (client.readyState === client.OPEN) {
           client.send(JSON.stringify(data));
       }
   });
};

wss.on('connection', function(ws) {
   const numClients = wss.clients.size;
   console.log("Clients connected:", numClients);

   // Save to database
   db.run('INSERT INTO visitors (count, time) VALUES (?, datetime("now"))', [numClients]);

   // Send messages
   wss.broadcast({ type: 'userCount', count: numClients });
   ws.send(JSON.stringify({ message: 'Welcome!', clients: numClients }));

   ws.on('close', function() {
       wss.broadcast({ type: 'userCount', count: wss.clients.size });
       console.log('Client disconnected');
   });
});

// Shutdown
process.on('SIGINT', () => {
   console.log('\nClosing server...');
   wss.clients.forEach(client => client.close());
   server.close(() => {
       db.all('SELECT * FROM visitors', (err, rows) => {
           if (rows) console.log('Final visitor log:', rows);
           db.close(() => process.exit(0));
       });
   });
});