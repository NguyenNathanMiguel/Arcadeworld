class ClawMachineGame {
    constructor() {
        this.gameKey = 'game4';
        this.score = 0;
        this.isGameOver = false;
        this.timer = new Timer(90, () => { this.isGameOver = true; });
        
        this.claw = {
            x: 512,
            y: 100,
            state: 'idle', // idle, movingDown, movingUp, holding
            heldPlushie: null,
            willDrop: false,
            dropY: 0
        };
        
        this.plushies = [];
        this.spawnPlushies();
    }

    spawnPlushies() {
        this.plushies = [];
        for(let i=0; i<15; i++) {
            let rand = Math.random();
            let type = 1;
            let color = '#45a29e'; // 1 pt
            let prob = 1.0;
            if (rand < 0.2) { type = 10; color = '#ff007f'; prob = 0.1; }
            else if (rand < 0.6) { type = 3; color = '#b829ea'; prob = 0.6; }

            let startY = 650 + Math.random() * 50;
            this.plushies.push({
                x: 100 + Math.random() * 800,
                y: startY,
                groundY: startY,
                radius: 30,
                type: type,
                color: color,
                prob: prob,
                active: true,
                falling: false,
                vy: 0
            });
        }
    }

    init() {
        this.timer.start();
    }

    update(dt, input) {
        this.timer.update(dt);
        if(this.isGameOver) return;

        // Update falling plushies
        for(let p of this.plushies) {
            if (p.falling) {
                p.vy += 1000 * dt; // gravity
                p.y += p.vy * dt;
                if (p.y >= p.groundY) {
                    p.y = p.groundY;
                    p.falling = false;
                }
            }
        }

        if (this.claw.state === 'idle') {
            if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('KeyA')) this.claw.x -= 200 * dt;
            if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('KeyD')) this.claw.x += 200 * dt;
            
            // Constrain
            if (this.claw.x < 50) this.claw.x = 50;
            if (this.claw.x > 974) this.claw.x = 974;

            if (input.isKeyJustPressed('Space')) {
                this.claw.state = 'movingDown';
            }
        } else if (this.claw.state === 'movingDown') {
            this.claw.y += 300 * dt;
            if (this.claw.y >= 650) {
                // Check collision
                let caught = null;
                for (let p of this.plushies) {
                    if (p.active && !p.falling && Math.abs(p.x - this.claw.x) < 40) {
                        caught = p;
                        break;
                    }
                }
                
                if (caught) {
                    this.claw.heldPlushie = caught;
                    caught.active = false;
                    this.claw.state = 'holding';
                    
                    if (Math.random() <= caught.prob) {
                        this.claw.willDrop = false; // Success
                    } else {
                        this.claw.willDrop = true; // Fail midway
                        this.claw.dropY = 650 - (Math.random() * 300 + 100); // Drops between y=250 and y=550
                    }
                } else {
                    this.claw.state = 'movingUp';
                }
            }
        } else if (this.claw.state === 'holding') {
            this.claw.y -= 300 * dt;
            this.claw.heldPlushie.x = this.claw.x;
            this.claw.heldPlushie.y = this.claw.y + 40;

            if (this.claw.willDrop && this.claw.y <= this.claw.dropY) {
                // Drop plushie halfway
                this.claw.heldPlushie.active = true;
                this.claw.heldPlushie.falling = true;
                this.claw.heldPlushie.vy = 0;
                this.claw.heldPlushie = null;
                this.claw.state = 'movingUp';
            } else if (this.claw.y <= 100) {
                // Successfully reached top
                this.claw.y = 100;
                this.score += this.claw.heldPlushie.type;
                this.claw.heldPlushie = null;
                
                if (this.plushies.filter(p=>p.active).length === 0) {
                    this.spawnPlushies();
                }
                this.claw.state = 'idle';
            }
        } else if (this.claw.state === 'movingUp') {
            this.claw.y -= 300 * dt;
            if (this.claw.y <= 100) {
                this.claw.y = 100;
                this.claw.state = 'idle';
            }
        }
    }

    draw(ctx) {
        // Draw track
        drawRect(ctx, 0, 80, 1024, 20, '#2a2a35');

        // Draw plushies
        for(let p of this.plushies) {
            if (p.active || p.falling || this.claw.heldPlushie === p) {
                drawCircle(ctx, p.x, p.y, p.radius, p.color, {blur: 10, color: p.color});
                ctx.fillStyle = '#fff';
                ctx.font = '20px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText(p.type, p.x, p.y + 7);
            }
        }

        // Draw claw wire
        ctx.beginPath();
        ctx.moveTo(this.claw.x, 100);
        ctx.lineTo(this.claw.x, this.claw.y);
        ctx.strokeStyle = '#c5c6c7';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw claw
        drawRect(ctx, this.claw.x - 20, this.claw.y, 40, 20, '#66fcf1');
        ctx.beginPath();
        if (this.claw.state === 'idle' || this.claw.state === 'movingDown' || (this.claw.state === 'movingUp' && !this.claw.heldPlushie)) {
            // Claw open
            ctx.moveTo(this.claw.x - 20, this.claw.y + 20);
            ctx.lineTo(this.claw.x - 40, this.claw.y + 50);
            ctx.moveTo(this.claw.x + 20, this.claw.y + 20);
            ctx.lineTo(this.claw.x + 40, this.claw.y + 50);
        } else {
            // Claw closed
            ctx.moveTo(this.claw.x - 20, this.claw.y + 20);
            ctx.lineTo(this.claw.x - 10, this.claw.y + 50);
            ctx.moveTo(this.claw.x + 20, this.claw.y + 20);
            ctx.lineTo(this.claw.x + 10, this.claw.y + 50);
        }
        ctx.stroke();

        drawHUD(this.score, this.timer.getFormattedTime());
        
        if (this.claw.state === 'idle') {
            ctx.fillStyle = '#66fcf1';
            ctx.font = '20px Inter';
            ctx.textAlign = 'center';
            ctx.fillText("Use LEFT/RIGHT or A/D to move, SPACE to drop claw", canvas.width/2, 50);
        }
    }
}
