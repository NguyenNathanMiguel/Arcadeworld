class PopTheLockGame {
    constructor() {
        this.gameKey = 'game7';
        this.score = 0;
        this.isGameOver = false;

        this.cx = 512;
        this.cy = 384;
        this.outerRadius = 220;
        this.innerRadius = 70;
        this.gapCenter = (this.outerRadius + this.innerRadius) / 2; // ~145
        this.targetRadius = 14;

        this.barAngle = -Math.PI / 2;
        this.barDirection = 1; // 1=clockwise, -1=counterclockwise
        this.barSpeed = 2.0;

        this.targetAngle = Math.PI / 4;
        this.targetTolerance = 0.18; // radians, ~10 degrees

        this.tapsLeft = 50;
        this.successCount = 0;
        this.barPassedTarget = false;
        this.prevAngleDiff = 0;

        this.particles = [];
        this.flashTimer = 0;

        // 3-second countdown before game starts
        this.countdownTimer = 3.0;
        this.gameStarted = false;
    }

    init() {
        this.placeTarget(true);
    }

    placeTarget(firstTime) {
        if (firstTime) {
            this.targetAngle = Math.random() * Math.PI * 2;
            return;
        }
        // Place target in the new direction, closer as more successes
        let minDeg = Math.max(20, 80 - this.successCount * 1.2);
        let maxDeg = Math.max(50, 130 - this.successCount * 1.5);
        let offsetDeg = minDeg + Math.random() * (maxDeg - minDeg);
        let offsetRad = (offsetDeg * Math.PI) / 180;
        this.targetAngle = this.barAngle + this.barDirection * offsetRad;
        // Normalize
        this.targetAngle = this.normalizeAngle(this.targetAngle);
    }

    normalizeAngle(a) {
        while (a < -Math.PI) a += Math.PI * 2;
        while (a > Math.PI) a -= Math.PI * 2;
        return a;
    }

    angleDiff(a, b) {
        let d = a - b;
        while (d < -Math.PI) d += Math.PI * 2;
        while (d > Math.PI) d -= Math.PI * 2;
        return d;
    }

    update(dt, input) {
        if (this.isGameOver) return;

        // Countdown phase
        if (!this.gameStarted) {
            this.countdownTimer -= dt;
            if (this.countdownTimer <= 0) {
                this.gameStarted = true;
            }
            return;
        }

        // Move bar
        this.barAngle += this.barSpeed * this.barDirection * dt;
        this.barAngle = this.normalizeAngle(this.barAngle);

        // Check if bar passed target
        let diff = this.angleDiff(this.barAngle, this.targetAngle);
        let absDiff = Math.abs(diff);

        // Detect passing: the sign of diff flips relative to direction
        let passDir = diff * this.barDirection;
        if (passDir > this.targetTolerance + 0.1 && this.successCount > 0) {
            // Bar has passed the target
            this.isGameOver = true;
            return;
        }
        // For first target, start tracking after bar is close once
        if (this.successCount === 0 && !this.barPassedTarget) {
            if (absDiff < 0.5) this.barPassedTarget = true;
        }
        if (this.successCount === 0 && this.barPassedTarget && passDir > this.targetTolerance + 0.1) {
            this.isGameOver = true;
            return;
        }

        // Player input
        if (input.isKeyJustPressed('Space')) {
            if (absDiff <= this.targetTolerance) {
                // Success
                this.score += 10;
                this.successCount++;
                this.tapsLeft--;

                // Spawn particles
                this.spawnParticles();
                this.flashTimer = 0.2;

                if (this.tapsLeft <= 0) {
                    this.isGameOver = true;
                    return;
                }

                // Reverse direction
                this.barDirection *= -1;
                // Speed up slightly
                this.barSpeed += 0.025;
                // Place new target
                this.placeTarget(false);
                this.barPassedTarget = false;
            } else {
                // Pressed too early/late - game over
                this.isGameOver = true;
            }
        }

        // Update particles
        for (let p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);

        if (this.flashTimer > 0) this.flashTimer -= dt;
    }

    spawnParticles() {
        let tx = this.cx + Math.cos(this.targetAngle) * this.gapCenter;
        let ty = this.cy + Math.sin(this.targetAngle) * this.gapCenter;
        for (let i = 0; i < 12; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = 100 + Math.random() * 150;
            this.particles.push({
                x: tx, y: ty,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.3
            });
        }
    }

    draw(ctx) {
        // Outer circle
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#45a29e';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#45a29e';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner circle
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1f2833';
        ctx.fill();
        ctx.strokeStyle = '#45a29e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Countdown or taps left in center
        if (!this.gameStarted) {
            // Show countdown number
            let countNum = Math.ceil(this.countdownTimer);
            ctx.font = 'bold 80px Orbitron';
            ctx.fillStyle = '#ff007f';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff007f';
            ctx.fillText(countNum, this.cx, this.cy);
            ctx.shadowBlur = 0;
            ctx.textBaseline = 'alphabetic';

            // "Get Ready" text
            ctx.font = '22px Orbitron';
            ctx.fillStyle = '#66fcf1';
            ctx.textAlign = 'center';
            ctx.fillText('GET READY!', this.cx, this.cy + this.outerRadius + 50);
        } else {
            // Taps left in center
            ctx.font = '40px Orbitron';
            ctx.fillStyle = this.flashTimer > 0 ? '#66fcf1' : '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.tapsLeft, this.cx, this.cy);
            ctx.textBaseline = 'alphabetic';
        }

        // Target dot
        let tx = this.cx + Math.cos(this.targetAngle) * this.gapCenter;
        let ty = this.cy + Math.sin(this.targetAngle) * this.gapCenter;
        ctx.beginPath();
        ctx.arc(tx, ty, this.targetRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Bar (line from inner to outer circle along barAngle)
        let bx1 = this.cx + Math.cos(this.barAngle) * (this.innerRadius + 5);
        let by1 = this.cy + Math.sin(this.barAngle) * (this.innerRadius + 5);
        let bx2 = this.cx + Math.cos(this.barAngle) * (this.outerRadius - 5);
        let by2 = this.cy + Math.sin(this.barAngle) * (this.outerRadius - 5);
        ctx.beginPath();
        ctx.moveTo(bx1, by1);
        ctx.lineTo(bx2, by2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#66fcf1';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Particles
        for (let p of this.particles) {
            let alpha = p.life / 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(102,252,241,${alpha})`;
            ctx.fill();
        }

        drawHUD(this.score, null);

        ctx.font = '18px Inter';
        ctx.fillStyle = '#66fcf1';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE when the bar hits the dot!', this.cx, 720);
    }
}
