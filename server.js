const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Serve static files from the root directory
app.use(express.static(__dirname));

let players = {};
let leaderboard = {};

// Load leaderboard on startup
if (fs.existsSync(LEADERBOARD_FILE)) {
    try {
        leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    } catch (e) {
        console.error("Error reading leaderboard:", e);
    }
}

function saveLeaderboard() {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
}

function getRandomColor() {
    const colors = ['#ff007f', '#00ccff', '#ffcc00', '#00cc44', '#b829ea', '#ff4444', '#45a29e'];
    return colors[Math.floor(Math.random() * colors.length)];
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (data) => {
        const player = {
            id: socket.id,
            name: data.name,
            x: 250,
            y: 1200,
            color: getRandomColor(),
            inGame: false,
            cabinetId: null
        };
        players[socket.id] = player;

        // Send current state to new player
        socket.emit('welcome', {
            id: socket.id,
            players: players,
            color: player.color,
            x: player.x,
            y: player.y
        });

        // Broadcast to others
        socket.broadcast.emit('playerJoined', player);
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Throttle this in production, but for now broadcast to others
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: data.x,
                y: data.y
            });
        }
    });

    socket.on('startGame', (data) => {
        if (players[socket.id]) {
            players[socket.id].inGame = true;
            players[socket.id].cabinetId = data.cabinetId;
            io.emit('playerStartedGame', {
                id: socket.id,
                cabinetId: data.cabinetId
            });
        }
    });

    socket.on('endGame', (data) => {
        if (players[socket.id]) {
            const p = players[socket.id];
            p.inGame = false;
            p.cabinetId = null;
            io.emit('playerEndedGame', { id: socket.id });

            // Update leaderboard
            if (data.gameKey && data.score !== undefined) {
                if (!leaderboard[data.gameKey]) {
                    leaderboard[data.gameKey] = [];
                }
                leaderboard[data.gameKey].push({
                    name: p.name,
                    score: data.score,
                    date: new Date().toISOString()
                });
                
                // Sort descending
                leaderboard[data.gameKey].sort((a, b) => b.score - a.score);
                
                // Keep top 10
                if (leaderboard[data.gameKey].length > 10) {
                    leaderboard[data.gameKey] = leaderboard[data.gameKey].slice(0, 10);
                }
                
                saveLeaderboard();
                
                // Broadcast updated leaderboard for this game
                io.emit('leaderboard', {
                    gameKey: data.gameKey,
                    scores: leaderboard[data.gameKey]
                });
            }
        }
    });

    socket.on('getLeaderboard', (data) => {
        socket.emit('leaderboard', {
            gameKey: data.gameKey,
            scores: leaderboard[data.gameKey] || []
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (players[socket.id]) {
            const cabinetId = players[socket.id].cabinetId;
            delete players[socket.id];
            socket.broadcast.emit('playerLeft', { id: socket.id, cabinetId: cabinetId });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
