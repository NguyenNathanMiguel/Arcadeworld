class PushCarGame {
    constructor() {
        this.gameKey = 'game10';
        this.score = 0;
        this.isGameOver = false;
        // Road dimensions
        this.roadX = 350; this.roadY = 40; this.roadW = 200; this.roadH = 620;
        this.roadBottom = this.roadY + this.roadH;
        // Zones (bottom to top): purple, blue, green, yellow, blue
        // Sizes: purple > blue > green > yellow; top blue = bottom blue
        this.zoneColors = ['#8B00FF', '#0066FF', '#00CC44', '#FFD700', '#0066FF'];
        this.zoneNames = ['Purple', 'Blue', 'Green', 'Yellow', 'Blue'];
        this.zonePoints = [5, 10, 30, 50, 10];
        // Zone heights (ratios: purple=7, blue=5, green=4, yellow=2, topblue=5) total=23
        this.totalZoneH = this.roadH - 80; // leave 80px at bottom for car start
        let ratios = [7, 5, 4, 2, 5];
        let totalR = ratios.reduce((a, b) => a + b, 0);
        this.zones = [];
        let zoneY = this.roadBottom - 80; // zones start above car area
        for (let i = 0; i < 5; i++) {
            let h = (ratios[i] / totalR) * this.totalZoneH;
            zoneY -= h;
            this.zones.push({ y: zoneY, h: h, color: this.zoneColors[i], pts: this.zonePoints[i], name: this.zoneNames[i] });
        }
        // Bulbs along both sides
        this.bulbRadius = 4;
        this.bulbs = [];
        this.setupBulbs();
        // Red bonus bulb (random, not in purple or bottom blue)
        this.redBulbIndex = -1;
        this.placeRedBulb();
        // Car
        this.carW = 50; this.carH = 30;
        this.carStartY = this.roadBottom - 50;
        this.carY = this.carStartY;
        this.carX = this.roadX + this.roadW / 2;
        // Force gauge
        this.gaugeX = 800; this.gaugeY = 200; this.gaugeW = 40; this.gaugeH = 400;
        // Lever
        this.leverX = 850; this.leverTrackY = this.gaugeY; this.leverTrackH = this.gaugeH;
        this.leverBallR = 14;
        this.leverBallY = this.leverTrackY;
        this.leverMaxY = this.leverTrackY + this.leverTrackH;
        this.dragging = false;
        this.forcePercent = 0;
        // Game state
        this.roundsLeft = 5;
        this.state = 'IDLE'; // IDLE, LAUNCHING, FALLING, SCORING
        this.carVelocity = 0;
        this.maxLaunchSpeed = 631;
        this.carDecel = 350;
        this.scoringDone = false;
        this.roundMsg = ''; this.roundMsgTimer = 0;
        this.roundScore = 0;
    }

    setupBulbs() {
        this.bulbs = [];
        let bulbSpacing = 14;
        let startY = this.zones[this.zones.length - 1].y;
        let endY = this.roadBottom - 80;
        for (let y = endY; y >= startY; y -= bulbSpacing) {
            // Find zone for this y
            let zone = null;
            for (let z of this.zones) {
                if (y >= z.y && y < z.y + z.h) { zone = z; break; }
            }
            if (!zone) continue;
            this.bulbs.push({ y: y, color: zone.color, pts: zone.pts, side: 'left', isRed: false });
            this.bulbs.push({ y: y, color: zone.color, pts: zone.pts, side: 'right', isRed: false });
        }
    }

    placeRedBulb() {
        // Eligible bulbs: not in purple (zone 0) and not bottom blue (zone 1)
        let eligible = [];
        for (let i = 0; i < this.bulbs.length; i++) {
            let b = this.bulbs[i];
            // Check if bulb is in green, yellow, or top blue zones
            let inZone = -1;
            for (let zi = 0; zi < this.zones.length; zi++) {
                let z = this.zones[zi];
                if (b.y >= z.y && b.y < z.y + z.h) { inZone = zi; break; }
            }
            // zones: 0=purple, 1=blue(bottom), 2=green, 3=yellow, 4=blue(top)
            if (inZone >= 2) eligible.push(i);
        }
        if (eligible.length > 0) {
            // Reset previous
            for (let b of this.bulbs) b.isRed = false;
            // Pick two (one left, one right at same y ideally)
            let idx = eligible[Math.floor(Math.random() * eligible.length)];
            this.bulbs[idx].isRed = true;
            // Find matching side
            let matchY = this.bulbs[idx].y;
            let matchSide = this.bulbs[idx].side === 'left' ? 'right' : 'left';
            for (let i = 0; i < this.bulbs.length; i++) {
                if (this.bulbs[i].y === matchY && this.bulbs[i].side === matchSide) {
                    this.bulbs[i].isRed = true; break;
                }
            }
        }
    }

    init() {}

    update(dt, input) {
        if (this.isGameOver) return;
        if (this.state === 'SCORING') {
            this.roundMsgTimer -= dt;
            if (this.roundMsgTimer <= 0) {
                if (this.roundsLeft <= 0) { this.isGameOver = true; return; }
                this.state = 'IDLE';
                this.carY = this.carStartY;
                this.forcePercent = 0;
                this.leverBallY = this.leverTrackY;
                this.placeRedBulb();
            }
            return;
        }
        if (this.state === 'IDLE') {
            // Lever drag
            let lx = this.leverX, ly = this.leverBallY;
            if (input.mouse.justPressed) {
                let dx = input.mouse.x - lx, dy = input.mouse.y - ly;
                if (Math.sqrt(dx * dx + dy * dy) < this.leverBallR + 10) this.dragging = true;
            }
            if (this.dragging) {
                this.leverBallY = Math.max(this.leverTrackY, Math.min(this.leverMaxY, input.mouse.y));
                this.forcePercent = (this.leverBallY - this.leverTrackY) / this.leverTrackH;
                if (!input.mouse.down) {
                    this.dragging = false;
                    if (this.forcePercent > 0.05) {
                        this.state = 'LAUNCHING';
                        this.carVelocity = this.maxLaunchSpeed * this.forcePercent;
                    }
                }
            }
        }
        if (this.state === 'LAUNCHING') {
            this.carY -= this.carVelocity * dt;
            this.carVelocity -= this.carDecel * dt;
            if (this.carVelocity <= 0) {
                this.carVelocity = 0;
                this.state = 'FALLING';
                // Score at peak
                this.scorePeak();
            }
        }
        if (this.state === 'FALLING') {
            this.carVelocity += this.carDecel * dt;
            this.carY += this.carVelocity * dt;
            if (this.carY >= this.carStartY) {
                this.carY = this.carStartY;
                this.state = 'SCORING';
                this.roundMsgTimer = 2.0;
            }
        }
    }

    scorePeak() {
        // Check which zone the car arrows are pointing at
        let arrowLeftY = this.carY;
        let arrowRightY = this.carY;
        let pts = 0;
        // Check if any red bulb is at this Y level
        let hitRed = false;
        let closestBulb = null;
        let minDist = Infinity;
        for (let b of this.bulbs) {
            let d = Math.abs(b.y - arrowLeftY);
            if (d < minDist) { minDist = d; closestBulb = b; }
        }
        if (closestBulb && minDist < 15) {
            if (closestBulb.isRed) {
                hitRed = true;
                pts = 100;
            } else {
                pts = closestBulb.pts;
            }
        } else {
            // Check zone directly
            for (let z of this.zones) {
                if (arrowLeftY >= z.y && arrowLeftY < z.y + z.h) { pts = z.pts; break; }
            }
        }
        this.roundScore = pts;
        this.score += pts;
        this.roundsLeft--;
        if (hitRed) {
            this.roundMsg = 'RED LIGHT! +100';
        } else {
            this.roundMsg = '+' + pts + ' pts';
        }
    }

    draw(ctx) {
        // Road background
        ctx.fillStyle = '#444';
        ctx.fillRect(this.roadX, this.roadY, this.roadW, this.roadH);
        // Center black line
        ctx.fillStyle = '#000';
        ctx.fillRect(this.roadX + this.roadW / 2 - 3, this.roadY, 6, this.roadH);
        // Zone backgrounds on sides
        for (let z of this.zones) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = z.color;
            ctx.fillRect(this.roadX, z.y, this.roadW, z.h);
            ctx.globalAlpha = 1;
        }
        // Bulbs
        for (let b of this.bulbs) {
            let bx = b.side === 'left' ? this.roadX + 12 : this.roadX + this.roadW - 12;
            ctx.beginPath(); ctx.arc(bx, b.y, this.bulbRadius, 0, Math.PI * 2);
            if (b.isRed) {
                ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff0000';
            } else {
                ctx.fillStyle = b.color; ctx.shadowBlur = 4; ctx.shadowColor = b.color;
            }
            ctx.fill(); ctx.shadowBlur = 0;
        }
        // Force gauge
        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);
        ctx.strokeStyle = '#45a29e'; ctx.lineWidth = 2;
        ctx.strokeRect(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);
        // Gradient fill (green top -> red bottom)
        let grd = ctx.createLinearGradient(0, this.gaugeY, 0, this.gaugeY + this.gaugeH);
        grd.addColorStop(0, '#00ff00'); grd.addColorStop(1, '#ff0000');
        ctx.fillStyle = grd;
        let fillH = this.forcePercent * this.gaugeH;
        ctx.fillRect(this.gaugeX + 2, this.gaugeY + 2, this.gaugeW - 4, fillH);
        // Lever track
        ctx.fillStyle = '#333';
        ctx.fillRect(this.leverX - 4, this.leverTrackY, 8, this.leverTrackH);
        // Lever ball
        ctx.beginPath(); ctx.arc(this.leverX, this.leverBallY, this.leverBallR, 0, Math.PI * 2);
        ctx.fillStyle = '#e74c3c'; ctx.shadowBlur = 8; ctx.shadowColor = '#e74c3c';
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
        // Car
        let carDrawX = this.carX - this.carW / 2;
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(carDrawX, this.carY - this.carH / 2, this.carW, this.carH);
        ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
        ctx.strokeRect(carDrawX, this.carY - this.carH / 2, this.carW, this.carH);
        // Arrows on sides
        ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('◄', carDrawX - 8, this.carY);
        ctx.fillText('►', carDrawX + this.carW + 8, this.carY);
        ctx.textBaseline = 'alphabetic';
        // Zone labels on right side
        for (let i = 0; i < this.zones.length; i++) {
            let z = this.zones[i];
            ctx.font = '12px Orbitron'; ctx.fillStyle = z.color; ctx.textAlign = 'left';
            ctx.fillText(z.pts + 'pt', this.roadX + this.roadW + 15, z.y + z.h / 2 + 4);
        }
        // Round message
        if (this.state === 'SCORING' && this.roundMsg) {
            ctx.font = 'bold 30px Orbitron';
            ctx.fillStyle = this.roundScore >= 100 ? '#ff0000' : this.roundScore >= 50 ? '#FFD700' : '#66fcf1';
            ctx.textAlign = 'left';
            ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
            ctx.fillText(this.roundMsg, 100, 400);
            ctx.shadowBlur = 0;
        }
        drawHUD(this.score, null);
        ctx.font = '20px Orbitron'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
        ctx.fillText('Rounds: ' + this.roundsLeft, canvas.width - 40, 90);
        ctx.fillStyle = '#66fcf1'; ctx.font = '16px Inter'; ctx.textAlign = 'center';
        ctx.fillText('Drag the red ball down to set force!', 512, 730);
    }
}
