class SlotMachineGame {
    constructor() {
        this.gameKey = 'game8';
        this.score = 0;
        this.isGameOver = false;

        this.symbols = ['🍇', '🍒', '🧀', 'J', '😜'];
        this.symbolKeys = ['grape', 'cherry', 'cheese', 'jackpot', 'emoji'];

        this.numReels = 5;
        this.reelWidth = 90;
        this.reelHeight = 100;
        this.reelGap = 15;
        this.reelsX = 150;
        this.reelsY = 280;

        // Each reel has a list of symbols scrolling
        this.reels = [];
        for (let i = 0; i < this.numReels; i++) {
            this.reels.push({
                symbols: this.generateReelSymbols(),
                offset: Math.random() * 500,
                speed: 600 + Math.random() * 200,
                stopped: false,
                stopping: false,
                targetIdx: -1,
                result: null
            });
        }

        // Lever
        this.leverX = 700;
        this.leverY = 200;
        this.leverW = 40;
        this.leverH = 350;
        this.ballRadius = 22;
        this.ballY = this.leverY + this.ballRadius + 5;
        this.ballTargetY = this.leverY + this.ballRadius + 5;
        this.ballMaxY = this.leverY + this.leverH - this.ballRadius - 5;
        this.draggingLever = false;
        this.leverPulled = false;
        this.ballReturning = false;

        this.roundsLeft = 5;
        this.roundScore = 0;
        this.roundMsg = '';
        this.roundMsgTimer = 0;
        this.roundState = 'IDLE'; // IDLE, SPINNING, SHOWING_RESULT

        this.pullCount = 0; // how many times pulled this round
    }

    generateReelSymbols() {
        let arr = [];
        for (let i = 0; i < 30; i++) {
            arr.push(Math.floor(Math.random() * this.symbols.length));
        }
        return arr;
    }

    init() {
        this.startNewRound();
    }

    startNewRound() {
        this.pullCount = 0;
        this.reelsStopped = 0;
        this.roundScore = 0;
        this.roundMsg = '';
        this.roundState = 'IDLE';
        for (let r of this.reels) {
            r.symbols = this.generateReelSymbols();
            r.offset = Math.random() * 500;
            r.speed = 600 + Math.random() * 200;
            r.stopped = false;
            r.stopping = false;
            r.targetIdx = -1;
            r.result = null;
        }
        this.ballReturning = false;
        this.draggingLever = false;
    }

    update(dt, input) {
        if (this.isGameOver) return;

        if (this.roundState === 'SHOWING_RESULT') {
            this.roundMsgTimer -= dt;
            if (this.roundMsgTimer <= 0) {
                if (this.roundsLeft <= 0) {
                    this.isGameOver = true;
                } else {
                    this.startNewRound();
                }
            }
            return;
        }

        // Update spinning reels
        for (let r of this.reels) {
            if (!r.stopped) {
                if (r.stopping) {
                    r.timeSpentStopping += dt;
                    let t = r.timeSpentStopping / r.stopTime;
                    if (t >= 1) {
                        // Snap to nearest symbol-centered position
                        // reelHeight=100, symbolH=70, so center align offset = symbolH - reelHeight/2 + symbolH/2 = 55
                        let symbolH = 70;
                        let centerAlign = 55;
                        r.offset = Math.round((r.offset - centerAlign) / symbolH) * symbolH + centerAlign;
                        r.stopped = true;
                        r.stopping = false;
                        // Read centered symbol (j=1 in the draw loop)
                        let cycleLen = symbolH * r.symbols.length;
                        let baseOffset = r.offset % cycleLen;
                        let symIdx = Math.floor((baseOffset / symbolH + 1) % r.symbols.length);
                        if (symIdx < 0) symIdx += r.symbols.length;
                        r.result = r.symbols[symIdx];
                    } else {
                        // Decelerate: start at full speed, ease down to 0
                        let ease = 1 - Math.pow(t, 2); // easeOut (starts fast, slows down)
                        r.offset += r.speed * ease * dt;
                    }
                } else {
                    r.offset += r.speed * dt;
                }
            }
        }

        // Lever interaction
        let leverBallX = this.leverX + this.leverW / 2;
        let leverBallScreenY = this.ballY;

        if (input.mouse.justPressed) {
            let dx = input.mouse.x - leverBallX;
            let dy = input.mouse.y - leverBallScreenY;
            if (Math.sqrt(dx * dx + dy * dy) < this.ballRadius + 10) {
                if (!this.ballReturning && this.reels.some(r => !r.stopped && !r.stopping)) {
                    this.draggingLever = true;
                }
            }
        }

        if (this.draggingLever) {
            let targetY = Math.max(this.leverY + this.ballRadius + 5, Math.min(input.mouse.y, this.ballMaxY));
            this.ballY = targetY;

            // Check if pulled to bottom - only then trigger stop
            if (this.ballY >= this.ballMaxY - 5) {
                this.draggingLever = false;
                // Start spinning on first full pull
                if (this.roundState === 'IDLE') {
                    this.roundState = 'SPINNING';
                }
                this.triggerStop();
                this.ballReturning = true;
            } else if (!input.mouse.down) {
                // Released midway - return ball without triggering stop
                this.draggingLever = false;
                this.ballReturning = true;
            }
        }

        // Ball returning to top
        if (this.ballReturning) {
            this.ballY -= 400 * dt;
            if (this.ballY <= this.leverY + this.ballRadius + 5) {
                this.ballY = this.leverY + this.ballRadius + 5;
                this.ballReturning = false;
            }
        }

        // Check if all reels stopped
        if (this.reels.every(r => r.stopped) && this.roundState === 'SPINNING') {
            this.calculateScore();
        }
    }

