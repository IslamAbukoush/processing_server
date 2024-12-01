const net = require('net');

let blockId = 6;
let clientId = 0;
let world = [];
let players = {};

for(let i = 0; i < 10; i++) {
    for(let j = 0; j < 10; j++) {
        world.push({x: i*50, y: 0, z: j*50, type: 8, id: blockId});
        blockId += 6;
    }
}

// Array to keep track of all connected clients
const clients = [];

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const server = net.createServer((socket) => {
    console.log('New player connected');
    socket.id = clientId++;
    players[socket.id] = {x: 0, y: 0, z: 0, r: 0}
    const joinMsg = {action: "join", id: socket.id, x: 0, y: 0, z: 0, r: 0};
    broadcastMessage(joinMsg);

    // Add the new client to the clients array
    clients.push(socket);
    let playersMsg = Object.entries(players).map(e => {return {id: e[0], x: e[1].x, y: e[1].y, z: e[1].z, r: e[1].r}}).filter(e => e.id != socket.id);
    const worldMsg = {action: "load", world, players: playersMsg};
    socket.write(JSON.stringify(worldMsg));
    
    // Handle incoming data from clients
    socket.on('data', (data) => {
        try {
            const messageStr = data.toString().trim();
            // Check if the data is JSON
            if (messageStr.startsWith("{") && messageStr.endsWith("}")) {
                const message = JSON.parse(messageStr);
    
                // Process the message
                if (message.action === 'place') {
                    message.id = blockId;
                    blockId += 6;
                    broadcastMessage(message);
                    setTimeout(() => {
                        broadcastMessage(message);
                    }, 100);
                } else if (message.action === 'remove') {
                    broadcastMessage(message);
                    setTimeout(() => {
                        broadcastMessage(message);
                    }, 100);
                } else if (message.action === 'move') {
                    message.id = socket.id;
                    broadcastMessage(message);
                }
            } else {
                console.warn("Non-JSON data received:", messageStr);
            }
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    // Handle client disconnection
    socket.on('end', () => {
        delete players[socket.id];
        console.log('Client disconnected');
        broadcastMessage({action: "leave", id: socket.id});
        
        // Remove the client from the list of connected clients
        const index = clients.indexOf(socket);
        if (index !== -1) {
            clients.splice(index, 1);
        }
    });

    // Handle socket error
    socket.on('error', (err) => {
        console.error("Socket error:", err);
    });

}).listen(PORT, HOST, () => {
    console.log(HOST+' Server running on port '+PORT);
});

// Function to broadcast a message to all clients
function broadcastMessage(message) {
    // Convert the message to a JSON string
    const messageStr = JSON.stringify(message)+"\n";

    // Send the message to all connected clients
    clients.forEach(client => {
        if (client.writable) {
            if (message.action === "move" && client.id === message.id) return;
            client.write(messageStr);
        }
    });
}
