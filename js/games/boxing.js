class BoxingGame {
    constructor() {
        this.gameKey = 'game3';
        this.score = 0;
        this.isGameOver = false;
        
        this.punchesLeft = 5;
        
        // Move bar to the right
        this.bar = {
            x: 800,
            y: 150,
            w: 100,
            h: 500
        };
        this.markerY = this.bar.y;
        this.time = 0;
        this.speed = 6; // speed of sin wave
        this.hitting = false;
        this.hitMessage = "";
        this.hitScore = 0;
        this.hitMessageTimer = 0;
        this.shakeTimer = 0;
    }

    init() {
        // No timer - unlimited time, 5 punches
    }

    update(dt, input) {
        if(this.isGameOver) return;

        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        if (this.hitMessageTimer > 0) {
            this.hitMessageTimer -= dt;
            if (this.hitMessageTimer <= 0) {
                this.hitting = false;
                this.speed += 2.0; // Speed increases significantly each punch
                if (this.punchesLeft <= 0) {
                    this.isGameOver = true;
                }
            }
            return;
        }

        this.time += dt * this.speed;
        let p = (Math.sin(this.time) + 1) / 2; // 0 to 1
        this.markerY = this.bar.y + p * this.bar.h;

        if (input.isKeyJustPressed('Space')) {
            this.hitting = true;
            this.hitMessageTimer = 1.0;
            this.shakeTimer = 0.3;
            this.punchesLeft--;
            
            let center = this.bar.y + this.bar.h / 2;
            let dist = Math.abs(this.markerY - center);
            
            let points = 0;
            if (dist < 20) { points = 100; this.hitMessage = "PERFECT!"; }
            else if (dist < 80) { points = 50; this.hitMessage = "GREAT!"; }
            else if (dist < 150) { points = 20; this.hitMessage = "GOOD!"; }
            else { points = 5; this.hitMessage = "MISS!"; }
            
            this.hitScore = points;
            this.score += points;
        }
    }

    draw(ctx) {
        // Draw Machine
        ctx.save();
        if (this.shakeTimer > 0) {
            let shakeX = (Math.random() - 0.5) * 20;
            let shakeY = (Math.random() - 0.5) * 20;
            ctx.translate(shakeX, shakeY);
        }

        // Draw arcade punch machine base
        drawRect(ctx, 200, 300, 300, 450, '#1f2833', {blur: 10, color: '#45a29e'});
        // Draw screen on machine
        drawRect(ctx, 250, 350, 200, 100, '#0b0c10');
        // Draw punch bag (hanging or sticking out)
        drawRect(ctx, 330, 450, 40, 150, '#2a2a35');
        drawCircle(ctx, 350, 600, 60, '#ff007f', {blur: 15, color: '#ff007f'});

        if (this.hitting) {
            // Draw hit score on machine screen
            ctx.font = '50px Orbitron';
            ctx.fillStyle = '#66fcf1';
            ctx.textAlign = 'center';
            ctx.fillText(this.hitScore, 350, 420);

            // Draw message
            ctx.font = '60px Orbitron';
            ctx.fillStyle = this.hitMessage === "PERFECT!" ? '#ff007f' : '#66fcf1';
            ctx.fillText(this.hitMessage, 350, 250);
        } else {
            // Idle screen message
            ctx.font = '30px Orbitron';
            ctx.fillStyle = '#45a29e';
            ctx.textAlign = 'center';
            ctx.fillText("READY", 350, 410);
        }

        ctx.restore();

        // Draw Bar
        let gradient = ctx.createLinearGradient(0, this.bar.y, 0, this.bar.y + this.bar.h);
        gradient.addColorStop(0, '#00ff00'); // Green
        gradient.addColorStop(0.3, '#ffff00'); // Yellow
        gradient.addColorStop(0.5, '#ff0000'); // Red
        gradient.addColorStop(0.7, '#ffff00'); // Yellow
        gradient.addColorStop(1, '#00ff00'); // Green
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.bar.x, this.bar.y, this.bar.w, this.bar.h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.bar.x, this.bar.y, this.bar.w, this.bar.h);

        // Target Area outline
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.strokeRect(this.bar.x - 10, this.bar.y + this.bar.h/2 - 20, this.bar.w + 20, 40);

        // Draw Marker
        drawRect(ctx, this.bar.x - 20, this.markerY - 5, this.bar.w + 40, 10, '#fff', {blur: 15, color: '#fff'});

        drawHUD(this.score, null);

        // Punches left
        ctx.font = '20px Orbitron';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(`Punches: ${this.punchesLeft}`, canvas.width - 40, 90);

        ctx.fillStyle = '#66fcf1';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText("Press SPACE when the line is in the RED zone!", canvas.width/2, 720);
    }
}
