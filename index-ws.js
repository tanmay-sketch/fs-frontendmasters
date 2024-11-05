const express = require('express');
const { type } = require('os');
const server = require('http').createServer();
const app = express();

// used to serve static files from the public directory
app.use('/images', express.static('images'));

app.get('/', function(req, res) {
    res.sendFile('index.html',{root: __dirname});
});

server.on('request',app);
server.listen(3000,function() { console.log("Server started on port 3000"); });

/** Begin Websockets */
const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({server: server});

wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log("Clients connected", numClients);

    const userCountMessage = { type: 'userCount', count: numClients };
    const welcomeMessage = { message: 'Welcome to my server', clients: numClients };

    // Broadcast the number of connected clients to all clients
    wss.broadcast(userCountMessage);

    if (ws.readyState === ws.OPEN) {
        // send a json message to the client
        ws.send(JSON.stringify(welcomeMessage));
    }

    ws.on('close', function close() {
        wss.broadcast(userCountMessage);
        console.log('A client has disconnected');
    });
});

wss.broadcast = function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(function each(client) {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}