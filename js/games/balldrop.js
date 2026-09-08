class BallDropGame {
    constructor() {
        this.gameKey = 'game5';
        this.score = 0;
        this.isGameOver = false;
        // 1 minute timer
        this.timer = new Timer(60, () => { this.isGameOver = true; });
        
        // 10 moving buckets
        this.buckets = [];
        for(let i=0; i<10; i++) {
            this.buckets.push({
                x: i * 260,
                y: 600,
                w: 120,
                h: 150
            });
        }
        this.bucketSpeed = 150;
        
        this.balls = [];
        this.ballsLeft = 60;
        
        this.tubeX = 512;
        this.tubeY = 100;
        this.gravity = 800;
    }

    init() {
        this.timer.start();
    }

    update(dt, input) {
        if(this.isGameOver) return;

        this.timer.update(dt);

        // Update buckets
        for(let b of this.buckets) {
            b.x += this.bucketSpeed * dt;
            if(b.x > 1024 + 140) {
                b.x -= 2600; // loop back
            }
        }

        // Spawn ball
        if (input.isKeyJustPressed('Space') && this.ballsLeft > 0) {
            this.balls.push({
                x: this.tubeX,
                y: this.tubeY + 40,
                vy: 0,
                active: true
            });
            this.ballsLeft--;
        }

        // Update balls
        for(let ball of this.balls) {
            if(!ball.active) continue;
            
            ball.vy += this.gravity * dt;
            ball.y += ball.vy * dt;

            // Check collision with buckets
            if(ball.y > 600 && ball.y < 750) {
                for(let b of this.buckets) {
                    if(ball.x > b.x && ball.x < b.x + b.w) {
                        this.score++;
                        ball.active = false;
                        break;
                    }
                }
            }

            // Missed
            if(ball.y > 768) {
                ball.active = false;
            }
        }

        // End condition: time ran out OR all balls used and none active
        if(this.ballsLeft === 0 && this.balls.every(b => !b.active)) {
            this.isGameOver = true;
        }
    }

    draw(ctx) {
        // Draw top tube
        drawRect(ctx, this.tubeX - 30, 0, 60, this.tubeY, '#2a2a35');
        drawRect(ctx, this.tubeX - 35, this.tubeY, 70, 20, '#66fcf1', {blur: 10, color: '#66fcf1'});

        // Draw buckets
        for(let b of this.buckets) {
            drawRect(ctx, b.x, b.y, b.w, b.h, '#ff007f', {blur: 15, color: '#ff007f'});
            ctx.fillStyle = '#000';
            ctx.fillRect(b.x + 5, b.y, b.w - 10, b.h - 5);
        }

        // Draw balls
        for(let ball of this.balls) {
            if(ball.active) {
                drawCircle(ctx, ball.x, ball.y, 15, '#b829ea');
            }
        }

        drawHUD(this.score, this.timer.getFormattedTime());
        
        ctx.font = '20px Orbitron';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(`Balls Left: ${this.ballsLeft}`, canvas.width - 40, 90);

        if (this.ballsLeft > 0) {
            ctx.fillStyle = '#66fcf1';
            ctx.font = '20px Inter';
            ctx.textAlign = 'center';
            ctx.fillText("Press SPACE to drop a ball!", canvas.width/2, 50);
        }
    }
}
