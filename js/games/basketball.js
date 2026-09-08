class BasketballGame {
    constructor() {
        this.gameKey = 'game1';
        this.isGameOver = false;
        this.score = 0;
        
        // Timer (90 seconds)
        this.timer = new Timer(90, () => {
            this.isGameOver = true;
        });

        // Balls array
        this.startPos = new Vector(750, 450);
        this.balls = [];
        for (let i = 0; i < 3; i++) {
            this.balls.push({
                pos: new Vector(this.startPos.x, this.startPos.y),
                vel: new Vector(0, 0),
                radius: 20,
                state: 'ready', // 'ready', 'thrown', 'rolling', 'returning'
                scored: false
            });
        }
        
        // Physics and Layout
        this.gravity = 1500;
        this.slopeGravity = 400; // Acceleration to the right along slope
        
        // Hoop parameters
        this.hoopY = 250;
        this.hoopLeft = 150;
        this.hoopRight = 250;
        
        this.backboardX = 100;
        this.backboardTop = 150;
        this.backboardBottom = 300;
        
        // Back wall
        this.backWallX = 60;
        this.backWallTop = 200;
        this.backWallBottom = 580;
        
        // Platform (trapezoid)
        this.platformLeftX = 80;
        this.platformLeftTopY = 500;
        this.platformLeftBottomY = 580;
        this.platformRightX = 700;
        this.platformRightTopY = 560;
        this.platformRightBottomY = 580;
        
        // Stopper
        this.stopperX = 720;
        this.stopperTop = 555;
        this.stopperBottom = 585;

        // Interaction
        this.draggingBall = null;
        this.dragStartMouse = new Vector(0,0);
        this.maxDragDist = 150;
        this.throwMultiplier = 10;
    }

    init() {
        this.isGameOver = false;
        this.score = 0;
        
        this.balls.forEach((b, index) => {
            b.pos.x = this.startPos.x;
            b.pos.y = this.startPos.y;
            b.vel.x = 0;
            b.vel.y = 0;
            b.state = 'ready';
            b.scored = false;
        });
        
        this.draggingBall = null;
        this.timer.start();
    }

    update(dt, input) {
        if (this.isGameOver) return;
        
        this.timer.update(dt);

        // Input handling for dragging 'ready' balls
        if (input.mouse.justPressed) {
            for (let b of this.balls) {
                if (b.state === 'ready') {
                    let dist = new Vector(input.mouse.x, input.mouse.y).dist(b.pos);
                    if (dist < b.radius + 10) {
                        this.draggingBall = b;
                        break;
                    }
                }
            }
        }

        if (this.draggingBall) {
            if (!input.mouse.down) {
                // Release and throw
                let dragVec = new Vector(this.draggingBall.pos.x - input.mouse.x, this.draggingBall.pos.y - input.mouse.y);
                if (dragVec.mag() > this.maxDragDist) {
                    dragVec.normalize();
                    dragVec.mult(this.maxDragDist);
                }
                this.draggingBall.vel = new Vector(dragVec.x * this.throwMultiplier, dragVec.y * this.throwMultiplier);
                this.draggingBall.state = 'thrown';
                this.draggingBall.scored = false;
                this.draggingBall = null;
            }
        }

        // Platform surface line eq: y = mx + b
        let platM = (this.platformRightTopY - this.platformLeftTopY) / (this.platformRightX - this.platformLeftX);
        let platB = this.platformLeftTopY - platM * this.platformLeftX;

        // Update balls
        for (let b of this.balls) {
            if (b.state === 'ready') {
                // Just keep it at start pos
                b.pos.x = this.startPos.x;
                b.pos.y = this.startPos.y;
            } else if (b.state === 'thrown') {
                let oldPos = new Vector(b.pos.x, b.pos.y);
                
                b.vel.y += this.gravity * dt;
                b.pos.x += b.vel.x * dt;
                b.pos.y += b.vel.y * dt;

                // Collisions
                // Back wall
                if (b.pos.x - b.radius < this.backWallX && b.pos.y > this.backWallTop && b.pos.y < this.backWallBottom) {
                    b.pos.x = this.backWallX + b.radius;
                    b.vel.x *= -0.7;
                }
                // Backboard
                if (b.pos.x - b.radius < this.backboardX && b.pos.y > this.backboardTop && b.pos.y < this.backboardBottom) {
                    b.pos.x = this.backboardX + b.radius;
                    b.vel.x *= -0.6;
                }

                // Rims
                let checkRim = (rimX, rimY) => {
                    let dx = b.pos.x - rimX;
                    let dy = b.pos.y - rimY;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < b.radius) {
                        let nx = dx/dist;
                        let ny = dy/dist;
                        let dot = b.vel.x * nx + b.vel.y * ny;
                        if (dot < 0) {
                            b.vel.x -= 2 * dot * nx * 0.7;
                            b.vel.y -= 2 * dot * ny * 0.7;
                        }
                        b.pos.x = rimX + nx * b.radius;
                        b.pos.y = rimY + ny * b.radius;
                    }
                };
                checkRim(this.hoopLeft, this.hoopY);
                checkRim(this.hoopRight, this.hoopY);

                // Score check (passing downward through hoop)
                if (oldPos.y < this.hoopY && b.pos.y >= this.hoopY && b.pos.x > this.hoopLeft && b.pos.x < this.hoopRight && b.vel.y > 0) {
                    if (!b.scored) {
                        this.score++;
                        b.scored = true;
                    }
                }

                // Platform collision
                // Extrapolate slope for a bit to handle balls landing further right
                let surfaceY = platM * b.pos.x + platB;
                
                if (b.pos.x > this.platformLeftX && b.pos.x < this.stopperX + 20) {
                    if (b.pos.y + b.radius > surfaceY) {
                        b.pos.y = surfaceY - b.radius;
                        
                        // Normal of the slope
                        let nx = -platM, ny = 1;
                        let mag = Math.sqrt(nx*nx + ny*ny);
                        nx /= mag; ny /= mag;
                        
                        let dot = b.vel.x * nx + b.vel.y * ny;
                        if (dot < 0) {
                            b.vel.x -= 2 * dot * nx * 0.5;
                            b.vel.y -= 2 * dot * ny * 0.5;
                        }
                        
                        // Transition to rolling if low vertical bounce
                        if (Math.abs(dot) < 150) {
                            b.state = 'rolling';
                            b.vel.y = 0;
                        }
                    }
                }
                
                // Ground safety catch
                if (b.pos.y > 768 + b.radius) {
                    b.state = 'returning';
                }

            } else if (b.state === 'rolling') {
                // Roll down the slope
                b.vel.x += this.slopeGravity * dt;
                b.vel.x *= 0.98; // friction
                
                b.pos.x += b.vel.x * dt;
                b.pos.y = platM * b.pos.x + platB - b.radius;
                
                if (b.pos.x >= this.stopperX - b.radius) {
                    b.pos.x = this.stopperX - b.radius;
                    b.vel.x = 0;
                    b.state = 'returning';
                }
                
            } else if (b.state === 'returning') {
                let dx = this.startPos.x - b.pos.x;
                let dy = this.startPos.y - b.pos.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                let speed = 600;
                
                if (dist < speed * dt) {
                    b.pos.x = this.startPos.x;
                    b.pos.y = this.startPos.y;
                    b.vel.x = 0;
                    b.vel.y = 0;
                    b.state = 'ready';
                } else {
                    b.pos.x += (dx / dist) * speed * dt;
                    b.pos.y += (dy / dist) * speed * dt;
                }
            }
        }
    }

    draw(ctx, input) {
        // Background
        drawRect(ctx, 0, 0, 1024, 768, '#222', null);

        // Back wall
        drawRect(ctx, this.backWallX, this.backWallTop, 20, this.backWallBottom - this.backWallTop, '#444', 'cyan');

        // Platform (trapezoid)
        ctx.beginPath();
        ctx.moveTo(this.platformLeftX, this.platformLeftTopY);
        ctx.lineTo(this.platformRightX, this.platformRightTopY);
        ctx.lineTo(this.platformRightX, this.platformRightBottomY);
        ctx.lineTo(this.platformLeftX, this.platformLeftBottomY);
        ctx.closePath();
        ctx.fillStyle = '#8B5A2B';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wood grain lines (simple styling)
        ctx.strokeStyle = '#6B4226';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.platformLeftX + 20, this.platformLeftTopY + 20);
        ctx.lineTo(this.platformRightX - 20, this.platformRightTopY + 20);
        ctx.moveTo(this.platformLeftX + 10, this.platformLeftTopY + 40);
        ctx.lineTo(this.platformRightX - 10, this.platformRightTopY + 40);
        ctx.stroke();

        // Stopper bar
        drawRect(ctx, this.stopperX, this.stopperTop, 15, this.stopperBottom - this.stopperTop, '#111', 'orange');

        // Backboard
        drawRect(ctx, this.backboardX, this.backboardTop, 15, this.backboardBottom - this.backboardTop, 'white', 'white');
        
        // Hoop
        drawRect(ctx, this.hoopLeft, this.hoopY, this.hoopRight - this.hoopLeft, 5, 'red', 'red');
        drawCircle(ctx, this.hoopLeft, this.hoopY, 5, 'red', null);
        drawCircle(ctx, this.hoopRight, this.hoopY, 5, 'red', null);

        // Net (simple lines)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.hoopLeft, this.hoopY);
        ctx.lineTo(this.hoopLeft + 20, this.hoopY + 60);
        ctx.lineTo(this.hoopRight - 20, this.hoopY + 60);
        ctx.lineTo(this.hoopRight, this.hoopY);
        ctx.stroke();

        // Draw balls
        let readyCount = 0;
        for (let b of this.balls) {
            ctx.globalAlpha = (b.state === 'ready') ? 1.0 : 0.6;
            drawCircle(ctx, b.pos.x, b.pos.y, b.radius, '#FF8C00', (b.state === 'ready') ? 'yellow' : null);
            
            // Draw ball lines
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.pos.x - b.radius, b.pos.y);
            ctx.lineTo(b.pos.x + b.radius, b.pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(b.pos.x, b.pos.y - b.radius);
            ctx.lineTo(b.pos.x, b.pos.y + b.radius);
            ctx.stroke();
            
            ctx.globalAlpha = 1.0;
            
            if (b.state === 'ready') readyCount++;
        }

        // Draw drag line if dragging
        if (this.draggingBall && input.mouse.down) {
            let dragVec = new Vector(this.draggingBall.pos.x - input.mouse.x, this.draggingBall.pos.y - input.mouse.y);
            if (dragVec.mag() > this.maxDragDist) {
                dragVec.normalize();
                dragVec.mult(this.maxDragDist);
            }
            ctx.beginPath();
            ctx.moveTo(this.draggingBall.pos.x, this.draggingBall.pos.y);
            ctx.lineTo(this.draggingBall.pos.x - dragVec.x, this.draggingBall.pos.y - dragVec.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // HUD and Hints
        drawHUD(this.score, this.timer.getFormattedTime());
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        
        if (readyCount > 0) {
            ctx.fillText('Drag ball to aim and release!', this.startPos.x, this.startPos.y - 40);
        }
        
        ctx.fillText(`Balls: ${readyCount}/3 ready`, this.startPos.x, this.startPos.y + 50);
        
        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, 1024, 768);
            ctx.fillStyle = 'white';
            ctx.font = '60px Arial';
            ctx.fillText('Time\'s Up!', 512, 350);
            ctx.font = '40px Arial';
            ctx.fillText(`Final Score: ${this.score}`, 512, 420);
            ctx.font = '20px Arial';
            ctx.fillText('Press SPACE to play again', 512, 500);
        }
    }
}
