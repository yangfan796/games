// 贪吃蛇 - Web 版
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // 保证单元格是整数，保持宽高一致
  const GRID = 20; // 20x20 网格
  const CELL = Math.floor(canvas.width / GRID);
  canvas.width = CELL * GRID;
  canvas.height = CELL * GRID;

  // HUD
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const speedEl = document.getElementById('speed');

  // 控制按钮
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');

  // 游戏状态
  let snake = [];
  let dir = { x: 1, y: 0 }; // 当前方向
  let nextDir = { x: 1, y: 0 }; // 下一步要应用的方向
  let food = { x: 0, y: 0 };
  let score = 0;
  let high = parseInt(localStorage.getItem('snake_high') || '0', 10);
  let running = false;
  let paused = false;

  // 速度：基础 7 步/秒，随分数提升
  const BASE_SPEED = 4;
  function currentSpeed() {
    // 每 10 分加 1x（更慢更易于控制）
    return BASE_SPEED + Math.floor(score / 10);
  }

  // 初始化/重置
  function newGame() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    running = true;
    paused = false;
    placeFood();
    updateHUD();
  }

  function updateHUD() {
    scoreEl.textContent = String(score);
    highEl.textContent = String(high);
    speedEl.textContent = currentSpeed() + 'x';
    pauseBtn.textContent = paused ? '继续' : '暂停';
  }

  function placeFood() {
    // 生成不与蛇重叠的食物位置
    const occupied = new Set(snake.map(s => s.x + ':' + s.y));
    let x = 0, y = 0;
    do {
      x = Math.floor(Math.random() * GRID);
      y = Math.floor(Math.random() * GRID);
    } while (occupied.has(x + ':' + y));
    food = { x, y };
  }

  // 输入控制
  function setDirection(nx, ny) {
    // 禁止直接反向
    if (nx === -dir.x && ny === -dir.y) return;
    nextDir = { x: nx, y: ny };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') setDirection(0, -1);
    else if (k === 'arrowdown' || k === 's') setDirection(0, 1);
    else if (k === 'arrowleft' || k === 'a') setDirection(-1, 0);
    else if (k === 'arrowright' || k === 'd') setDirection(1, 0);
    else if (k === ' ') togglePause();
  });

  document.querySelectorAll('.mobile-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.getAttribute('data-dir');
      if (d === 'up') setDirection(0, -1);
      else if (d === 'down') setDirection(0, 1);
      else if (d === 'left') setDirection(-1, 0);
      else if (d === 'right') setDirection(1, 0);
    });
  });

  const appEl = document.querySelector('.app');
  const mobileControlsEl = document.querySelector('.mobile-controls');
  function updateMobileControlsPlacement() {
    const isMobileViewport = window.innerWidth < 720;
    if (!isMobileViewport) {
      mobileControlsEl.classList.remove('overlay');
      return;
    }
    // 当内容高度超过视窗高度时，将方向键悬浮到底部右侧
    const needOverlay = appEl.scrollHeight > window.innerHeight - 8;
    mobileControlsEl.classList.toggle('overlay', needOverlay);
  }
  window.addEventListener('resize', updateMobileControlsPlacement);
  window.addEventListener('orientationchange', updateMobileControlsPlacement);

  startBtn.addEventListener('click', () => {
    if (!running) newGame();
  });
  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', () => {
    newGame();
  });

  function togglePause() {
    if (!running) return;
    paused = !paused;
    updateHUD();
  }

  // 每步更新逻辑
  function tick() {
    // 应用新的方向（避免同帧多次变更）
    dir = nextDir;

    // 计算新头部
    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    // 碰墙判定
    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) {
      return gameOver();
    }
    // 撞到自己
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === nx && snake[i].y === ny) {
        return gameOver();
      }
    }

    // 移动：头插入，尾巴移除
    snake.unshift({ x: nx, y: ny });

    // 吃到食物
    if (nx === food.x && ny === food.y) {
      score += 1;
      if (score > high) {
        high = score;
        localStorage.setItem('snake_high', String(high));
      }
      placeFood();
      updateHUD();
      // 不移除尾巴，实现身体增长
    } else {
      snake.pop();
    }
  }

  // 渲染
  function draw() {
    // 背景
    ctx.fillStyle = '#121624';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 轻微网格线（可读性更好）
    ctx.strokeStyle = '#1b2234';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      // 竖线
      ctx.beginPath();
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, canvas.height);
      ctx.stroke();
      // 横线
      ctx.beginPath();
      ctx.moveTo(0, i * CELL + 0.5);
      ctx.lineTo(canvas.width, i * CELL + 0.5);
      ctx.stroke();
    }

    // 食物
    ctx.fillStyle = '#e74c3c';
    const fx = food.x * CELL;
    const fy = food.y * CELL;
    const r = Math.floor(CELL / 2) - 2;
    ctx.beginPath();
    ctx.arc(fx + CELL / 2, fy + CELL / 2, r, 0, Math.PI * 2);
    ctx.fill();

    // 蛇
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const x = s.x * CELL;
      const y = s.y * CELL;
      ctx.fillStyle = i === 0 ? '#2ecc71' : '#27ae60';
      ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    }

    // 暂停遮罩
    if (running && paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#d9e3f0';
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('暂停', canvas.width / 2, canvas.height / 2);
    }

    // 游戏结束提示
    if (!running) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#d9e3f0';
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束 - 点击“重开”或“开始”', canvas.width / 2, canvas.height / 2);
    }
  }

  function gameOver() {
    running = false;
    paused = false;
    updateHUD();
  }

  // 主循环（基于 rAF + 固定步进）
  let last = 0;
  let acc = 0; // 累计时间（秒）
  function loop(ts) {
    if (!last) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;

    acc += dt;

    const stepsPerSecond = currentSpeed();
    const step = 1 / stepsPerSecond;
    while (acc >= step) {
      acc -= step;
      if (running && !paused) tick();
    }

    draw();
    requestAnimationFrame(loop);
  }

  // 启动
  updateHUD();
  updateMobileControlsPlacement();
  requestAnimationFrame(loop);
})();