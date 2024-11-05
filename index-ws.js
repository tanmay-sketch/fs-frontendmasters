const express = require('express');
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

// Gracefully shutdown the server
process.on('SIGINT', () => {
    console.log("sigint");
    wss.clients.forEach(function each(client) {
        client.close();
    });
    server.close(() => {
        shutdownDB();
    })
})

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

    db.run(`
        INSERT INTO visitors (count, time) 
        VALUES (${numClients}, datetime('now'))
    `);

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
/** End Websockets **/


/** Begin Database */
const sqlite = require('sqlite3');
const db = new sqlite.Database(':memory:');

db.serialize(() => {
    db.run(`
        CREATE TABLE visitors (
            count INTEGER,
            time TEXT
        )
    `);
});

function getCounts() {
    db.each("SELECT * FROM visitors", (err, row) => {
        console.log(row);
    });
}

function shutdownDB() {
    getCounts();
    console.log("Shutting down db");
    db.close();
}