    triggerStop() {
        let reel = this.reels.find(r => !r.stopped && !r.stopping);
        if (reel) {
            reel.stopping = true;
            reel.stopTime = 3.0;
            reel.timeSpentStopping = 0;
            this.pullCount++;
        }
    }

    calculateScore() {
        let results = this.reels.map(r => r.result);
        let counts = {};
        for (let r of results) {
            let key = this.symbolKeys[r];
            counts[key] = (counts[key] || 0) + 1;
        }

        let emojiCount = counts['emoji'] || 0;

        // 3+ emoji = lose round
        if (emojiCount >= 3) {
            this.roundScore = 0;
            this.finishRound('3+ Emoji! Lost Round!', true);
            return;
        }

        let baseScore = 10; // default
        let bestSymbol = null;
        let bestCount = 0;

        const scoreTable = {
            'grape':   { 5: 50,  4: 40,  3: 30 },
            'cherry':  { 5: 100, 4: 80,  3: 60 },
            'cheese':  { 5: 150, 4: 120, 3: 100 },
            'jackpot': { 5: 500, 4: 400, 3: 300 }
        };

        for (let sym of ['grape', 'cherry', 'cheese', 'jackpot']) {
            let c = counts[sym] || 0;
            if (c >= 3 && c > bestCount) {
                bestCount = c;
                bestSymbol = sym;
            }
        }

        if (bestSymbol && scoreTable[bestSymbol][bestCount]) {
            baseScore = scoreTable[bestSymbol][bestCount];
        }

        // Cherry + Grape bonus (all 5 are cherry or grape)
        let cgCount = (counts['cherry'] || 0) + (counts['grape'] || 0);
        if (cgCount === 5) {
            baseScore += 100;
        }

        // Emoji penalty
        if (emojiCount === 2) {
            baseScore -= 50;
            if (baseScore <= 0) {
                this.roundScore = 0;
                this.finishRound('2 Emoji Penalty! Lost Round!', true);
                return;
            }
        }

        this.roundScore = baseScore;
        let msg = `+${baseScore} points!`;
        if (bestSymbol && bestCount >= 3) {
            msg = `${bestCount}x ${bestSymbol.toUpperCase()}! +${baseScore}`;
        }
        this.finishRound(msg, false);
    }

    finishRound(msg, lost) {
        this.score += this.roundScore;
        this.roundsLeft--;
        this.roundState = 'SHOWING_RESULT';
        this.roundMsg = msg;
        this.roundMsgTimer = 2.5;
    }

