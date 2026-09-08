class StackerGame {
    constructor() {
        this.gameKey = 'game11';
        this.score = 0;
        this.isGameOver = false;
        this.cols = 7;
        this.rows = 18;
        this.pixelSize = 38;
        // Grid position
        this.gridX = (1024 - this.cols * this.pixelSize) / 2;
        this.gridY = (768 - this.rows * this.pixelSize) / 2;
        // Grid state: 0=empty, 1=filled
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid.push(new Array(this.cols).fill(0));
        }
        // Sections: bottom(rows 0-5)=3px 50pts, mid(6-11)=2px 100pts, top(12-17)=1px 200pts
        // Rows are 0=bottom, 17=top in logical terms
        // But we draw row 0 at bottom, row 17 at top
        this.currentRow = 0;
        // Block
        this.blockWidth = 3;
        this.blockPos = 0; // leftmost column of block
        this.blockDir = 1; // 1=right, -1=left
        this.baseSpeed = 5;
        this.blockSpeed = this.baseSpeed; // moves per second
        this.moveTimer = 0;
        
        // Track the effective width at each stacked row
        this.stackedWidths = []; // {col, width} for each stacked row
        // Animation
        this.flashRow = -1;
        this.flashTimer = 0;
        this.droppingPixels = [];
    }

    init() {}

    getSection(row) {
        if (row < 6) return 0;
        if (row < 12) return 1;
        return 2;
    }

    update(dt, input) {
        if (this.isGameOver) return;
        // Flash animation
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            return;
        }
        // Update dropping pixels
        for (let dp of this.droppingPixels) {
            dp.vy += 800 * dt;
            dp.y += dp.vy * dt;
            dp.life -= dt;
        }
        this.droppingPixels = this.droppingPixels.filter(dp => dp.life > 0);
        // Move block
        this.moveTimer += dt;
        let moveInterval = 1 / this.blockSpeed;
        while (this.moveTimer >= moveInterval) {
            this.moveTimer -= moveInterval;
            this.blockPos += this.blockDir;
            // Bounce logic: must go until only 1 pixel visible before bouncing
            if (this.blockDir === 1) {
                // Moving right: bounce when blockPos = cols - 1 (only last pixel visible at right edge)
                // Actually: bounce when only 1 pixel remains on screen
                // blockPos + blockWidth - 1 >= cols means some pixels off right edge
                // We want: blockPos >= cols - 1 (only 1 pixel left = the last one at cols-1... but blockPos is leftmost)
                // When blockPos = cols - 1: pixels at cols-1 (on screen), rest off screen
                // But we need blockWidth pixels, so blockPos goes from 0 to... 
                // The block occupies columns [blockPos, blockPos+blockWidth-1]
                // Only 1 pixel on screen when blockPos = cols - 1
                if (this.blockPos >= this.cols - 1) {
                    this.blockDir = -1;
                }
            } else {
                // Moving left: bounce when blockPos + blockWidth - 1 = 0 (only 1 pixel visible at left)
                // blockPos + blockWidth - 1 = 0 => blockPos = 1 - blockWidth
                if (this.blockPos <= 1 - this.blockWidth) {
                    this.blockDir = 1;
                }
            }
        }
        // Stack on space
        if (input.isKeyJustPressed('Space')) {
            this.stackBlock();
        }
    }

    stackBlock() {
        // Determine which columns the block occupies (only on-screen ones)
        let placedCols = [];
        for (let i = 0; i < this.blockWidth; i++) {
            let col = this.blockPos + i;
            if (col >= 0 && col < this.cols) {
                placedCols.push(col);
            }
        }
        if (placedCols.length === 0) {
            // Missed entirely - game over? Shouldn't happen with bounce logic but just in case
            this.isGameOver = true;
            return;
        }
        // If this is not the first row, check alignment with row below
        let survivingCols = [];
        if (this.currentRow === 0) {
            survivingCols = placedCols;
        } else {
            let prevStack = this.stackedWidths[this.currentRow - 1];
            for (let col of placedCols) {
                if (prevStack.includes(col)) {
                    survivingCols.push(col);
                }
            }
            // Drop overhanging pixels
            for (let col of placedCols) {
                if (!survivingCols.includes(col)) {
                    let px = this.gridX + col * this.pixelSize;
                    let py = this.gridY + (this.rows - 1 - this.currentRow) * this.pixelSize;
                    this.droppingPixels.push({
                        x: px, y: py, w: this.pixelSize, h: this.pixelSize,
                        vy: -100, vx: (Math.random() - 0.5) * 100,
                        life: 1.5, color: this.getRowColor(this.currentRow)
                    });
                }
            }
        }
        if (survivingCols.length === 0) {
            this.isGameOver = true;
            return;
        }
        
        // Check if cut happened
        if (survivingCols.length < this.blockWidth) {
            this.blockSpeed = this.baseSpeed; // reset speed
        } else {
            this.blockSpeed = Math.min(25, this.blockSpeed + 0.5); // speed up
        }
        this.blockWidth = survivingCols.length;
        
        // Place surviving columns
        for (let col of survivingCols) {
            this.grid[this.currentRow][col] = 1;
        }
        this.stackedWidths[this.currentRow] = survivingCols;
        // Score
        this.score += 10;
        // Flash
        this.flashRow = this.currentRow;
        this.flashTimer = 0.15;
        // Next row
        this.currentRow++;
        if (this.currentRow >= this.rows) {
            // Endless scroll down
            this.grid.shift(); // remove bottom row
            this.grid.push(new Array(this.cols).fill(0)); // add empty top row
            this.stackedWidths.shift();
            this.currentRow = this.rows - 1;
            // Shift dropping pixels up visually (they were dropping based on old grid pos, but it's fine if they disappear fast)
        }
        
        // Reset block position
        this.blockPos = 0;
        this.blockDir = 1;
        this.moveTimer = 0;
    }

    getRowColor(row) {
        return '#ff0000';
    }

    draw(ctx) {
        // Grid background
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(this.gridX - 4, this.gridY - 4, this.cols * this.pixelSize + 8, this.rows * this.pixelSize + 8);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        // Draw grid lines
        for (let r = 0; r <= this.rows; r++) {
            let y = this.gridY + r * this.pixelSize;
            ctx.beginPath(); ctx.moveTo(this.gridX, y); ctx.lineTo(this.gridX + this.cols * this.pixelSize, y);
            ctx.strokeStyle = '#1a1a2e'; ctx.stroke();
        }
        for (let c = 0; c <= this.cols; c++) {
            let x = this.gridX + c * this.pixelSize;
            ctx.beginPath(); ctx.moveTo(x, this.gridY); ctx.lineTo(x, this.gridY + this.rows * this.pixelSize);
            ctx.strokeStyle = '#1a1a2e'; ctx.stroke();
        }
        // Draw placed blocks
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 1) {
                    let drawRow = this.rows - 1 - r;
                    let px = this.gridX + c * this.pixelSize;
                    let py = this.gridY + drawRow * this.pixelSize;
                    let color = this.getRowColor(r);
                    ctx.fillStyle = color;
                    ctx.shadowBlur = 4; ctx.shadowColor = color;
                    ctx.fillRect(px + 1, py + 1, this.pixelSize - 2, this.pixelSize - 2);
                    ctx.shadowBlur = 0;
                }
            }
        }
        // Draw moving block (only on-screen pixels)
        if (!this.isGameOver && this.flashTimer <= 0) {
            let drawRow = this.rows - 1 - this.currentRow;
            let color = this.getRowColor(this.currentRow);
            for (let i = 0; i < this.blockWidth; i++) {
                let col = this.blockPos + i;
                if (col >= 0 && col < this.cols) {
                    let px = this.gridX + col * this.pixelSize;
                    let py = this.gridY + drawRow * this.pixelSize;
                    ctx.fillStyle = color;
                    ctx.shadowBlur = 8; ctx.shadowColor = color;
                    ctx.fillRect(px + 1, py + 1, this.pixelSize - 2, this.pixelSize - 2);
                    ctx.shadowBlur = 0;
                }
            }
        }
        // Flash effect
        if (this.flashTimer > 0 && this.flashRow >= 0) {
            let drawRow = this.rows - 1 - this.flashRow;
            let alpha = Math.sin(this.flashTimer * 30) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
            ctx.fillRect(this.gridX, this.gridY + drawRow * this.pixelSize, this.cols * this.pixelSize, this.pixelSize);
        }
        // Dropping pixels
        for (let dp of this.droppingPixels) {
            ctx.globalAlpha = Math.max(0, dp.life / 1.5);
            ctx.fillStyle = dp.color;
            dp.x += dp.vx * 0.016;
            ctx.fillRect(dp.x, dp.y, dp.w * 0.8, dp.h * 0.8);
            ctx.globalAlpha = 1;
        }
        // Border
        ctx.strokeStyle = '#66fcf1'; ctx.lineWidth = 3;
        ctx.shadowBlur = 10; ctx.shadowColor = '#66fcf1';
        ctx.strokeRect(this.gridX - 4, this.gridY - 4, this.cols * this.pixelSize + 8, this.rows * this.pixelSize + 8);
        ctx.shadowBlur = 0;
        // HUD
        drawHUD(this.score, null);
        ctx.font = '20px Orbitron'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
        ctx.fillText('Speed: ' + this.blockSpeed.toFixed(1), canvas.width - 40, 90);
        ctx.fillStyle = '#66fcf1'; ctx.font = '16px Inter'; ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to stack!', 512, 730);
    }
}
