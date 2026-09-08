class ZombieSnatcherGame {
    constructor() {
        this.gameKey = 'game12';
        this.isGameOver = false;
        this.score = 0;
        this.flipsLeft = 3;
        
        this.cx = 512;
        this.cy = 350;
        this.outerRadius = 250;
        this.hubRadius = 50;
        
        this.discAngle = 0;
        this.discSpeed = 0.8; // radians per second
        
        this.flipperState = 'idle'; // 'idle', 'swinging', 'returning'
        this.flipperTimer = 0;
        this.flipperDuration = 0.15; // 0.15s out, 0.15s back
        
        this.pivotAngle = Math.PI / 2 - 0.4;
        this.pivotX = this.cx + this.outerRadius * Math.cos(this.pivotAngle);
        this.pivotY = this.cy + this.outerRadius * Math.sin(this.pivotAngle);
        this.armLength = 110;
        this.restArmAngle = this.pivotAngle + Math.PI + 0.69;
        this.swingArmAngle = this.pivotAngle + Math.PI - 1.2;
        this.currentArmAngle = this.restArmAngle;
        
        this.flashTimer = 0;
        this.gameOverTimer = undefined;
        
        this.balls = [];
        this.initBalls();
    }
    
    initBalls() {
        const types = [
            { pts: 20, count: 5, color: '#aaaaaa' },
            { pts: 50, count: 4, color: '#00cc44' },
            { pts: 100, count: 3, color: '#3399ff' },
            { pts: 250, count: 2, color: '#9b59b6' },
            { pts: 500, count: 1, color: '#ffcc00' }
        ];
        
        for (let t of types) {
            for (let i = 0; i < t.count; i++) {
                this.balls.push({
                    baseAngle: Math.random() * Math.PI * 2,
                    distance: 80 + Math.random() * 140, // 80 to 220
                    pts: t.pts,
                    color: t.color,
                    scored: false
                });
            }
        }
    }
    
    init() {}
    
    update(dt, input) {
        if (this.isGameOver) return;
        
        if (this.gameOverTimer !== undefined) {
            this.gameOverTimer -= dt;
            if (this.gameOverTimer <= 0) {
                this.isGameOver = true;
            }
        }
        
        this.discAngle += dt * this.discSpeed;
        
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }
        
        if (this.flipperState === 'idle') {
            if (input.isKeyJustPressed('Space') && this.flipsLeft > 0) {
                this.flipperState = 'swinging';
                this.flipperTimer = 0;
                this.flipsLeft--;
            }
        } else if (this.flipperState === 'swinging') {
            this.flipperTimer += dt;
            let t = this.flipperTimer / this.flipperDuration;
            if (t >= 1) {
                t = 1;
                this.flipperState = 'returning';
                this.flipperTimer = 0;
            }
            // ease out quad
            t = t * (2 - t);
            this.currentArmAngle = this.restArmAngle + (this.swingArmAngle - this.restArmAngle) * t;
            this.checkCollisions();
        } else if (this.flipperState === 'returning') {
            this.flipperTimer += dt;
            let t = this.flipperTimer / this.flipperDuration;
            if (t >= 1) {
                t = 1;
                this.flipperState = 'idle';
                this.flipperTimer = 0;
                
                if (this.flipsLeft <= 0 && this.gameOverTimer === undefined) {
                    this.gameOverTimer = 1.0;
                }
            }
            // ease in quad
            t = t * t;
            this.currentArmAngle = this.swingArmAngle + (this.restArmAngle - this.swingArmAngle) * t;
            this.checkCollisions();
        }
    }
    
    checkCollisions() {
        const fx = this.pivotX + this.armLength * Math.cos(this.currentArmAngle);
        const fy = this.pivotY + this.armLength * Math.sin(this.currentArmAngle);
        
        for (let b of this.balls) {
            if (b.scored) continue;
            
            let curAng = b.baseAngle + this.discAngle;
            let bx = this.cx + b.distance * Math.cos(curAng);
            let by = this.cy + b.distance * Math.sin(curAng);
            
            let dist = Math.hypot(fx - bx, fy - by);
            if (dist < 32) { // 10 (black ball r) + 22 (point ball r)
                // check if near hole (Math.PI / 2)
                let diff = this.normalizeAngle(curAng - Math.PI / 2);
                if (Math.abs(diff) < 0.6) {
                    b.scored = true;
                    this.score += b.pts;
                    this.flashTimer = 0.15;
                }
            }
        }
    }
    
    normalizeAngle(a) {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }
    
    draw(ctx) {
        // Background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, 1024, 768);
        
        // Flash effect
        if (this.flashTimer > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashTimer * 4})`;
            ctx.fillRect(0, 0, 1024, 768);
        }
        
        // Disc base
        let grad = ctx.createRadialGradient(this.cx, this.cy, this.hubRadius, this.cx, this.cy, this.outerRadius);
        grad.addColorStop(0, '#111111');
        grad.addColorStop(1, '#222222');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.outerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Disc rim (with gap)
        const holeHalfArc = 0.12;
        const startArc = Math.PI / 2 + holeHalfArc;
        const endArc = Math.PI / 2 - holeHalfArc; // effectively 2*PI - (...) due to canvas clockwise drawing
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.outerRadius, startArc, endArc);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Hole glow markers
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.outerRadius, Math.PI/2 - holeHalfArc - 0.05, Math.PI/2 - holeHalfArc);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.outerRadius, Math.PI/2 + holeHalfArc, Math.PI/2 + holeHalfArc + 0.05);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Hub
        ctx.fillStyle = '#0a0a0a';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.hubRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Balls
        for (let b of this.balls) {
            let curAng = b.baseAngle + this.discAngle;
            let bx = this.cx + b.distance * Math.cos(curAng);
            let by = this.cy + b.distance * Math.sin(curAng);
            
            ctx.globalAlpha = b.scored ? 0.2 : 1.0;
            
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(bx, by, 22, 0, Math.PI * 2);
            ctx.fill();
            
            // Brain pattern (simple squiggles)
            ctx.strokeStyle = 'rgba(255, 100, 200, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx - 6, by - 8);
            ctx.quadraticCurveTo(bx - 12, by - 6, bx - 14, by);
            ctx.quadraticCurveTo(bx - 12, by + 10, bx - 6, by + 8);
            ctx.moveTo(bx + 6, by - 8);
            ctx.quadraticCurveTo(bx + 12, by - 6, bx + 14, by);
            ctx.quadraticCurveTo(bx + 12, by + 10, bx + 6, by + 8);
            ctx.moveTo(bx, by - 12);
            ctx.lineTo(bx, by + 10);
            ctx.stroke();
            
            // Points text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(b.pts, bx, by);
            ctx.shadowBlur = 0;
            
            ctx.globalAlpha = 1.0;
        }
        
        // Flipper
        const fx = this.pivotX + this.armLength * Math.cos(this.currentArmAngle);
        const fy = this.pivotY + this.armLength * Math.sin(this.currentArmAngle);
        
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.pivotX, this.pivotY);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        
        // Flipper pivot
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(this.pivotX, this.pivotY, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Flipper black ball
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx, fy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // HUD
        drawHUD(this.score, null);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Flips: ${this.flipsLeft}/3`, 1000, 40);
        
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to flip!', 512, 740);
    }
}
