const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('ui-layer');

let network = new Network();
let world = new World();
let camera = new Camera();
let localPlayer = { id: null, name: '', x: 0, y: 0, color: '', inGame: false, moving: false };
let remotePlayers = {};
let currentCabinet = null;
let currentLeaderboardGameIndex = 0;

const input = new Input(canvas);
let isExitConfirmOpen = false;

// We need to resize canvas to full window
function resize() {
    // If playing a game, keep standard Arcade ratio (1024x768)
    // object-fit: contain in CSS will scale it to screen while maintaining aspect ratio
    if (typeof currentState !== 'undefined' && currentState === STATES.PLAYING_GAME) {
        canvas.width = 1024;
        canvas.height = 768;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}
window.addEventListener('resize', resize);

const STATES = {
    NAME_ENTRY: 0,
    CONNECTING: 1,
    WORLD: 2,
    PLAYING_GAME: 3,
    LEADERBOARD: 4
};

let currentState = STATES.NAME_ENTRY;
let activeGame = null;
let lastTime = 0;

const GAMES_PER_PAGE = 6;
const allGames = [
    { key: 'game1', name: 'Basketball', class: BasketballGame },
    { key: 'game2', name: 'Whack-A-Mole', class: WhackAMoleGame },
    { key: 'game3', name: 'Boxing', class: BoxingGame },
    { key: 'game4', name: 'Claw Machine', class: ClawMachineGame },
    { key: 'game5', name: 'Quik Drop', class: BallDropGame },
    { key: 'game6', name: 'Color Match', class: ColorMatchGame },
    { key: 'game7', name: 'Pop the Lock', class: PopTheLockGame },
    { key: 'game8', name: 'Slot Machine', class: SlotMachineGame },
    { key: 'game9', name: 'Pachinko', class: PachinkoGame },
    { key: 'game10', name: 'Lane Roller', class: PushCarGame },
    { key: 'game11', name: 'Stacker', class: StackerGame },
    { key: 'game12', name: 'Zombie Snatcher', class: ZombieSnatcherGame }
];

function setUI(html) {
    uiLayer.innerHTML = html;
}

function switchState(newState) {
    currentState = newState;
    resize();
    
    switch(newState) {
        case STATES.NAME_ENTRY:
            setUI(`
                <div class="menu-screen name-entry-screen">
                    <h1 class="title">Arcade World</h1>
                    <p style="color: #fff; margin-bottom: 20px; font-family: Inter;">Enter your name to join:</p>
                    <input type="text" id="playerName" class="arcade-input" placeholder="Your Name" maxlength="15" autofocus>
                    <button class="btn" style="margin-top:20px" onclick="joinServer()">Enter Arcade</button>
                </div>
            `);
            setTimeout(() => {
                const nameInput = document.getElementById('playerName');
                if(nameInput) {
                    nameInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') joinServer();
                    });
                }
            }, 100);
            break;
            
        case STATES.CONNECTING:
            setUI(`
                <div class="menu-screen connecting-screen">
                    <h2 class="title" style="font-size: 2.5rem;">Connecting...</h2>
                </div>
            `);
            break;
            
        case STATES.WORLD:
            setUI('');
            break;
            
        case STATES.PLAYING_GAME:
            setUI('');
            break;

        case STATES.LEADERBOARD:
            showLeaderboardUI();
            break;
    }
}

function joinServer() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim() || 'Player' + Math.floor(Math.random() * 1000);
    
    switchState(STATES.CONNECTING);
    
    setupNetworkCallbacks();
    network.connect(name);
}

function setupNetworkCallbacks() {
    network.onWelcome = (data) => {
        localPlayer.id = data.id;
        localPlayer.x = data.x;
        localPlayer.y = data.y;
        localPlayer.color = data.color;
        localPlayer.name = data.players[data.id].name;
        
        remotePlayers = {};
        for (let id in data.players) {
            if (id !== localPlayer.id) {
                let p = data.players[id];
                remotePlayers[id] = { ...p, targetX: p.x, targetY: p.y };
            }
        }
        
        switchState(STATES.WORLD);
    };
    
    network.onPlayerJoined = (p) => {
        remotePlayers[p.id] = { ...p, targetX: p.x, targetY: p.y };
    };
    
    network.onPlayerLeft = (data) => {
        if (remotePlayers[data.id]) {
            delete remotePlayers[data.id];
        }
    };
    
    network.onPlayerMoved = (data) => {
        if (remotePlayers[data.id]) {
            remotePlayers[data.id].targetX = data.x;
            remotePlayers[data.id].targetY = data.y;
        }
    };

    network.onPlayerStartedGame = (data) => {
        if (data.id === localPlayer.id) return;
        if (remotePlayers[data.id]) remotePlayers[data.id].inGame = true;
    };

    network.onPlayerEndedGame = (data) => {
        if (data.id === localPlayer.id) return;
        if (remotePlayers[data.id]) remotePlayers[data.id].inGame = false;
    };

    network.onLeaderboard = (data) => {
        if (currentState === STATES.LEADERBOARD) {
            renderLeaderboardTable(data.scores);
        }
    };
}