    draw(ctx) {
        // Background machine
        drawRect(ctx, this.reelsX - 30, this.reelsY - 80, this.numReels * (this.reelWidth + this.reelGap) + 30, this.reelHeight + 140, '#1a1a2e', { blur: 10, color: '#45a29e' });

        // Title
        ctx.font = '30px Orbitron';
        ctx.fillStyle = '#ff007f';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff007f';
        ctx.fillText('SLOT MACHINE', this.reelsX + (this.numReels * (this.reelWidth + this.reelGap)) / 2 - 10, this.reelsY - 40);
        ctx.shadowBlur = 0;

        // Draw reels
        for (let i = 0; i < this.numReels; i++) {
            let rx = this.reelsX + i * (this.reelWidth + this.reelGap);
            let ry = this.reelsY;
            let reel = this.reels[i];

            // Reel background
            drawRect(ctx, rx, ry, this.reelWidth, this.reelHeight, '#0b0c10');
            ctx.strokeStyle = '#45a29e';
            ctx.lineWidth = 2;
            ctx.strokeRect(rx, ry, this.reelWidth, this.reelHeight);

            ctx.save();
            ctx.beginPath();
            ctx.rect(rx, ry, this.reelWidth, this.reelHeight);
            ctx.clip();

            {
                // Always use scrolling rendering (stopped reels have snapped offset)
                let symbolH = 70;
                let numVisible = 4;
                let baseOffset = reel.offset % (symbolH * reel.symbols.length);

                for (let j = -1; j < numVisible; j++) {
                    let yPos = ry + j * symbolH - (baseOffset % symbolH);
                    let symIdx = Math.floor((baseOffset / symbolH + j) % reel.symbols.length);
                    if (symIdx < 0) symIdx += reel.symbols.length;
                    let sym = this.symbols[reel.symbols[symIdx]];

                    let fontSize = reel.stopped ? 50 : 45;
                    ctx.font = sym === 'J' ? `bold ${fontSize}px Orbitron` : `${fontSize}px sans-serif`;
                    ctx.fillStyle = sym === 'J' ? '#e74c3c' : '#fff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(sym, rx + this.reelWidth / 2, yPos + symbolH / 2);
                    ctx.textBaseline = 'alphabetic';
                }
            }

            ctx.restore();
        }

        // Draw lever
        // Track
        drawRect(ctx, this.leverX, this.leverY, this.leverW, this.leverH, '#2a2a35', { blur: 5, color: '#1a1a1a' });
        // Black center strip
        drawRect(ctx, this.leverX + 10, this.leverY + 10, this.leverW - 20, this.leverH - 20, '#0b0c10');
        // Red ball
        ctx.beginPath();
        ctx.arc(this.leverX + this.leverW / 2, this.ballY, this.ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#e74c3c';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e74c3c';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Lever label
        ctx.font = '14px Orbitron';
        ctx.fillStyle = '#66fcf1';
        ctx.textAlign = 'center';
        ctx.fillText('PULL', this.leverX + this.leverW / 2, this.leverY + this.leverH + 25);

        // Result message
        if (this.roundState === 'SHOWING_RESULT') {
            ctx.font = '35px Orbitron';
            ctx.fillStyle = this.roundScore > 0 ? '#66fcf1' : '#e74c3c';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.roundScore > 0 ? '#66fcf1' : '#e74c3c';
            ctx.fillText(this.roundMsg, 420, 500);
            ctx.shadowBlur = 0;
        }

        drawHUD(this.score, null);

        ctx.font = '20px Orbitron';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(`Rounds: ${this.roundsLeft}`, canvas.width - 40, 90);

        // Pull count
        if (this.roundState === 'SPINNING') {
            ctx.font = '16px Orbitron';
            ctx.fillStyle = '#66fcf1';
            ctx.textAlign = 'center';
            ctx.fillText(`Pulls: ${this.pullCount}/${this.numReels}`, 420, 180);
        }

        ctx.fillStyle = '#66fcf1';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Drag the red ball down to stop each reel!', 420, 720);
    }
}
