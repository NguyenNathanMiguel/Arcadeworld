class Input {
    constructor(canvas) {
        this.keys = {};
        this.keysJustPressed = {};
        this.mouse = { x: 0, y: 0, down: false, justPressed: false, justReleased: false };
        
        window.addEventListener('keydown', e => {
            if (!this.keys[e.code]) {
                this.keysJustPressed[e.code] = true;
            }
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });
        
        canvas.addEventListener('mousedown', e => {
            this.updateMousePos(canvas, e);
            this.mouse.down = true;
            this.mouse.justPressed = true;
        });
        canvas.addEventListener('mousemove', e => this.updateMousePos(canvas, e));
        canvas.addEventListener('mouseup', e => {
            this.mouse.down = false;
            this.mouse.justReleased = true;
        });
    }

    updateMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        // Account for object-fit: contain — the canvas image may be
        // letterboxed/pillarboxed inside the CSS rect.
        const canvasAspect = canvas.width / canvas.height;
        const rectAspect = rect.width / rect.height;
        
        let renderWidth, renderHeight, offsetX, offsetY;
        
        if (canvasAspect > rectAspect) {
            // Pillarboxed (black bars top/bottom)
            renderWidth = rect.width;
            renderHeight = rect.width / canvasAspect;
            offsetX = 0;
            offsetY = (rect.height - renderHeight) / 2;
        } else {
            // Letterboxed (black bars left/right)
            renderHeight = rect.height;
            renderWidth = rect.height * canvasAspect;
            offsetX = (rect.width - renderWidth) / 2;
            offsetY = 0;
        }
        
        this.mouse.x = ((evt.clientX - rect.left - offsetX) / renderWidth) * canvas.width;
        this.mouse.y = ((evt.clientY - rect.top - offsetY) / renderHeight) * canvas.height;
    }

    update() {
        this.mouse.justPressed = false;
        this.mouse.justReleased = false;
        this.keysJustPressed = {};
    }
    
    isKeyPressed(code) {
        return !!this.keys[code];
    }
    
    isKeyJustPressed(code) {
        return !!this.keysJustPressed[code];
    }
}

class Vector {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector(this.x * n, this.y * n); }
    mag() { return Math.sqrt(this.x*this.x + this.y*this.y); }
    normalize() { let m = this.mag(); return m === 0 ? new Vector(0,0) : new Vector(this.x/m, this.y/m); }
    dist(v) { return this.sub(v).mag(); }
}

class Timer {
    constructor(duration, onComplete) {
        this.duration = duration;
        this.timeLeft = duration;
        this.onComplete = onComplete;
        this.running = false;
    }
    start() { this.running = true; }
    update(dt) {
        if (!this.running) return;
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.running = false;
            if (this.onComplete) this.onComplete();
        }
    }
    getFormattedTime() {
        let m = Math.floor(this.timeLeft / 60);
        let s = Math.floor(this.timeLeft % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

const Store = {
    getHighScore(gameId) {
        return parseInt(localStorage.getItem('arcade_world_' + gameId)) || 0;
    },
    setHighScore(gameId, score) {
        const current = this.getHighScore(gameId);
        if (score > current) {
            localStorage.setItem('arcade_world_' + gameId, score);
            return true;
        }
        return false;
    }
};

function drawCircle(ctx, x, y, r, color, glow = null) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    if (glow) {
        ctx.shadowBlur = glow.blur;
        ctx.shadowColor = glow.color;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawRect(ctx, x, y, w, h, color, glow = null) {
    ctx.fillStyle = color;
    if (glow) {
        ctx.shadowBlur = glow.blur;
        ctx.shadowColor = glow.color;
    }
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
}