function showLeaderboardUI() {
    let game = allGames[currentLeaderboardGameIndex];
    
    setUI(`
        <div class="menu-screen leaderboard-panel" style="width: 600px;">
            <div style="display:flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 20px;">
                <button class="page-arrow" onclick="changeLeaderboardGame(-1)">❮</button>
                <h2 class="title" style="font-size: 2.2rem; margin: 0;">${game.name}</h2>
                <button class="page-arrow" onclick="changeLeaderboardGame(1)">❯</button>
            </div>
            <div id="leaderboard-table-container">
                <p style="color:#fff; font-family:Inter;">Loading...</p>
            </div>
            <button class="btn" style="margin-top: 25px; padding: 10px 30px; font-size: 1.2rem;" onclick="closeLeaderboard()">Close (ESC)</button>
        </div>
    `);
    
    network.requestLeaderboard(game.key);
}

function changeLeaderboardGame(dir) {
    currentLeaderboardGameIndex += dir;
    if (currentLeaderboardGameIndex < 0) currentLeaderboardGameIndex = allGames.length - 1;
    if (currentLeaderboardGameIndex >= allGames.length) currentLeaderboardGameIndex = 0;
    
    let game = allGames[currentLeaderboardGameIndex];
    document.querySelector('.leaderboard-panel h2.title').innerText = game.name;
    document.getElementById('leaderboard-table-container').innerHTML = '<p style="color:#fff; font-family:Inter;">Loading...</p>';
    
    network.requestLeaderboard(game.key);
}

function renderLeaderboardTable(scores) {
    const container = document.getElementById('leaderboard-table-container');
    if (!container) return;
    
    if (!scores || scores.length === 0) {
        container.innerHTML = '<p style="color:#aaa; font-family:Inter;">No scores yet. Be the first!</p>';
        return;
    }
    
    let html = `
        <table style="width:100%; border-collapse: collapse; font-family: Inter; color: #fff;">
            <tr style="border-bottom: 2px solid #66fcf1; text-align: left;">
                <th style="padding: 10px; color: #66fcf1; font-family: Orbitron;">Rank</th>
                <th style="padding: 10px; color: #66fcf1; font-family: Orbitron;">Name</th>
                <th style="padding: 10px; color: #66fcf1; font-family: Orbitron; text-align: right;">Score</th>
            </tr>
    `;
    
    scores.forEach((s, i) => {
        let color = i === 0 ? '#ffcc00' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#fff';
        html += `
            <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 10px; color: ${color}; font-weight: bold;">#${i+1}</td>
                <td style="padding: 10px; color: ${color};">${s.name}</td>
                <td style="padding: 10px; text-align: right; color: ${color}; font-family: Orbitron;">${s.score}</td>
            </tr>
        `;
    });
    
    html += '</table>';
    container.innerHTML = html;
}

function closeLeaderboard() {
    switchState(STATES.WORLD);
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && currentState === STATES.LEADERBOARD) {
        closeLeaderboard();
    }
});

function startGameAtCabinet(cabinet) {
    currentCabinet = cabinet;
    const GameClass = allGames[cabinet.gameIndex].class;
    activeGame = new GameClass();
    
    canvas.width = 1024;
    canvas.height = 768;
    
    activeGame.init();
    localPlayer.inGame = true;
    network.sendStartGame(cabinet.id);
    
    switchState(STATES.PLAYING_GAME);
}

