// 俄罗斯方块 - Web 版（计分、消行、加速、移动端按键）
(function () {
  const board = document.getElementById('board');
  const bctx = board.getContext('2d');
  const nextCv = document.getElementById('next');
  const nctx = nextCv.getContext('2d');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');

  const COLS = 10, ROWS = 20;
  const CELL = Math.floor(board.width / COLS); // 30
  board.width = CELL * COLS;
  board.height = CELL * ROWS;

  // 形状定义（4x4范围内坐标）
  const SHAPES = {
    I: [[0,1],[1,1],[2,1],[3,1]],
    O: [[1,1],[2,1],[1,2],[2,2]],
    T: [[1,1],[0,2],[1,2],[2,2]],
    S: [[1,1],[2,1],[0,2],[1,2]],
    Z: [[0,1],[1,1],[1,2],[2,2]],
    J: [[0,1],[0,2],[1,2],[2,2]],
    L: [[2,1],[0,2],[1,2],[2,2]],
  };
  const COLORS = {
    I: '#00c2ff', O: '#ffd166', T: '#b794f4',
    S: '#06d6a0', Z: '#ef476f', J: '#4cc9f0', L: '#f8961e'
  };

  // 游戏状态
  let grid, piece, nextType, score, level, lines, running, paused;
  let dropInterval = 0.8; // 秒
  let acc = 0, last = 0;

  function reset() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    piece = spawn();
    nextType = randomType();
    score = 0; level = 1; lines = 0; running = true; paused = false;
    dropInterval = 0.8; // 初始较慢
    updateHUD();
    drawAll();
  }

  // 7-bag 简化：随机类型
  const TYPES = Object.keys(SHAPES);
  function randomType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }

  function spawn(type = randomType()) {
    const cells = SHAPES[type].map(([x,y]) => ({ x, y }));
    return {
      type,
      x: 3,
      y: 0,
      rot: 0,
      cells,
    };
  }

  function rotate(p) {
    // 旋转 90 度，原点在 2x2 中心(近似)；再做简单挤墙
    const rotated = p.cells.map(c => ({ x: 3 - c.y, y: c.x }));
    const np = { ...p, cells: rotated };
    // 尝试微调位置（墙踢）
    const kicks = [0, -1, 1, -2, 2];
    for (const dx of kicks) {
      if (!collide(np, dx, 0)) { np.x += dx; return np; }
    }
    return p; // 无法旋转
  }

  function collide(p, dx = 0, dy = 0) {
    for (const c of p.cells) {
      const x = p.x + c.x + dx;
      const y = p.y + c.y + dy;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && grid[y][x]) return true;
    }
    return false;
  }

  function mergePiece() {
    for (const c of piece.cells) {
      const x = piece.x + c.x;
      const y = piece.y + c.y;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        grid[y][x] = piece.type;
      }
    }
  }

  function clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (grid[y].every(v => v)) {
        grid.splice(y, 1);
        grid.unshift(Array(COLS).fill(null));
        cleared++;
        y++; // 复查同一行（移位后）
      }
    }
    if (cleared > 0) {
      lines += cleared;
      // 经典计分（含等级系数）
      const base = [0, 100, 300, 500, 800][cleared];
      score += base * level;
      // 每 10 行升级，加快下落
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        dropInterval = Math.max(0.15, 0.8 - (level - 1) * 0.06);
      }
      updateHUD();
    }
  }

  function hardDrop() {
    let dist = 0;
    while (!collide(piece, 0, dist + 1)) dist++;
    piece.y += dist;
    // 硬降加分（每降一格+2 * 等级）
    score += dist * 2 * level;
    lockPiece();
  }

  function lockPiece() {
    mergePiece();
    clearLines();
    // 生成下一块
    piece = spawn(nextType);
    nextType = randomType();
    // 如果一生成就冲突，游戏结束
    if (collide(piece, 0, 0)) {
      running = false;
      paused = false;
      updateHUD();
    }
  }

  // 输入控制
  function moveLeft() { if (!collide(piece, -1, 0)) piece.x--; }
  function moveRight() { if (!collide(piece, 1, 0)) piece.x++; }
  function softDrop() {
    if (!collide(piece, 0, 1)) piece.y++;
    else lockPiece();
  }

  function rotateCW() {
    const np = rotate(piece);
    if (!collide(np, 0, 0)) piece = np;
  }

  window.addEventListener('keydown', (e) => {
    if (!running || paused) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') moveLeft();
    else if (k === 'arrowright' || k === 'd') moveRight();
    else if (k === 'arrowup' || k === 'w') rotateCW();
    else if (k === 'arrowdown' || k === 's') softDrop();
    else if (k === ' ') hardDrop();
    drawAll();
  });

  document.querySelectorAll('.mobile-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-action');
      if (!running || paused) return;
      if (act === 'left') moveLeft();
      else if (act === 'right') moveRight();
      else if (act === 'rotate') rotateCW();
      else if (act === 'drop') softDrop();
      else if (act === 'hard') hardDrop();
      drawAll();
    });
  });

  startBtn.addEventListener('click', () => { if (!running) reset(); });
  pauseBtn.addEventListener('click', () => { if (running) { paused = !paused; updateHUD(); } });
  restartBtn.addEventListener('click', () => reset());

  function updateHUD() {
    scoreEl.textContent = String(score);
    levelEl.textContent = String(level);
    linesEl.textContent = String(lines);
    pauseBtn.textContent = paused ? '继续' : '暂停';
  }

  // 绘制
  function drawAll() {
    // 画盘
    bctx.fillStyle = '#121624';
    bctx.fillRect(0, 0, board.width, board.height);
    // 网格线
    bctx.strokeStyle = '#1b2234';
    bctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      bctx.beginPath(); bctx.moveTo(x * CELL + 0.5, 0); bctx.lineTo(x * CELL + 0.5, board.height); bctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      bctx.beginPath(); bctx.moveTo(0, y * CELL + 0.5); bctx.lineTo(board.width, y * CELL + 0.5); bctx.stroke();
    }

    // 已锁定方块
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = grid[y][x];
        if (!t) continue;
        drawCell(bctx, x, y, COLORS[t]);
      }
    }
    // 当前方块
    for (const c of piece.cells) {
      const x = piece.x + c.x;
      const y = piece.y + c.y;
      drawCell(bctx, x, y, COLORS[piece.type]);
    }

    // 暂停或结束遮罩
    if (paused || !running) {
      bctx.fillStyle = 'rgba(0,0,0,0.35)';
      bctx.fillRect(0, 0, board.width, board.height);
      bctx.fillStyle = '#d9e3f0';
      bctx.font = 'bold 24px system-ui';
      bctx.textAlign = 'center';
      bctx.fillText(!running ? '游戏结束 - 点击重开或开始' : '暂停', board.width/2, board.height/2);
    }

    // 下一块预览
    nctx.fillStyle = '#0f1424';
    nctx.fillRect(0, 0, nextCv.width, nextCv.height);
    const preview = spawn(nextType);
    // 居中预览
    const minX = Math.min(...preview.cells.map(c=>c.x));
    const maxX = Math.max(...preview.cells.map(c=>c.x));
    const minY = Math.min(...preview.cells.map(c=>c.y));
    const maxY = Math.max(...preview.cells.map(c=>c.y));
    const pw = (maxX-minX+1)*CELL/2; const ph = (maxY-minY+1)*CELL/2;
    const ox = (nextCv.width/2 - pw), oy = (nextCv.height/2 - ph);
    for (const c of preview.cells) {
      const x = ox + (c.x-minX) * (CELL/2);
      const y = oy + (c.y-minY) * (CELL/2);
      nctx.fillStyle = COLORS[preview.type];
      nctx.fillRect(x+2, y+2, CELL/2-4, CELL/2-4);
    }
  }

  function drawCell(ctx, x, y, color) {
    const px = x * CELL, py = y * CELL;
    ctx.fillStyle = color;
    ctx.fillRect(px+2, py+2, CELL-4, CELL-4);
  }

  // 主循环：根据 dropInterval 固定节拍下落
  function loop(ts) {
    if (!last) last = ts;
    const dt = (ts - last) / 1000; last = ts;
    if (running && !paused) {
      acc += dt;
      while (acc >= dropInterval) {
        acc -= dropInterval;
        if (!collide(piece, 0, 1)) piece.y++;
        else lockPiece();
      }
    }
    drawAll();
    requestAnimationFrame(loop);
  }

  // 启动
  score = 0; level = 1; lines = 0; running = false; paused = false;
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  piece = spawn(randomType()); nextType = randomType();
  updateHUD(); drawAll(); requestAnimationFrame(loop);
})();