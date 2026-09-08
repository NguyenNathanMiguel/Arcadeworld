class PachinkoGame {
    constructor() {
        this.gameKey = 'game9';
        this.score = 0;
        this.isGameOver = false;
        this.boxX = 262; this.boxY = 80; this.boxW = 500; this.boxH = 620;
        this.cannonX = this.boxX + this.boxW / 2;
        this.cannonY = this.boxY - 5;
        this.cannonRadius = 22;
        this.cannonSpeed = 300;
        this.cannonDir = 1;
        this.ballsLeft = 50;
        this.ballRadius = 6;
        this.balls = [];
        this.gravity = 500;
        this.bounceDamping = 0.55;
        this.friction = 0.98;
        this.timer = new Timer(90, () => { this.isGameOver = true; });
        this.pegs = [];
        this.pegRadius = 8;
        this.setupPegs();
        this.barLength = 90;
        this.barThickness = 6;
        this.barAngle1 = 0;
        this.barAngle2 = 0;
        this.barSpeed = 1.8;
        this.barY = this.boxY + 370;
        let thirdW = this.boxW / 3;
        this.bar1X = this.boxX + thirdW;
        this.bar2X = this.boxX + thirdW * 2;
        this.dividers = [];
        this.holeScores = [2, 5, 10, 5, 2];
        this.setupDividers();
        this.popups = [];
        this.shootCooldown = 0;
    }

    setupPegs() {
        this.pegs = [];
        let pegZoneY = this.boxY + 60;
        let rows = [5, 6, 5, 6];
        let rowGap = 55;
        for (let r = 0; r < rows.length; r++) {
            let count = rows[r];
            let rowY = pegZoneY + r * rowGap;
            let spacing = this.boxW / (count + 1);
            for (let c = 0; c < count; c++) {
                this.pegs.push({ x: this.boxX + spacing * (c + 1), y: rowY });
            }
        }
    }

    setupDividers() {
        this.dividers = [];
        let slotWidth = this.boxW / 5;
        let divY = this.boxY + this.boxH - 60;
        for (let i = 1; i <= 4; i++) {
            this.dividers.push({ x: this.boxX + slotWidth * i - 2, y: divY, w: 4, h: 60 });
        }
        this.slotBottomY = divY;
    }

    init() { this.timer.start(); }

    update(dt, input) {
        if (this.isGameOver) return;
        this.timer.update(dt);
        if (this.timer.timeLeft <= 0) { this.isGameOver = true; return; }
        this.cannonX += this.cannonDir * this.cannonSpeed * dt;
        let minCannonX = this.boxX + this.cannonRadius + 5;
        let maxCannonX = this.boxX + this.boxW - this.cannonRadius - 5;
        if (this.cannonX >= maxCannonX) {
            this.cannonX = maxCannonX;
            this.cannonDir = -1;
        } else if (this.cannonX <= minCannonX) {
            this.cannonX = minCannonX;
            this.cannonDir = 1;
        }
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (input.isKeyPressed('Space') && this.ballsLeft > 0 && this.shootCooldown <= 0) {
            this.balls.push({ x: this.cannonX, y: this.cannonY + this.cannonRadius + this.ballRadius + 5, vx: (Math.random() - 0.5) * 30, vy: 50, active: true });
            this.ballsLeft--;
            this.shootCooldown = 0.05;
        }
        this.barAngle1 += this.barSpeed * dt;
        this.barAngle2 -= this.barSpeed * dt;
        for (let ball of this.balls) {
            if (!ball.active) continue;
            ball.vy += this.gravity * dt;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;
            ball.vx *= this.friction;
            if (ball.x - this.ballRadius < this.boxX) { ball.x = this.boxX + this.ballRadius; ball.vx = Math.abs(ball.vx) * this.bounceDamping; }
            if (ball.x + this.ballRadius > this.boxX + this.boxW) { ball.x = this.boxX + this.boxW - this.ballRadius; ball.vx = -Math.abs(ball.vx) * this.bounceDamping; }
            for (let peg of this.pegs) {
                let dx = ball.x - peg.x, dy = ball.y - peg.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let minDist = this.ballRadius + this.pegRadius;
                if (dist < minDist && dist > 0) {
                    let nx = dx / dist, ny = dy / dist;
                    ball.x = peg.x + nx * minDist; ball.y = peg.y + ny * minDist;
                    let dot = ball.vx * nx + ball.vy * ny;
                    ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
                    ball.vx *= this.bounceDamping; ball.vy *= this.bounceDamping;
                    ball.vx += (Math.random() - 0.5) * 40;
                }
            }
            this.collideBar(ball, this.bar1X, this.barY, this.barAngle1);
            this.collideBar(ball, this.bar2X, this.barY, this.barAngle2);
            for (let div of this.dividers) {
                if (ball.y + this.ballRadius > div.y && ball.y - this.ballRadius < div.y + div.h && ball.x + this.ballRadius > div.x && ball.x - this.ballRadius < div.x + div.w) {
                    if (ball.x < div.x + div.w / 2) { ball.x = div.x - this.ballRadius; ball.vx = -Math.abs(ball.vx) * this.bounceDamping; }
                    else { ball.x = div.x + div.w + this.ballRadius; ball.vx = Math.abs(ball.vx) * this.bounceDamping; }
                }
            }
            if (ball.y > this.boxY + this.boxH - 10) {
                ball.active = false;
                let relX = ball.x - this.boxX;
                let slotIdx = Math.max(0, Math.min(4, Math.floor(relX / (this.boxW / 5))));
                let pts = this.holeScores[slotIdx];
                this.score += pts;
                this.popups.push({ x: ball.x, y: this.boxY + this.boxH - 30, text: '+' + pts, timer: 1, color: pts === 10 ? '#ffcc00' : pts === 5 ? '#66fcf1' : '#aaa' });
            }
        }
        this.balls = this.balls.filter(b => b.active);
        for (let p of this.popups) { p.timer -= dt; p.y -= 30 * dt; }
        this.popups = this.popups.filter(p => p.timer > 0);
        if (this.ballsLeft <= 0 && this.balls.length === 0) this.isGameOver = true;
    }

    collideBar(ball, px, py, angle) {
        let endX = px + Math.sin(angle) * this.barLength;
        let endY = py + Math.cos(angle) * this.barLength;
        let dx = endX - px, dy = endY - py;
        let len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        let t = Math.max(0, Math.min(1, ((ball.x - px) * dx + (ball.y - py) * dy) / (len * len)));
        let cx = px + t * dx, cy = py + t * dy;
        let distX = ball.x - cx, distY = ball.y - cy;
        let dist = Math.sqrt(distX * distX + distY * distY);
        let minDist = this.ballRadius + this.barThickness / 2;
        if (dist < minDist && dist > 0) {
            let nx = distX / dist, ny = distY / dist;
            ball.x = cx + nx * minDist; ball.y = cy + ny * minDist;
            let dot = ball.vx * nx + ball.vy * ny;
            ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
            ball.vx *= this.bounceDamping; ball.vy *= this.bounceDamping;
        }
    }

    draw(ctx) {
        ctx.strokeStyle = '#66fcf1'; ctx.lineWidth = 3;
        ctx.shadowBlur = 15; ctx.shadowColor = '#66fcf1';
        ctx.strokeRect(this.boxX, this.boxY, this.boxW, this.boxH);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(30,40,60,0.4)';
        ctx.fillRect(this.boxX, this.boxY, this.boxW, this.boxH);
        // Cannon
        ctx.beginPath(); ctx.arc(this.cannonX, this.cannonY, this.cannonRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#3a3a4a'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff007f'; ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#555'; ctx.fillRect(this.cannonX - 6, this.cannonY + this.cannonRadius - 2, 12, 14);
        ctx.strokeStyle = '#ff007f'; ctx.strokeRect(this.cannonX - 6, this.cannonY + this.cannonRadius - 2, 12, 14);
        ctx.beginPath(); ctx.arc(this.cannonX, this.cannonY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ff007f'; ctx.fill();
        // Pegs
        for (let peg of this.pegs) {
            ctx.beginPath(); ctx.arc(peg.x, peg.y, this.pegRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#b829ea'; ctx.shadowBlur = 6; ctx.shadowColor = '#b829ea'; ctx.fill(); ctx.shadowBlur = 0;
            ctx.strokeStyle = '#d45eff'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        // Bars
        this.drawBar(ctx, this.bar1X, this.barY, this.barAngle1);
        this.drawBar(ctx, this.bar2X, this.barY, this.barAngle2);
        // Dividers
        for (let div of this.dividers) {
            ctx.fillStyle = '#45a29e'; ctx.shadowBlur = 4; ctx.shadowColor = '#45a29e';
            ctx.fillRect(div.x, div.y, div.w, div.h); ctx.shadowBlur = 0;
        }
        // Slot labels
        let sw = this.boxW / 5;
        for (let i = 0; i < 5; i++) {
            ctx.font = 'bold 18px Orbitron';
            ctx.fillStyle = i === 2 ? '#ffcc00' : (i === 1 || i === 3) ? '#66fcf1' : '#888';
            ctx.textAlign = 'center';
            ctx.shadowBlur = i === 2 ? 10 : 4; ctx.shadowColor = i === 2 ? '#ffcc00' : '#66fcf1';
            ctx.fillText(this.holeScores[i], this.boxX + sw * i + sw / 2, this.boxY + this.boxH - 15);
            ctx.shadowBlur = 0;
        }
        // Balls
        for (let ball of this.balls) {
            if (!ball.active) continue;
            ctx.beginPath(); ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4444'; ctx.shadowBlur = 6; ctx.shadowColor = '#ff4444'; ctx.fill(); ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ff8888'; ctx.lineWidth = 1; ctx.stroke();
        }
        // Popups
        for (let p of this.popups) {
            ctx.font = 'bold 20px Orbitron'; ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.min(1, p.timer / 0.3); ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1;
        }
        drawHUD(this.score, this.timer.getFormattedTime());
        ctx.font = '20px Orbitron'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
        ctx.fillText('Balls: ' + this.ballsLeft, canvas.width - 40, 90);
        ctx.fillStyle = '#66fcf1'; ctx.font = '16px Inter'; ctx.textAlign = 'center';
        ctx.fillText('SPACE to drop ball (Cannon moves automatically)', 512, 730);
    }

    drawBar(ctx, px, py, angle) {
        let endX = px + Math.sin(angle) * this.barLength;
        let endY = py + Math.cos(angle) * this.barLength;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = this.barThickness;
        ctx.shadowBlur = 6; ctx.shadowColor = '#ffcc00'; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
    }
}