function drawHUD(score, timeFormatted) {
    ctx.font = '30px Orbitron';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#66fcf1';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 40, 50);
    if(timeFormatted) {
        ctx.textAlign = 'right';
        ctx.fillText(`Time: ${timeFormatted}`, canvas.width - 100, 50);
    }
    ctx.shadowBlur = 0;

    // Exit Button (Round, purple border, black inside, white X)
    ctx.beginPath();
    ctx.arc(canvas.width - 40, 40, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9b59b6'; // Purple border
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', canvas.width - 40, 40);
    ctx.textBaseline = 'alphabetic';
}

function showGameOver(score, gameKey) {
    network.sendEndGame(gameKey, score);
    localPlayer.inGame = false;
    
    const isHigh = Store.setHighScore(gameKey, score);
    
    setUI(`
        <div class="menu-screen">
            <h2 class="title" style="font-size: 4rem;">Game Over</h2>
            <p style="font-size: 2rem; color: #fff; margin-bottom: 10px;">Score: <span style="color: #66fcf1">${score}</span></p>
            ${isHigh ? '<p style="font-size: 1.5rem; color: #ff007f; margin-bottom: 20px; animation: pulsate 1s infinite alternate;">New Local High Score!</p>' : ''}
            <button class="btn" onclick="backToWorld()">Back to Arcade</button>
        </div>
    `);
    activeGame = null;
}

function backToWorld() {
    resize();
    switchState(STATES.WORLD);
}

function interpolateRemotePlayers(dt) {
    for (let id in remotePlayers) {
        let p = remotePlayers[id];
        p.x += (p.targetX - p.x) * 10 * dt;
        p.y += (p.targetY - p.y) * 10 * dt;
    }
}

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentState === STATES.WORLD || currentState === STATES.LEADERBOARD) {
        if (currentState === STATES.WORLD) {
            let oldX = localPlayer.x, oldY = localPlayer.y;
            world.update(dt, localPlayer, input);
            if (localPlayer.x !== oldX || localPlayer.y !== oldY) {
                network.sendMove(localPlayer.x, localPlayer.y);
            }
            
            if (input.isKeyJustPressed('KeyE')) {
                let interactable = world.getNearestInteractable(localPlayer.x, localPlayer.y);
                if (interactable) {
                    if (interactable.type === 'cabinet') {
                        startGameAtCabinet(interactable.target);
                    } else if (interactable.type === 'leaderboard') {
                        switchState(STATES.LEADERBOARD);
                    }
                }
            }
        }
        
        interpolateRemotePlayers(dt);
        let zoom = 1.8;
        camera.follow(localPlayer.x, localPlayer.y, canvas.width / zoom, canvas.height / zoom, world.width, world.height);
        
        ctx.save();
        ctx.scale(zoom, zoom);
        world.draw(ctx, camera, remotePlayers, localPlayer);
        ctx.restore();
    } 
    else if (currentState === STATES.PLAYING_GAME) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (activeGame) {
            if (isExitConfirmOpen) {
                // Draw game in background, paused
                activeGame.draw(ctx);
                
                // Draw overlay and confirmation popup
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = '#1a1a2e';
                ctx.strokeStyle = '#9b59b6';
                ctx.lineWidth = 4;
                ctx.fillRect(canvas.width/2 - 200, canvas.height/2 - 100, 400, 200);
                ctx.strokeRect(canvas.width/2 - 200, canvas.height/2 - 100, 400, 200);
                
                ctx.fillStyle = '#fff';
                ctx.font = '24px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('Do you want to exit?', canvas.width/2, canvas.height/2 - 20);
                
                // Draw Buttons
                // Back Button
                ctx.fillStyle = '#3498db';
                ctx.fillRect(canvas.width/2 - 150, canvas.height/2 + 30, 120, 40);
                ctx.fillStyle = '#fff';
                ctx.font = '18px Orbitron';
                ctx.fillText('Back', canvas.width/2 - 90, canvas.height/2 + 55);
                
                // Exit Button
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(canvas.width/2 + 30, canvas.height/2 + 30, 120, 40);
                ctx.fillStyle = '#fff';
                ctx.fillText('Exit', canvas.width/2 + 90, canvas.height/2 + 55);
                
                if (input.mouse.justPressed) {
                    let mx = input.mouse.x;
                    let my = input.mouse.y;
                    
                    // Click Back
                    if (mx >= canvas.width/2 - 150 && mx <= canvas.width/2 - 30 && my >= canvas.height/2 + 30 && my <= canvas.height/2 + 70) {
                        isExitConfirmOpen = false;
                    }
                    // Click Exit
                    else if (mx >= canvas.width/2 + 30 && mx <= canvas.width/2 + 150 && my >= canvas.height/2 + 30 && my <= canvas.height/2 + 70) {
                        isExitConfirmOpen = false;
                        activeGame.isGameOver = true;
                    }
                }
            } else {
                // Check Exit button click (Circle radius 20 at center canvas.width - 40, 40)
                if (input.mouse.justPressed) {
                    let mx = input.mouse.x;
                    let my = input.mouse.y;
                    let cx = canvas.width - 40;
                    let cy = 40;
                    let dist = Math.sqrt((mx - cx) * (mx - cx) + (my - cy) * (my - cy));
                    if (dist <= 20) {
                        isExitConfirmOpen = true;
                    }
                }

                activeGame.update(dt, input);
                activeGame.draw(ctx);
                if (activeGame.isGameOver) {
                    showGameOver(activeGame.score, activeGame.gameKey);
                }
            }
        }
    }

    input.update();
    requestAnimationFrame(gameLoop);
}

// Init
switchState(STATES.NAME_ENTRY);
requestAnimationFrame(gameLoop);
