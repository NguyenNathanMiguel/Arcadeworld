class WhackAMoleGame {
    constructor() {
        this.gameKey = 'game2';
        this.score = 0;
        this.isGameOver = false;
        this.timer = new Timer(90, () => { this.isGameOver = true; });
        
        this.holes = [];
        let startX = 260;
        let startY = 250;
        for (let i=0; i<3; i++) {
            for (let j=0; j<3; j++) {
                this.holes.push({
                    x: startX + j * 250,
                    y: startY + i * 200,
                    radius: 60,
                    state: 0, // 0: down, 1: up
                    timer: 0
                });
            }
        }
        this.spawnTimer = 0;
    }

    init() {
        this.timer.start();
    }

    update(dt, input) {
        this.timer.update(dt);
        if(this.isGameOver) return;
        
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            let availableHoles = this.holes.filter(h => h.state === 0);
            if (availableHoles.length > 0) {
                let hole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
                hole.state = 1;
                hole.timer = Math.random() * 1.5 + 0.5; // Up for 0.5 - 2s
            }
            this.spawnTimer = Math.random() * 1.0 + 0.2;
        }

        for (let hole of this.holes) {
            if (hole.state === 1) {
                hole.timer -= dt;
                if (hole.timer <= 0) {
                    hole.state = 0;
                }
                
                // Click detect
                if (input.mouse.justPressed) {
                    let m = new Vector(input.mouse.x, input.mouse.y);
                    if (m.dist(new Vector(hole.x, hole.y)) < hole.radius) {
                        hole.state = 0;
                        this.score++;
                    }
                }
            }
        }
    }

    draw(ctx) {
        for (let hole of this.holes) {
            // Draw hole
            drawCircle(ctx, hole.x, hole.y, hole.radius, '#1f2833');
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#45a29e';
            ctx.stroke();
            
            if (hole.state === 1) {
                // Draw mole
                drawCircle(ctx, hole.x, hole.y - 20, hole.radius * 0.8, '#ff007f', {blur: 15, color: '#ff007f'});
                // Eyes
                drawCircle(ctx, hole.x - 15, hole.y - 30, 5, '#fff');
                drawCircle(ctx, hole.x + 15, hole.y - 30, 5, '#fff');
            }
        }
        
        drawHUD(this.score, this.timer.getFormattedTime());
    }
}
