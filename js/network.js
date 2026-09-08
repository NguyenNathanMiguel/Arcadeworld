class Network {
    constructor() {
        this.socket = null;
        this.lastMoveSend = 0;
        this.moveThrottle = 1000 / 15; // 15 fps for network updates
        
        // Callbacks
        this.onWelcome = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onPlayerMoved = null;
        this.onPlayerStartedGame = null;
        this.onPlayerEndedGame = null;
        this.onLeaderboard = null;
    }

    connect(name) {
        if (typeof io === 'undefined') {
            console.error("Socket.io not loaded");
            return;
        }
        
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('join', { name: name });
        });

        this.socket.on('welcome', (data) => {
            if (this.onWelcome) this.onWelcome(data);
        });

        this.socket.on('playerJoined', (data) => {
            if (this.onPlayerJoined) this.onPlayerJoined(data);
        });

        this.socket.on('playerLeft', (data) => {
            if (this.onPlayerLeft) this.onPlayerLeft(data);
        });

        this.socket.on('playerMoved', (data) => {
            if (this.onPlayerMoved) this.onPlayerMoved(data);
        });

        this.socket.on('playerStartedGame', (data) => {
            if (this.onPlayerStartedGame) this.onPlayerStartedGame(data);
        });

        this.socket.on('playerEndedGame', (data) => {
            if (this.onPlayerEndedGame) this.onPlayerEndedGame(data);
        });

        this.socket.on('leaderboard', (data) => {
            if (this.onLeaderboard) this.onLeaderboard(data);
        });
    }

    sendMove(x, y) {
        if (!this.socket) return;
        const now = Date.now();
        if (now - this.lastMoveSend > this.moveThrottle) {
            this.socket.emit('move', { x, y });
            this.lastMoveSend = now;
        }
    }

    sendStartGame(cabinetId) {
        if (this.socket) {
            this.socket.emit('startGame', { cabinetId });
        }
    }

    sendEndGame(gameKey, score) {
        if (this.socket) {
            this.socket.emit('endGame', { gameKey, score });
        }
    }

    requestLeaderboard(gameKey) {
        if (this.socket) {
            this.socket.emit('getLeaderboard', { gameKey });
        }
    }
}
