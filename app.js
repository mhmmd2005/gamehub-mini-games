(() => {
      "use strict";

      const STORAGE_KEY = "gamehub-mini-arena-v1";
      const $ = (selector) => document.querySelector(selector);
      const symbols = {
        rock: { name: "سنگ", emoji: "✊" },
        paper: { name: "کاغذ", emoji: "✋" },
        scissors: { name: "قیچی", emoji: "✌️" }
      };
      const winningLines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
      ];

      const defaultScores = {
        ttt: { ai: { x: 0, o: 0, draw: 0 }, pvp: { x: 0, o: 0, draw: 0 } },
        rps: { player: 0, ai: 0, draw: 0 }
      };
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (_) { saved = {}; }

      const state = {
        activeTab: "ttt",
        ttt: {
          mode: "ai", difficulty: "hard", board: Array(9).fill(""),
          turn: "X", over: false, winner: null, line: null, aiTimer: null
        },
        rps: { difficulty: "hard", history: [], round: 0 },
        scores: {
          ttt: {
            ai: { ...defaultScores.ttt.ai, ...(saved.ttt?.ai || {}) },
            pvp: { ...defaultScores.ttt.pvp, ...(saved.ttt?.pvp || {}) }
          },
          rps: { ...defaultScores.rps, ...(saved.rps || {}) }
        }
      };

      function persistScores() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scores)); }
        catch (_) { showToast("ذخیره امتیازها در مرورگر در دسترس نیست."); }
      }

      function showToast(message) {
        const toast = $("#toast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => toast.classList.remove("show"), 2100);
      }

      function setTab(tab) {
        state.activeTab = tab;
        document.querySelectorAll(".tab").forEach((button) => {
          const active = button.dataset.value === tab;
          button.classList.toggle("active", active);
          button.setAttribute("aria-selected", String(active));
        });
        $("#ttt-panel").classList.toggle("active", tab === "ttt");
        $("#rps-panel").classList.toggle("active", tab === "rps");
        $("#snake-panel").classList.toggle("active", tab === "snake");
        $("#breaker-panel").classList.toggle("active", tab === "breaker");
      }

      function scoreCard(label, value, color) {
        return `<div class="score" style="--accent:${color}"><div class="score-label">${label}</div><div class="score-value">${value}</div></div>`;
      }

      function renderTttScores() {
        const score = state.scores.ttt[state.ttt.mode];
        const labels = state.ttt.mode === "ai"
          ? ["شما · X", "مساوی", "هوش مصنوعی · O"]
          : ["بازیکن X", "مساوی", "بازیکن O"];
        $("#ttt-scores").innerHTML = [
          scoreCard(labels[0], score.x, "var(--blue)"),
          scoreCard(labels[1], score.draw, "var(--gold)"),
          scoreCard(labels[2], score.o, "var(--pink)")
        ].join("");
      }

      function tttStatus(message, color = "var(--cyan)") {
        $("#ttt-status").style.setProperty("--status", color);
        $("#ttt-status span:last-child").textContent = message;
      }

      function renderTtt() {
        renderTttScores();
        $("#ttt-difficulty-wrap").hidden = state.ttt.mode !== "ai";
        document.querySelectorAll('[data-action="ttt-mode"]').forEach((button) => {
          button.classList.toggle("active", button.dataset.value === state.ttt.mode);
        });
        $("#ttt-difficulty").value = state.ttt.difficulty;
        const board = $("#ttt-board");
        board.innerHTML = "";
        state.ttt.board.forEach((mark, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `cell${mark ? ` ${mark.toLowerCase()}` : ""}${state.ttt.line?.includes(index) ? " winner" : ""}`;
          button.textContent = mark;
          button.setAttribute("aria-label", `خانه ${index + 1}${mark ? `، ${mark}` : "، خالی"}`);
          button.disabled = Boolean(mark) || state.ttt.over || (state.ttt.mode === "ai" && state.ttt.turn === "O");
          button.addEventListener("click", () => playerTttMove(index));
          board.appendChild(button);
        });
      }

      function getTttWinner(board) {
        for (const line of winningLines) {
          const [a, b, c] = line;
          if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            return { mark: board[a], line };
          }
        }
        return null;
      }

      function isTttDraw(board) { return board.every(Boolean); }

      function playerTttMove(index) {
        const game = state.ttt;
        if (game.over || game.board[index] || (game.mode === "ai" && game.turn !== "X")) return;
        game.board[index] = game.turn;
        const result = getTttWinner(game.board);
        if (result) return finishTtt(result.mark, result.line);
        if (isTttDraw(game.board)) return finishTtt("draw");
        if (game.mode === "pvp") {
          game.turn = game.turn === "X" ? "O" : "X";
          tttStatus(`نوبت بازیکن ${game.turn}`, game.turn === "X" ? "var(--blue)" : "var(--pink)");
          renderTtt();
        } else {
          game.turn = "O";
          tttStatus("هوش مصنوعی در حال فکر کردن است…", "var(--gold)");
          renderTtt();
          game.aiTimer = setTimeout(computerTttMove, 420);
        }
      }

      function finishTtt(winner, line = null) {
        const game = state.ttt;
        game.over = true;
        game.winner = winner;
        game.line = line;
        const score = state.scores.ttt[game.mode];
        if (winner === "draw") {
          score.draw++;
          tttStatus("بازی مساوی شد!", "var(--gold)");
        } else if (winner === "X") {
          score.x++;
          tttStatus(game.mode === "ai" ? "آفرین! تو برنده شدی 🎉" : "بازیکن X برنده شد 🎉", "var(--green)");
        } else {
          score.o++;
          tttStatus(game.mode === "ai" ? "این دور را هوش مصنوعی برد." : "بازیکن O برنده شد 🎉", "var(--pink)");
        }
        persistScores();
        renderTtt();
      }

      function minimax(board, maximizing, depth = 0) {
        const result = getTttWinner(board);
        if (result) return result.mark === "O" ? 10 - depth : depth - 10;
        if (isTttDraw(board)) return 0;
        if (maximizing) {
          let best = -Infinity;
          for (let i = 0; i < 9; i++) if (!board[i]) {
            board[i] = "O";
            best = Math.max(best, minimax(board, false, depth + 1));
            board[i] = "";
          }
          return best;
        }
        let best = Infinity;
        for (let i = 0; i < 9; i++) if (!board[i]) {
          board[i] = "X";
          best = Math.min(best, minimax(board, true, depth + 1));
          board[i] = "";
        }
        return best;
      }

      function easyTttMove() {
        const empty = state.ttt.board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
        return empty[Math.floor(Math.random() * empty.length)];
      }

      function mediumTttMove() {
        const board = state.ttt.board;
        for (const mark of ["O", "X"]) {
          for (let i = 0; i < 9; i++) if (!board[i]) {
            board[i] = mark;
            const result = getTttWinner(board);
            board[i] = "";
            if (result?.mark === mark) return i;
          }
        }
        if (!board[4]) return 4;
        const choices = [0, 2, 6, 8].filter(i => !board[i]);
        const pool = choices.length ? choices : [1, 3, 5, 7].filter(i => !board[i]);
        return pool[Math.floor(Math.random() * pool.length)];
      }

      function hardTttMove() {
        const board = state.ttt.board;
        let best = -Infinity;
        let moves = [];
        for (let i = 0; i < 9; i++) if (!board[i]) {
          board[i] = "O";
          const score = minimax(board, false);
          board[i] = "";
          if (score > best) { best = score; moves = [i]; }
          else if (score === best) moves.push(i);
        }
        return moves[Math.floor(Math.random() * moves.length)];
      }

      function computerTttMove() {
        const game = state.ttt;
        game.aiTimer = null;
        if (game.over || game.mode !== "ai" || game.turn !== "O") return;
        const move = game.difficulty === "easy" ? easyTttMove()
          : game.difficulty === "medium" ? mediumTttMove() : hardTttMove();
        if (move === undefined) return;
        game.board[move] = "O";
        const result = getTttWinner(game.board);
        if (result) return finishTtt(result.mark, result.line);
        if (isTttDraw(game.board)) return finishTtt("draw");
        game.turn = "X";
        tttStatus("نوبت توست · X", "var(--green)");
        renderTtt();
      }

      function newTttRound() {
        clearTimeout(state.ttt.aiTimer);
        state.ttt.aiTimer = null;
        state.ttt.board = Array(9).fill("");
        state.ttt.turn = "X";
        state.ttt.over = false;
        state.ttt.winner = null;
        state.ttt.line = null;
        tttStatus(state.ttt.mode === "ai" ? "نوبت توست · X" : "نوبت بازیکن X", "var(--green)");
        renderTtt();
      }

      function setTttMode(mode) {
        if (state.ttt.mode === mode) return;
        state.ttt.mode = mode;
        newTttRound();
      }

      function resetTttScores() {
        state.scores.ttt[state.ttt.mode] = { x: 0, o: 0, draw: 0 };
        persistScores();
        newTttRound();
        showToast("امتیازهای این حالت صفر شد.");
      }

      // Rock / Paper / Scissors AI
      function randomRpsMove() {
        const choices = Object.keys(symbols);
        return choices[Math.floor(Math.random() * choices.length)];
      }

      function counterMove(move) {
        return ({ rock: "paper", paper: "scissors", scissors: "rock" })[move];
      }

      function mostFrequentMove(history) {
        const counts = { rock: 0, paper: 0, scissors: 0 };
        history.forEach(move => counts[move]++);
        const max = Math.max(...Object.values(counts));
        const leaders = Object.keys(counts).filter(move => counts[move] === max);
        return leaders[Math.floor(Math.random() * leaders.length)];
      }

      function smartRpsMove() {
        const history = state.rps.history;
        if (history.length < 3) return randomRpsMove();

        if (state.rps.difficulty === "medium") {
          if (Math.random() < 0.72) return counterMove(mostFrequentMove(history.slice(-10)));
          return randomRpsMove();
        }

        // Hard AI: looks for repeated two-move sequences, then uses a recency-weighted fallback.
        if (history.length >= 4 && Math.random() < 0.78) {
          const a = history[history.length - 2];
          const b = history[history.length - 1];
          const predicted = [];
          for (let i = 0; i < history.length - 2; i++) {
            if (history[i] === a && history[i + 1] === b) predicted.push(history[i + 2]);
          }
          if (predicted.length) return counterMove(mostFrequentMove(predicted));
        }

        const weights = { rock: 0, paper: 0, scissors: 0 };
        history.forEach((move, index) => {
          weights[move] += Math.pow(0.86, history.length - index - 1);
        });
        const max = Math.max(...Object.values(weights));
        const leaders = Object.keys(weights).filter(move => weights[move] === max);
        const likely = leaders[Math.floor(Math.random() * leaders.length)];
        return Math.random() < 0.78 ? counterMove(likely) : randomRpsMove();
      }

      function getRpsOutcome(player, ai) {
        if (player === ai) return "draw";
        const wins = { rock: "scissors", paper: "rock", scissors: "paper" };
        return wins[player] === ai ? "player" : "ai";
      }

      function renderRpsScores() {
        const score = state.scores.rps;
        $("#rps-scores").innerHTML = [
          scoreCard("برد تو", score.player, "var(--green)"),
          scoreCard("مساوی", score.draw, "var(--gold)"),
          scoreCard("برد هوش مصنوعی", score.ai, "var(--pink)")
        ].join("");
      }

      function playRps(playerMove) {
        const aiMove = state.rps.difficulty === "easy" ? randomRpsMove() : smartRpsMove();
        const outcome = getRpsOutcome(playerMove, aiMove);
        const score = state.scores.rps;
        if (outcome === "player") score.player++;
        else if (outcome === "ai") score.ai++;
        else score.draw++;

        state.rps.history.push(playerMove);
        if (state.rps.history.length > 30) state.rps.history.shift();
        state.rps.round++;

        $("#rps-player-pick").textContent = symbols[playerMove].emoji;
        $("#rps-ai-pick").textContent = symbols[aiMove].emoji;
        const result = $("#rps-result");
        result.className = `rps-result ${outcome === "player" ? "win" : outcome === "ai" ? "loss" : "draw"}`;

        const messages = {
          player: "این دست را بردی! آفرین 👏",
          ai: "این دست را هوش مصنوعی برد. دوباره امتحان کن!",
          draw: "مساوی شد! انتخاب هر دو یکی بود."
        };
        result.textContent = `${symbols[playerMove].name} تو در برابر ${symbols[aiMove].name} هوش مصنوعی — ${messages[outcome]}`;

        persistScores();
        renderRpsScores();
      }

      function resetRpsScores() {
        state.scores.rps = { player: 0, ai: 0, draw: 0 };
        state.rps.history = [];
        state.rps.round = 0;
        persistScores();
        renderRpsScores();
        $("#rps-player-pick").textContent = "❔";
        $("#rps-ai-pick").textContent = "🤖";
        $("#rps-result").className = "rps-result";
        $("#rps-result").textContent = "امتیازها و سابقه انتخاب‌های هوش مصنوعی پاک شد. دوباره شروع کن!";
        showToast("امتیازهای سنگ، کاغذ، قیچی صفر شد.");
      }


      // ---------------------------------------------
      // Arcade engine: smooth Snake + premium Breaker
      // ---------------------------------------------
      const faNumber = (value) => new Intl.NumberFormat("fa-IR").format(value);
      let audioContext = null;
      function playTone(kind, toggleId) {
        const toggle = toggleId ? document.getElementById(toggleId) : null;
        if (toggle && !toggle.checked) return;
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          audioContext ||= new AudioCtx();
          if (audioContext.state === "suspended") audioContext.resume();
          const now = audioContext.currentTime;
          const config = {
            eat: [620, 1040, .11, "sine"], crash: [190, 48, .34, "sawtooth"],
            brick: [520, 250, .075, "triangle"], paddle: [280, 520, .065, "sine"],
            life: [260, 90, .24, "triangle"], win: [520, 1320, .32, "sine"],
            power: [420, 1180, .22, "sine"], combo: [700, 1480, .14, "triangle"]
          }[kind] || [440, 660, .08, "sine"];
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = config[3];
          osc.frequency.setValueAtTime(config[0], now);
          osc.frequency.exponentialRampToValueAtTime(Math.max(45, config[1]), now + config[2]);
          gain.gain.setValueAtTime(.0001, now);
          gain.gain.exponentialRampToValueAtTime(.05, now + .012);
          gain.gain.exponentialRampToValueAtTime(.0001, now + config[2]);
          osc.connect(gain); gain.connect(audioContext.destination);
          osc.start(now); osc.stop(now + config[2] + .025);
        } catch (_) { /* Audio is optional and browser-controlled. */ }
      }
      function showArcadeOverlay(id, icon, title, message, buttonText, action) {
        const node = document.getElementById(id);
        node.innerHTML = `<div class="overlay-icon">${icon}</div><h3>${title}</h3><p>${message}</p><button class="btn primary big-btn" data-action="${action}">${buttonText}</button>`;
        node.classList.remove("is-hidden");
      }
      function hideArcadeOverlay(id) { document.getElementById(id).classList.add("is-hidden"); }
      function roundedRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
        else {
          ctx.moveTo(x + radius, y); ctx.arcTo(x + w, y, x + w, y + h, radius);
          ctx.arcTo(x + w, y + h, x, y + h, radius); ctx.arcTo(x, y + h, x, y, radius);
          ctx.arcTo(x, y, x + w, y, radius); ctx.closePath();
        }
      }
      function glowText(ctx, text, x, y, color, size = 14) {
        ctx.save(); ctx.font = `800 ${size}px Vazirmatn, sans-serif`; ctx.textAlign = "center";
        ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
      }

      // ---------------------------------------------
      // Snake: fixed-step simulation + interpolated rendering
      // ---------------------------------------------
      const snakeCanvas = document.getElementById("snake-canvas");
      const snakeCtx = snakeCanvas.getContext("2d");
      const SW = snakeCanvas.width, SH = snakeCanvas.height, TILE = 24;
      const S_COLS = SW / TILE, S_ROWS = SH / TILE;
      const directionMap = {
        up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
      };
      const snakeDifficulty = document.getElementById("snake-difficulty");
      let snake = [], snakePrevious = [], snakeFood = null, snakeBonusFood = null;
      let snakeDirection = { x: 1, y: 0 }, snakeQueuedDirection = { x: 1, y: 0 };
      let snakeMode = "ready", snakeRaf = null, snakeLastFrame = 0, snakeAccumulator = 0;
      let snakeScore = 0, snakeBest = Number(localStorage.getItem("gamehub-snake-best") || 0);
      let snakeLevel = 1, snakeCombo = 0, snakeLastEat = 0, snakeGrowth = 0, snakeFoodCount = 0;
      let snakeParticles = [], snakeFloaters = [], snakeTick = 0;
      const snakeStars = Array.from({ length: 54 }, () => ({
        x: Math.random() * SW, y: Math.random() * SH, r: .5 + Math.random() * 1.7,
        phase: Math.random() * Math.PI * 2, drift: .15 + Math.random() * .4
      }));
      const snakeBaseDelay = () => ({ chill: 158, normal: 125, turbo: 98 }[snakeDifficulty?.value || "normal"]);
      const snakeStepDelay = () => Math.max(58, snakeBaseDelay() - Math.max(0, snakeLevel - 1) * 7);
      const randCell = () => ({ x: Math.floor(Math.random() * S_COLS), y: Math.floor(Math.random() * S_ROWS) });
      function randomSnakeFreeCell() {
        for (let tries = 0; tries < 1200; tries++) {
          const p = randCell();
          if (!snake.some(s => s.x === p.x && s.y === p.y) &&
              (!snakeFood || p.x !== snakeFood.x || p.y !== snakeFood.y) &&
              (!snakeBonusFood || p.x !== snakeBonusFood.x || p.y !== snakeBonusFood.y)) return p;
        }
        return randCell();
      }
      function placeSnakeFood(type = "normal") {
        const p = randomSnakeFreeCell();
        if (type === "bonus") snakeBonusFood = { ...p, life: 7.5, phase: Math.random() * 6 };
        else snakeFood = { ...p, phase: Math.random() * 6 };
      }
      function updateSnakeStats() {
        document.getElementById("snake-score").textContent = faNumber(snakeScore);
        document.getElementById("snake-best").textContent = faNumber(snakeBest);
        document.getElementById("snake-speed").textContent = (snakeBaseDelay() / snakeStepDelay()).toLocaleString("fa-IR", { maximumFractionDigits: 2 }) + "×";
        const level = document.getElementById("snake-level-label");
        const combo = document.getElementById("snake-combo");
        if (level) level.textContent = `مرحله ${faNumber(snakeLevel)}`;
        if (combo) combo.textContent = snakeCombo > 1 ? `کمبو ×${faNumber(snakeCombo)}` : "کمبو: آماده";
      }
      function emitSnakeParticles(x, y, color, count = 16) {
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2, speed = 1.2 + Math.random() * 3.6;
          snakeParticles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
            life: .45 + Math.random() * .55, max: 1, size: 1.4 + Math.random() * 3, color });
        }
      }
      function resetSnake() {
        if (snakeRaf) cancelAnimationFrame(snakeRaf);
        snakeRaf = null; snakeMode = "ready"; snakeAccumulator = 0;
        snake = [ { x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 }, { x: 9, y: 10 } ];
        snakePrevious = snake.map(p => ({ ...p }));
        snakeDirection = { x: 1, y: 0 }; snakeQueuedDirection = { x: 1, y: 0 };
        snakeScore = 0; snakeLevel = 1; snakeCombo = 0; snakeLastEat = 0; snakeGrowth = 0; snakeFoodCount = 0;
        snakeParticles = []; snakeFloaters = []; snakeBonusFood = null; snakeFood = null;
        placeSnakeFood("normal"); updateSnakeStats(); drawSnake(0, 0);
        showArcadeOverlay("snake-overlay", "🐍", "آماده شکار انرژی؟", "میوه‌های طلایی امتیاز بیشتر دارند؛ هر ۵ امتیاز سرعت بازی بالاتر می‌رود.", "شروع بازی", "snake-start");
      }
      function setSnakeDirection(name) {
        const next = directionMap[name];
        if (!next || snakeMode === "over") return;
        if (next.x === -snakeDirection.x && next.y === -snakeDirection.y) return;
        if (next.x === -snakeQueuedDirection.x && next.y === -snakeQueuedDirection.y) return;
        snakeQueuedDirection = next;
        if (snakeMode === "ready") startSnake();
      }
      function startSnake() {
        if (snakeMode === "over") resetSnake();
        if (snakeMode === "running") return;
        snakeMode = "running"; hideArcadeOverlay("snake-overlay");
        snakeLastFrame = performance.now(); snakeAccumulator = 0;
        snakeRaf = requestAnimationFrame(snakeFrame);
        drawSnake(0, 0);
      }
      function pauseSnake() {
        if (snakeMode !== "running") return;
        if (snakeRaf) cancelAnimationFrame(snakeRaf);
        snakeRaf = null; snakeMode = "paused";
        showArcadeOverlay("snake-overlay", "Ⅱ", "استراحت کوتاه", "مسیرت حفظ شده؛ هر وقت آماده‌ای ادامه بده.", "ادامه بازی", "snake-start");
      }
      function snakeFrame(now) {
        if (snakeMode !== "running") return;
        const delta = Math.min(80, Math.max(0, now - snakeLastFrame));
        snakeLastFrame = now; snakeAccumulator += delta;
        const step = snakeStepDelay();
        let steps = 0;
        while (snakeAccumulator >= step && steps < 5 && snakeMode === "running") {
          snakeAccumulator -= step; snakeStep(); steps++;
        }
        updateSnakeParticles(delta / 1000);
        drawSnake(Math.min(1, snakeAccumulator / step), now);
        if (snakeMode === "running") snakeRaf = requestAnimationFrame(snakeFrame);
      }
      function snakeStep() {
        snakeDirection = snakeQueuedDirection;
        const head = { x: snake[0].x + snakeDirection.x, y: snake[0].y + snakeDirection.y };
        const eatingMain = snakeFood && head.x === snakeFood.x && head.y === snakeFood.y;
        const eatingBonus = snakeBonusFood && head.x === snakeBonusFood.x && head.y === snakeBonusFood.y;
        const willGrow = eatingMain || eatingBonus || snakeGrowth > 0;
        const body = willGrow ? snake : snake.slice(0, -1);
        if (head.x < 0 || head.x >= S_COLS || head.y < 0 || head.y >= S_ROWS || body.some(p => p.x === head.x && p.y === head.y)) {
          endSnake(); return;
        }
        snakePrevious = snake.map(p => ({ ...p }));
        snake.unshift(head);
        if (eatingMain || eatingBonus) {
          const now = performance.now();
          snakeCombo = now - snakeLastEat < 4200 ? Math.min(8, snakeCombo + 1) : 1;
          snakeLastEat = now;
          const bonus = eatingBonus;
          const earned = bonus ? 5 : Math.max(1, Math.min(4, snakeCombo));
          snakeScore += earned;
          if (bonus) { snakeGrowth += 2; snakeBonusFood = null; playTone("power", "sound-toggle"); }
          else { playTone("eat", "sound-toggle"); snakeFood = null; }
          const px = (head.x + .5) * TILE, py = (head.y + .5) * TILE;
          emitSnakeParticles(px, py, bonus ? "#ffd36e" : "#54f2ce", bonus ? 28 : 18);
          snakeFloaters.push({ x: px, y: py - 6, text: `+${earned}`, life: .85, color: bonus ? "#ffd36e" : "#69f4d4" });
          if (eatingMain) {
            snakeFoodCount++;
            placeSnakeFood("normal");
            if (snakeFoodCount % 4 === 0 && !snakeBonusFood) placeSnakeFood("bonus");
          }
          const nextLevel = Math.floor(snakeScore / 5) + 1;
          if (nextLevel > snakeLevel) {
            snakeLevel = nextLevel;
            showToast(`مرحله ${faNumber(snakeLevel)}؛ سرعت بیشتر شد!`);
            playTone("win", "sound-toggle");
          }
          updateSnakeStats();
        } else if (snakeGrowth > 0) snakeGrowth--;
        else snake.pop();
        if (snakeBonusFood) {
          snakeBonusFood.life -= snakeStepDelay() / 1000;
          if (snakeBonusFood.life <= 0) snakeBonusFood = null;
        }
        snakeTick++;
      }
      function updateSnakeParticles(dt) {
        snakeParticles = snakeParticles.filter(p => p.life > 0);
        snakeParticles.forEach(p => { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.vx *= .985; p.vy *= .985; p.life -= dt; });
        snakeFloaters = snakeFloaters.filter(p => p.life > 0);
        snakeFloaters.forEach(p => { p.y -= 24 * dt; p.life -= dt; });
      }
      function endSnake() {
        snakeMode = "over"; snakeRaf = null; playTone("crash", "sound-toggle");
        const isNewRecord = snakeScore > snakeBest;
        if (isNewRecord) { snakeBest = snakeScore; localStorage.setItem("gamehub-snake-best", String(snakeBest)); }
        updateSnakeStats(); emitSnakeParticles((snake[0].x + .5) * TILE, (snake[0].y + .5) * TILE, "#ff678d", 34);
        showArcadeOverlay("snake-overlay", "💥", "برخورد کردی!", `امتیاز ${faNumber(snakeScore)} · مرحله ${faNumber(snakeLevel)} · ${isNewRecord ? "رکورد تازه ثبت شد!" : "یک بار دیگر امتحان کن."}`, "دوباره بازی کن", "snake-restart");
      }
      function drawSnake(alpha = 0, now = performance.now()) {
        const c = snakeCtx; c.clearRect(0, 0, SW, SH);
        const bg = c.createLinearGradient(0, 0, SW, SH); bg.addColorStop(0, "#061323"); bg.addColorStop(.55, "#0a1c30"); bg.addColorStop(1, "#071725");
        c.fillStyle = bg; c.fillRect(0, 0, SW, SH);
        // Slow drifting stars and subtle grid.
        snakeStars.forEach(s => { const twinkle = .28 + .48 * (0.5 + .5 * Math.sin(now / 650 + s.phase)); c.globalAlpha = twinkle; c.fillStyle = "#9bd8ed"; c.beginPath(); c.arc(s.x, s.y + Math.sin(now / 2200 + s.phase) * 3, s.r, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1;
        c.strokeStyle = "rgba(104,174,206,.065)"; c.lineWidth = 1;
        for (let x = 0; x <= SW; x += TILE) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, SH); c.stroke(); }
        for (let y = 0; y <= SH; y += TILE) { c.beginPath(); c.moveTo(0, y); c.lineTo(SW, y); c.stroke(); }
        c.strokeStyle = "rgba(70,227,207,.16)"; c.lineWidth = 2; c.strokeRect(1, 1, SW - 2, SH - 2);
        // Main fruit: pulsing core with orbiting sparkles.
        if (snakeFood) {
          const fx = (snakeFood.x + .5) * TILE, fy = (snakeFood.y + .5) * TILE, pulse = 1 + .12 * Math.sin(now / 135);
          c.save(); c.shadowColor = "#ff9e59"; c.shadowBlur = 25;
          const fg = c.createRadialGradient(fx - 3, fy - 4, 1, fx, fy, 12 * pulse); fg.addColorStop(0, "#fff4d4"); fg.addColorStop(.4, "#ffc56b"); fg.addColorStop(1, "#ef6f60");
          c.fillStyle = fg; c.beginPath(); c.arc(fx, fy, 7.5 * pulse, 0, Math.PI * 2); c.fill(); c.restore();
          c.strokeStyle = "rgba(255,194,113,.48)"; c.beginPath(); c.arc(fx, fy, 12 + 2 * Math.sin(now / 180), now / 500, now / 500 + Math.PI * 1.3); c.stroke();
        }
        if (snakeBonusFood) {
          const fx = (snakeBonusFood.x + .5) * TILE, fy = (snakeBonusFood.y + .5) * TILE, pulse = 1 + .18 * Math.sin(now / 85);
          c.save(); c.shadowColor = "#ffe27a"; c.shadowBlur = 30;
          c.fillStyle = "#ffe27a"; c.beginPath(); c.arc(fx, fy, 8.5 * pulse, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "rgba(255,235,151,.7)"; c.lineWidth = 2; c.beginPath(); c.arc(fx, fy, 14 + Math.sin(now / 110) * 2, 0, Math.PI * 2); c.stroke(); c.restore();
          c.fillStyle = "#fff4c4"; c.font = "bold 9px sans-serif"; c.textAlign = "center"; c.fillText("★", fx, fy + 3);
        }
        // Body with soft bloom and a moving highlight.
        snake.forEach((part, index) => {
          const previous = index === 0 ? (snakePrevious[0] || part) : (snakePrevious[index - 1] || part);
          const px = (previous.x + (part.x - previous.x) * alpha) * TILE;
          const py = (previous.y + (part.y - previous.y) * alpha) * TILE;
          const inset = index === 0 ? 2 : 3.2, x = px + inset, y = py + inset, size = TILE - inset * 2;
          const ratio = 1 - index / Math.max(12, snake.length + 5);
          c.save(); c.shadowBlur = index === 0 ? 21 : 9; c.shadowColor = index === 0 ? "#73ffe0" : "#22cfa9";
          const g = c.createLinearGradient(x, y, x + size, y + size);
          g.addColorStop(0, `hsl(${157 + ratio * 16}, 95%, ${55 + ratio * 17}%)`);
          g.addColorStop(1, `hsl(${176 + ratio * 9}, 78%, ${29 + ratio * 12}%)`);
          c.fillStyle = g; roundedRect(c, x, y, size, size, index === 0 ? 8 : 6); c.fill();
          c.shadowBlur = 0; c.fillStyle = "rgba(236,255,251,.23)"; roundedRect(c, x + 3, y + 2, size - 6, 3, 2); c.fill(); c.restore();
          if (index === 0) {
            const dx = snakeDirection.x, dy = snakeDirection.y;
            const eye1 = { x: px + (dx > 0 ? 17 : dx < 0 ? 6 : 7), y: py + (dy > 0 ? 17 : dy < 0 ? 6 : 6) };
            const eye2 = dx !== 0 ? { x: eye1.x, y: eye1.y + 10 } : { x: eye1.x + 10, y: eye1.y };
            c.fillStyle = "#06202b"; c.beginPath(); c.arc(eye1.x, eye1.y, 2.5, 0, Math.PI * 2); c.arc(eye2.x, eye2.y, 2.5, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#eafff8"; c.beginPath(); c.arc(eye1.x + .5, eye1.y - .5, .9, 0, Math.PI * 2); c.arc(eye2.x + .5, eye2.y - .5, .9, 0, Math.PI * 2); c.fill();
          }
        });
        snakeParticles.forEach(p => { c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 9; c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1; c.shadowBlur = 0;
        snakeFloaters.forEach(p => { c.globalAlpha = Math.min(1, p.life * 1.5); c.font = "900 16px Vazirmatn, sans-serif"; c.textAlign = "center"; c.shadowColor = p.color; c.shadowBlur = 12; c.fillStyle = p.color; c.fillText(p.text, p.x, p.y); }); c.globalAlpha = 1; c.shadowBlur = 0;
        // Compact in-canvas level badge.
        c.save(); c.fillStyle = "rgba(4,15,27,.62)"; roundedRect(c, SW - 111, 12, 96, 28, 10); c.fill(); c.font = "700 11px Vazirmatn, sans-serif"; c.textAlign = "center"; c.fillStyle = "#9fc9df"; c.fillText(`LEVEL ${snakeLevel}`, SW - 63, 30); c.restore();
      }

      // ---------------------------------------------
      // Brick Breaker: robust delta-time physics + drops
      // ---------------------------------------------
      const breakerCanvas = document.getElementById("breaker-canvas");
      const breakerCtx = breakerCanvas.getContext("2d");
      const BW = breakerCanvas.width, BH = breakerCanvas.height;
      let breakerMode = "ready", breakerRaf = null, breakerLastTime = 0;
      let breakerScore = 0, breakerBest = Number(localStorage.getItem("gamehub-breaker-best") || 0), breakerLives = 3, breakerLevel = 1;
      let paddle = { x: BW / 2 - 64, y: BH - 35, w: 128, baseW: 128, h: 13, targetX: BW / 2, velocity: 0 };
      let balls = [], bricks = [], breakerParticles = [], powerDrops = [], breakerKeys = { left: false, right: false };
      let breakerCombo = 0, breakerLastHit = 0, breakerShake = 0, breakerWideUntil = 0, breakerSlowUntil = 0, breakerFlash = 0;
      const brickPalette = ["#39ddce", "#53b9ff", "#8d91ff", "#c178f2", "#ff88ae", "#ffbd69"];
      const powerKinds = {
        wide: { label: "پدل عریض", icon: "↔", color: "#54d9ff" },
        slow: { label: "توپ آهسته", icon: "◷", color: "#b9a0ff" },
        multi: { label: "توپ چندگانه", icon: "✣", color: "#ffe17b" },
        life: { label: "جان اضافه", icon: "♥", color: "#ff83a4" }
      };
      const remainingBricks = () => bricks.filter(b => b.alive).length;
      function updateBreakerStats() {
        document.getElementById("breaker-score").textContent = faNumber(breakerScore);
        document.getElementById("breaker-best").textContent = faNumber(breakerBest);
        document.getElementById("breaker-level").textContent = faNumber(breakerLevel);
        document.getElementById("breaker-lives").textContent = faNumber(breakerLives);
        const combo = document.getElementById("breaker-combo");
        const power = document.getElementById("breaker-power");
        if (combo) combo.textContent = breakerCombo >= 2 ? `کمبو ×${faNumber(breakerCombo)}` : "کمبو: آماده";
        if (power) {
          const now = performance.now();
          const active = now < breakerWideUntil ? "پدل عریض" : now < breakerSlowUntil ? "توپ آهسته" : "بدون قدرت فعال";
          power.textContent = active;
        }
      }
      function makeBreakerLevel() {
        bricks = [];
        const rows = Math.min(5 + Math.floor((breakerLevel - 1) / 2), 8), cols = 10, gap = 8, margin = 25;
        const bw = (BW - margin * 2 - gap * (cols - 1)) / cols, bh = 22;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const pattern = (row + breakerLevel) % 3;
          if (breakerLevel > 1 && pattern === 1 && (col === 0 || col === cols - 1) && row % 2 === 0) continue;
          if (breakerLevel > 3 && (row * 2 + col + breakerLevel) % 17 === 0) continue;
          const armored = breakerLevel >= 3 && ((row + col + breakerLevel) % 7 === 0);
          const hp = armored ? 2 : 1;
          bricks.push({ x: margin + col * (bw + gap), y: 55 + row * (bh + 9), w: bw, h: bh, hp, maxHp: hp,
            color: brickPalette[(row + breakerLevel - 1) % brickPalette.length], alive: true, hit: 0 });
        }
      }
      function placeBalls() {
        balls = [{ x: paddle.x + paddle.w / 2, y: paddle.y - 10, vx: 0, vy: 0, r: 7, trail: [], launched: false }];
      }
      function resetBreaker() {
        stopBreakerFrame(); breakerMode = "ready"; breakerScore = 0; breakerLives = 3; breakerLevel = 1;
        breakerCombo = 0; breakerLastHit = 0; breakerParticles = []; powerDrops = [];
        breakerWideUntil = 0; breakerSlowUntil = 0; breakerShake = 0; breakerFlash = 0;
        paddle.w = paddle.baseW; paddle.x = BW / 2 - paddle.w / 2; paddle.targetX = BW / 2; paddle.velocity = 0;
        makeBreakerLevel(); placeBalls(); updateBreakerStats(); drawBreaker(0);
        showArcadeOverlay("breaker-overlay", "🧱", "آماده خرد کردن دیواری؟", "کمبو بساز، پاورآپ بگیر و آجرهای زرهی را دو بار بزن.", "شروع بازی", "breaker-start");
      }
      function startBreaker() {
        if (breakerMode === "over") resetBreaker();
        if (breakerMode === "running") return;
        breakerMode = "running"; hideArcadeOverlay("breaker-overlay");
        balls.forEach((b, i) => {
          if (!b.launched) {
            const angle = (i - (balls.length - 1) / 2) * .15;
            const speed = 360 + breakerLevel * 24;
            b.vx = Math.sin(angle || (Math.random() < .5 ? -.16 : .16)) * speed;
            b.vy = -Math.cos(angle) * speed; b.launched = true;
          }
        });
        breakerLastTime = performance.now(); breakerRaf = requestAnimationFrame(breakerLoop);
      }
      function pauseBreaker() {
        if (breakerMode !== "running") return;
        breakerMode = "paused"; stopBreakerFrame();
        showArcadeOverlay("breaker-overlay", "Ⅱ", "بازی مکث شد", "توپ‌ها و موقعیت پدل حفظ شده‌اند.", "ادامه بازی", "breaker-start");
      }
      function stopBreakerFrame() { if (breakerRaf) cancelAnimationFrame(breakerRaf); breakerRaf = null; }
      function movePaddleTo(clientX) {
        const rect = breakerCanvas.getBoundingClientRect();
        const x = (clientX - rect.left) * (BW / rect.width);
        paddle.targetX = Math.max(paddle.w / 2, Math.min(BW - paddle.w / 2, x));
        if (breakerMode !== "running") { paddle.x = paddle.targetX - paddle.w / 2; if (balls.length && !balls[0].launched) balls[0].x = paddle.targetX; drawBreaker(0); }
      }
      breakerCanvas.addEventListener("pointermove", e => movePaddleTo(e.clientX));
      breakerCanvas.addEventListener("pointerdown", e => { movePaddleTo(e.clientX); if (breakerMode === "ready" || breakerMode === "paused") startBreaker(); });
      function breakerLoop(now) {
        if (breakerMode !== "running") return;
        const dt = Math.min(.034, Math.max(.001, (now - breakerLastTime) / 1000)); breakerLastTime = now;
        updateBreaker(dt, now); drawBreaker(now);
        if (breakerMode === "running") breakerRaf = requestAnimationFrame(breakerLoop);
      }
      function emitBreakerParticles(x, y, color, count = 14, force = 180) {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2, speed = force * (.25 + Math.random() * .75);
          breakerParticles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: .35 + Math.random() * .55, max: .9, color, size: 1.5 + Math.random() * 3.3, spin: Math.random() * 7 });
        }
      }
      function circleRectCollision(cx, cy, radius, rect) {
        const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
        const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
        const dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy <= radius * radius;
      }
      function spawnPowerDrop(brick) {
        if (Math.random() > .17) return;
        const kinds = ["wide", "slow", "multi", "life"];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        powerDrops.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, vy: 105, kind, phase: Math.random() * 7, size: 13 });
      }
      function activatePower(kind) {
        const now = performance.now();
        if (kind === "wide") { breakerWideUntil = now + 11500; paddle.w = 184; paddle.x = Math.max(0, Math.min(BW - paddle.w, paddle.x)); }
        if (kind === "slow") breakerSlowUntil = now + 9000;
        if (kind === "life") breakerLives = Math.min(5, breakerLives + 1);
        if (kind === "multi") {
          const originals = balls.filter(b => b.launched).slice(0, 2);
          originals.forEach(b => {
            [-0.46, 0.46].forEach(spread => {
              const speed = Math.hypot(b.vx, b.vy);
              const angle = Math.atan2(b.vx, -b.vy) + spread;
              balls.push({ x: b.x, y: b.y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, r: b.r, trail: [], launched: true });
            });
          });
        }
        const info = powerKinds[kind];
        emitBreakerParticles(paddle.x + paddle.w / 2, paddle.y, info.color, 28, 260);
        playTone("power", "sound-toggle-breaker");
        showToast(`پاورآپ فعال شد: ${info.label}`); updateBreakerStats();
      }
      function hitBrick(brick, ball) {
        const oldHp = brick.hp; brick.hp--; brick.hit = .16;
        breakerCombo = breakerLastHit && performance.now() - breakerLastHit < 1900 ? breakerCombo + 1 : 1;
        breakerLastHit = performance.now(); breakerFlash = .7;
        if (brick.hp <= 0) {
          brick.alive = false;
          const multiplier = 1 + Math.floor((breakerCombo - 1) / 4) * .5;
          breakerScore += Math.round(10 * breakerLevel * multiplier);
          emitBreakerParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 22, 230);
          spawnPowerDrop(brick); breakerShake = Math.min(9, breakerShake + 2.6);
          if (breakerCombo >= 4) playTone("combo", "sound-toggle-breaker"); else playTone("brick", "sound-toggle-breaker");
        } else {
          breakerScore += 3 * breakerLevel;
          emitBreakerParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, "#fff0a5", 9, 130);
          playTone("brick", "sound-toggle-breaker");
        }
        updateBreakerStats();
      }
      function moveOneBall(b, dt, now) {
        const slow = now < breakerSlowUntil ? .68 : 1;
        const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt * slow / (b.r * .85)));
        const sx = b.vx * dt * slow / steps, sy = b.vy * dt * slow / steps;
        for (let step = 0; step < steps; step++) {
          const oldX = b.x, oldY = b.y; b.x += sx; b.y += sy;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
          if (b.x > BW - b.r) { b.x = BW - b.r; b.vx = -Math.abs(b.vx); }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
          if (b.vy > 0 && circleRectCollision(b.x, b.y, b.r, paddle)) {
            b.y = paddle.y - b.r - .5;
            const hit = Math.max(-1, Math.min(1, (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)));
            const speed = Math.min(650, Math.max(380, Math.hypot(b.vx, b.vy) * 1.015));
            const angle = hit * 1.05 + Math.max(-.12, Math.min(.12, paddle.velocity / 5200));
            b.vx = Math.sin(angle) * speed; b.vy = -Math.cos(angle) * speed;
            emitBreakerParticles(b.x, paddle.y, "#7ef6e5", 7, 95); playTone("paddle", "sound-toggle-breaker");
          }
          let collided = false;
          for (const brick of bricks) {
            if (!brick.alive || !circleRectCollision(b.x, b.y, b.r, brick)) continue;
            const overlapL = Math.abs((b.x + b.r) - brick.x);
            const overlapR = Math.abs((brick.x + brick.w) - (b.x - b.r));
            const overlapT = Math.abs((b.y + b.r) - brick.y);
            const overlapB = Math.abs((brick.y + brick.h) - (b.y - b.r));
            const minX = Math.min(overlapL, overlapR), minY = Math.min(overlapT, overlapB);
            if (minX < minY) { b.vx *= -1; b.x = oldX; } else { b.vy *= -1; b.y = oldY; }
            hitBrick(brick, b); collided = true; break;
          }
          if (collided) break;
        }
        b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 11) b.trail.pop();
        return b.y <= BH + b.r;
      }
      function updateBreaker(dt, now) {
        const oldX = paddle.x;
        if (breakerKeys.left) paddle.targetX -= 700 * dt;
        if (breakerKeys.right) paddle.targetX += 700 * dt;
        paddle.targetX = Math.max(paddle.w / 2, Math.min(BW - paddle.w / 2, paddle.targetX));
        const targetLeft = paddle.targetX - paddle.w / 2;
        paddle.x += (targetLeft - paddle.x) * Math.min(1, 17 * dt);
        paddle.x = Math.max(0, Math.min(BW - paddle.w, paddle.x));
        paddle.velocity = (paddle.x - oldX) / Math.max(dt, .001);
        if (now > breakerWideUntil && paddle.w !== paddle.baseW) { paddle.w = paddle.baseW; paddle.x = Math.min(paddle.x, BW - paddle.w); paddle.targetX = paddle.x + paddle.w / 2; }
        balls = balls.filter(b => moveOneBall(b, dt, now));
        if (!balls.length) {
          breakerLives--; playTone("life", "sound-toggle-breaker"); updateBreakerStats();
          if (breakerLives <= 0) { finishBreaker(false); return; }
          placeBalls(); breakerMode = "ready"; stopBreakerFrame(); drawBreaker(now);
          showArcadeOverlay("breaker-overlay", "❤️", "یک جان از دست رفت", `${faNumber(breakerLives)} جان باقی مانده؛ پدل را تنظیم و دوباره پرتاب کن.`, "ادامه بازی", "breaker-start"); return;
        }
        // Power capsules fall toward the paddle.
        powerDrops = powerDrops.filter(drop => {
          drop.y += drop.vy * dt; drop.phase += dt * 5;
          if (drop.y + drop.size >= paddle.y && drop.y - drop.size <= paddle.y + paddle.h && drop.x >= paddle.x - drop.size && drop.x <= paddle.x + paddle.w + drop.size) {
            activatePower(drop.kind); return false;
          }
          return drop.y < BH + 25;
        });
        breakerParticles = breakerParticles.filter(p => p.life > 0);
        breakerParticles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.vx *= .992; p.life -= dt; });
        bricks.forEach(b => { if (b.hit > 0) b.hit -= dt; });
        breakerShake *= Math.pow(.04, dt); breakerFlash = Math.max(0, breakerFlash - dt * 2.8);
        if (now - breakerLastHit > 1900) breakerCombo = 0;
        updateBreakerStats();
        if (remainingBricks() === 0) {
          breakerLevel++; playTone("win", "sound-toggle-breaker"); emitBreakerParticles(BW / 2, 170, "#ffe18c", 75, 320);
          makeBreakerLevel(); placeBalls(); breakerMode = "ready"; stopBreakerFrame(); updateBreakerStats(); drawBreaker(now);
          showArcadeOverlay("breaker-overlay", "🏆", `مرحله ${faNumber(breakerLevel - 1)} پاک‌سازی شد!`, "مرحله بعد آجرهای زرهی بیشتری دارد؛ آماده‌ای؟", "رفتن به مرحله بعد", "breaker-start");
        }
      }
      function finishBreaker(won) {
        breakerMode = "over"; stopBreakerFrame();
        const isNew = breakerScore > breakerBest;
        if (isNew) { breakerBest = breakerScore; localStorage.setItem("gamehub-breaker-best", String(breakerBest)); }
        updateBreakerStats();
        showArcadeOverlay("breaker-overlay", won ? "🏆" : "💥", won ? "تو قهرمانی!" : "پایان بازی", `امتیاز نهایی: ${faNumber(breakerScore)} · مرحله: ${faNumber(breakerLevel)} · ${isNew ? "رکورد جدید!" : "برای رکورد بهتر دوباره تلاش کن."}`, "شروع دوباره", "breaker-restart");
      }
      function drawBreaker(now = performance.now()) {
        const c = breakerCtx; c.clearRect(0, 0, BW, BH);
        c.save();
        if (breakerShake > .3) c.translate((Math.random() - .5) * breakerShake, (Math.random() - .5) * breakerShake);
        const bg = c.createLinearGradient(0, 0, BW, BH); bg.addColorStop(0, "#061321"); bg.addColorStop(.55, "#0a1d32"); bg.addColorStop(1, "#071523"); c.fillStyle = bg; c.fillRect(0, 0, BW, BH);
        // Perspective grid and drifting energy points.
        c.strokeStyle = "rgba(92,165,205,.065)"; c.lineWidth = 1;
        for (let x = 0; x <= BW; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, BH); c.stroke(); }
        for (let y = 0; y <= BH; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(BW, y); c.stroke(); }
        const scanY = (now / 24) % BH; const scan = c.createLinearGradient(0, scanY - 18, 0, scanY + 18); scan.addColorStop(0, "rgba(79,220,221,0)"); scan.addColorStop(.5, "rgba(79,220,221,.055)"); scan.addColorStop(1, "rgba(79,220,221,0)"); c.fillStyle = scan; c.fillRect(0, scanY - 18, BW, 36);
        // Bricks: gradient face, rim light and durability pips.
        bricks.forEach(b => {
          if (!b.alive) return;
          c.save(); c.shadowBlur = b.hit > 0 ? 24 : 13; c.shadowColor = b.hit > 0 ? "#fff4b0" : b.color;
          const g = c.createLinearGradient(b.x, b.y, b.x, b.y + b.h); g.addColorStop(0, b.hit > 0 ? "#fff7cd" : "rgba(255,255,255,.36)"); g.addColorStop(.22, b.color); g.addColorStop(1, "#14304a");
          c.fillStyle = g; roundedRect(c, b.x, b.y, b.w, b.h, 6); c.fill(); c.shadowBlur = 0;
          c.strokeStyle = "rgba(226,248,255,.32)"; c.lineWidth = 1; roundedRect(c, b.x + .5, b.y + .5, b.w - 1, b.h - 1, 6); c.stroke();
          if (b.maxHp > 1) { c.fillStyle = "rgba(255,255,255,.86)"; for (let k = 0; k < b.hp; k++) { c.beginPath(); c.arc(b.x + b.w / 2 + (k - .5) * 8, b.y + b.h / 2, 2, 0, Math.PI * 2); c.fill(); } }
          c.restore();
        });
        // Falling power capsules.
        powerDrops.forEach(drop => {
          const info = powerKinds[drop.kind]; const pulse = 1 + Math.sin(drop.phase) * .09;
          c.save(); c.translate(drop.x, drop.y); c.scale(pulse, pulse); c.shadowColor = info.color; c.shadowBlur = 18; c.fillStyle = "rgba(9,28,47,.95)";
          c.beginPath(); c.arc(0, 0, drop.size, 0, Math.PI * 2); c.fill(); c.strokeStyle = info.color; c.lineWidth = 2; c.stroke(); c.shadowBlur = 0;
          c.fillStyle = info.color; c.font = "900 14px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(info.icon, 0, 1); c.restore();
        });
        // Paddle with energy glow and a bright top edge.
        c.save(); c.shadowBlur = 25; c.shadowColor = "#53e6df";
        const pg = c.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y); pg.addColorStop(0, "#387df7"); pg.addColorStop(.5, "#70ffe0"); pg.addColorStop(1, "#387df7");
        c.fillStyle = pg; roundedRect(c, paddle.x, paddle.y, paddle.w, paddle.h, 8); c.fill(); c.shadowBlur = 0;
        c.fillStyle = "rgba(255,255,255,.55)"; roundedRect(c, paddle.x + 12, paddle.y + 2, paddle.w - 24, 2, 2); c.fill(); c.restore();
        // Each ball gets a distinct radiant trail.
        balls.forEach(b => {
          b.trail.forEach((t, i) => { const alpha = (1 - i / Math.max(1, b.trail.length)) * .28; c.globalAlpha = alpha; c.fillStyle = "#a9fff1"; c.shadowColor = "#66efdb"; c.shadowBlur = 12; c.beginPath(); c.arc(t.x, t.y, b.r * (1 - i / (b.trail.length + 2)), 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1; c.shadowBlur = 0;
          c.save(); c.shadowBlur = 22; c.shadowColor = "#dcffff"; const rg = c.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r + 4); rg.addColorStop(0, "#fff"); rg.addColorStop(.42, "#c5fff4"); rg.addColorStop(1, "#4ebeff"); c.fillStyle = rg; c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill(); c.restore();
        });
        breakerParticles.forEach(p => { c.save(); c.globalAlpha = Math.max(0, p.life / p.max); c.translate(p.x, p.y); c.rotate(p.spin * (1 - p.life / p.max)); c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 10; c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); c.restore(); });
        // Tiny HUD hints inside the arena.
        c.save(); c.fillStyle = "rgba(4,14,25,.58)"; roundedRect(c, 13, BH - 34, 135, 22, 8); c.fill(); c.font = "700 10px Vazirmatn, sans-serif"; c.textAlign = "center"; c.fillStyle = "#9bb7cc"; c.fillText(`BRICKS ${remainingBricks()}`, 80, BH - 19); c.restore();
        if (breakerFlash > 0) { c.fillStyle = `rgba(110,245,229,${breakerFlash * .07})`; c.fillRect(0, 0, BW, BH); }
        c.restore();
      }


            // Arcade keyboard controls (scoped to selected game)
      document.addEventListener("keydown", event => {
        if (state.activeTab === "snake") {
          const keys = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
          if (keys[event.code]) { event.preventDefault(); setSnakeDirection(keys[event.code]); }
          if (event.code === "Space") { event.preventDefault(); snakeMode === "running" ? pauseSnake() : startSnake(); }
        }
        if (state.activeTab === "breaker") {
          if (event.code === "ArrowLeft" || event.code === "KeyA") { breakerKeys.left = true; event.preventDefault(); }
          if (event.code === "ArrowRight" || event.code === "KeyD") { breakerKeys.right = true; event.preventDefault(); }
          if (event.code === "Space") { event.preventDefault(); breakerMode === "running" ? pauseBreaker() : startBreaker(); }
        }
      });
      document.addEventListener("keyup", event => {
        if (event.code === "ArrowLeft" || event.code === "KeyA") breakerKeys.left = false;
        if (event.code === "ArrowRight" || event.code === "KeyD") breakerKeys.right = false;
      });
      window.addEventListener("blur", () => { if (snakeMode === "running") pauseSnake(); if (breakerMode === "running") pauseBreaker(); });

      // Central event delegation for controls.
      document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const { action, value } = button.dataset;
        switch (action) {
          case "tab":
            setTab(value);
            if (value !== "snake" && snakeMode === "running") pauseSnake();
            if (value !== "breaker" && breakerMode === "running") pauseBreaker();
            if (value === "snake") drawSnake();
            if (value === "breaker") drawBreaker();
            break;
          case "ttt-mode": setTttMode(value); break;
          case "ttt-new": newTttRound(); break;
          case "ttt-reset": resetTttScores(); break;
          case "rps-move": playRps(value); break;
          case "rps-reset": resetRpsScores(); break;
          case "snake-start": startSnake(); break;
          case "snake-pause": pauseSnake(); break;
          case "snake-restart": resetSnake(); startSnake(); break;
          case "snake-dir": setSnakeDirection(value); break;
          case "breaker-start": startBreaker(); break;
          case "breaker-pause": pauseBreaker(); break;
          case "breaker-restart": resetBreaker(); startBreaker(); break;
        }
      });

      $("#ttt-difficulty").addEventListener("change", (event) => {
        state.ttt.difficulty = event.target.value;
        showToast("درجه سختی دوز تغییر کرد.");
      });
      $("#rps-difficulty").addEventListener("change", (event) => {
        state.rps.difficulty = event.target.value;
        state.rps.history = [];
        showToast("سطح هوش مصنوعی تغییر کرد؛ حافظه قبلی پاک شد.");
      });
      $("#snake-difficulty").addEventListener("change", () => {
        updateSnakeStats();
        showToast("سرعت مار تغییر کرد؛ بازی با تنظیم جدید ادامه می‌یابد.");
      });

      renderTtt();
      renderRpsScores();
      resetSnake();
      resetBreaker();
    })();