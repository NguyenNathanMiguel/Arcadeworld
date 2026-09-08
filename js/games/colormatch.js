class ColorMatchGame {
    constructor() {
        this.gameKey = 'game6';
        this.score = 0;
        this.isGameOver = false;

        this.colors = [
            '#e74c3c', // Red
            '#e67e22', // Orange
            '#1a3a6b', // Dark Blue
            '#5dade2', // Light Blue
            '#2ecc71', // Green
            '#1e8449', // Dark Green
            '#ff69b4', // Pink
            '#9b59b6'  // Purple
        ];

        this.cx = 512;
        this.cy = 380;
        this.radius = 200;
        this.innerRadius = 35;
        this.numSections = 9;
        this.sectionAngle = (Math.PI * 2) / this.numSections;

        this.roundsLeft = 3;
        this.roundScore = 0;

        this.sections = [];
        this.targetColor = null;
        this.colorOrder = [];
        this.currentStep = 0;

        this.state = 'INIT';
        this.rotationAngle = 0;
        this.targetRotationAngle = 0;

        this.flashTimer = 0;
        this.flashInterval = 0.5;
        this.flashColorIndex = 0;

        this.msgTimer = 0;
        this.msg = '';
    }

    init() {
        this.startNewRound();
    }

    startNewRound() {
        this.roundScore = 0;
        this.rotationAngle = 0;
        this.targetRotationAngle = 0;
        this.targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.sections = new Array(this.numSections).fill(null);
        this.sections[0] = this.targetColor;
        // Order: section 8,7,6,5,4,3,2,1 (counterclockwise neighbors)
        this.colorOrder = [];
        for (let i = this.numSections - 1; i >= 1; i--) this.colorOrder.push(i);
        this.currentStep = 0;
        this.state = 'SHOW_TARGET';
        this.msgTimer = 1.8;
        this.msg = 'Match this color!';
    }

    update(dt, input) {
        if (this.isGameOver) return;

        if (this.state === 'SHOW_TARGET') {
            this.msgTimer -= dt;
            if (this.msgTimer <= 0) {
                this.state = 'ROTATING';
                this.targetRotationAngle = this.rotationAngle + this.sectionAngle;
            }
        } else if (this.state === 'ROTATING') {
            this.rotationAngle += 3.0 * dt;
            if (this.rotationAngle >= this.targetRotationAngle) {
                this.rotationAngle = this.targetRotationAngle;
                this.state = 'FLASHING';
                this.flashTimer = 0;
                this.flashColorIndex = Math.floor(Math.random() * this.colors.length);
            }
        } else if (this.state === 'FLASHING') {
            this.flashTimer += dt;
            if (this.flashTimer >= this.flashInterval) {
                this.flashTimer -= this.flashInterval;
                this.flashColorIndex = Math.floor(Math.random() * this.colors.length);
            }
            if (input.isKeyJustPressed('Space')) {
                let currentColor = this.colors[this.flashColorIndex];
                let secIdx = this.colorOrder[this.currentStep];
                if (currentColor === this.targetColor) {
                    this.sections[secIdx] = this.targetColor;
                    this.roundScore += 25;
                    this.currentStep++;
                    if (this.currentStep >= this.colorOrder.length) {
                        this.endRound(true);
                    } else {
                        this.state = 'ROTATING';
                        this.targetRotationAngle = this.rotationAngle + this.sectionAngle;
                    }
                } else {
                    this.endRound(false);
                }
            }
        } else if (this.state === 'ROUND_MSG') {
            this.msgTimer -= dt;
            if (this.msgTimer <= 0) {
                if (this.roundsLeft <= 0) {
                    this.isGameOver = true;
                } else {
                    this.startNewRound();
                }
            }
        }
    }

    endRound(success) {
        this.score += this.roundScore;
        this.roundsLeft--;
        this.state = 'ROUND_MSG';
        this.msgTimer = 2.0;
        this.msg = success ? `Round Complete! +${this.roundScore}` : `Wrong Color! +${this.roundScore}`;
    }

    draw(ctx) {
        // Draw indicator arrow at top
        ctx.save();
        ctx.fillStyle = '#66fcf1';
        ctx.beginPath();
        ctx.moveTo(this.cx, this.cy - this.radius - 25);
        ctx.lineTo(this.cx - 12, this.cy - this.radius - 45);
        ctx.lineTo(this.cx + 12, this.cy - this.radius - 45);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw target color swatch at top-left
        ctx.fillStyle = '#fff';
        ctx.font = '18px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText('Target:', 40, 100);
        drawRect(ctx, 130, 82, 40, 25, this.targetColor || '#333', { blur: 8, color: this.targetColor || '#333' });

        // Draw pie chart (rotated)
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(this.rotationAngle);

        for (let i = 0; i < this.numSections; i++) {
            let startA = -Math.PI / 2 + i * this.sectionAngle;
            let endA = startA + this.sectionAngle;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, this.radius, startA, endA);
            ctx.closePath();

            let isFlashing = this.state === 'FLASHING' && i === this.colorOrder[this.currentStep];
            if (isFlashing) {
                ctx.fillStyle = this.colors[this.flashColorIndex];
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.colors[this.flashColorIndex];
            } else if (this.sections[i]) {
                ctx.fillStyle = this.sections[i];
            } else {
                ctx.fillStyle = '#2a2a35';
            }
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#0b0c10';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // White center circle (decorative)
        ctx.beginPath();
        ctx.arc(0, 0, this.innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();

        // Messages
        if (this.state === 'SHOW_TARGET' || this.state === 'ROUND_MSG') {
            ctx.font = '36px Orbitron';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#66fcf1';
            ctx.fillText(this.msg, this.cx, 680);
            ctx.shadowBlur = 0;
        }

        drawHUD(this.score, null);

        ctx.font = '20px Orbitron';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(`Rounds: ${this.roundsLeft}`, canvas.width - 40, 90);
        ctx.fillText(`Round Score: ${this.roundScore}`, canvas.width - 40, 120);

        if (this.state === 'FLASHING') {
            ctx.fillStyle = '#66fcf1';
            ctx.font = '18px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE when the color matches the target!', this.cx, 720);
        }
    }
}
