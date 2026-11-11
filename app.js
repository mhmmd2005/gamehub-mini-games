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
      // Arcade utilities: sound, numbers and overlays
      // ---------------------------------------------
      const faNumber = (value) => new Intl.NumberFormat("fa-IR").format(value);
      const arcadePrefs = { sound: true };
      let audioContext = null;
      function playTone(kind, toggleId) {
        const toggle = toggleId ? document.getElementById(toggleId) : null;
        if (toggle && !toggle.checked) return;
        if (toggleId === "sound-toggle" && toggle && !toggle.checked) return;
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          audioContext ||= new AudioCtx();
          if (audioContext.state === "suspended") audioContext.resume();
          const now = audioContext.currentTime;
          const config = {
            eat: [620, 920, .09, "sine"], crash: [170, 75, .22, "sawtooth"],
            brick: [430, 720, .07, "triangle"], paddle: [260, 390, .06, "sine"],
            life: [240, 110, .18, "triangle"], win: [520, 1040, .23, "sine"]
          }[kind] || [440, 660, .08, "sine"];
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = config[3];
          osc.frequency.setValueAtTime(config[0], now);
          osc.frequency.exponentialRampToValueAtTime(Math.max(50, config[1]), now + config[2]);
          gain.gain.setValueAtTime(.0001, now);
          gain.gain.exponentialRampToValueAtTime(.055, now + .012);
          gain.gain.exponentialRampToValueAtTime(.0001, now + config[2]);
          osc.connect(gain); gain.connect(audioContext.destination);
          osc.start(now); osc.stop(now + config[2] + .02);
        } catch (_) { /* Audio is optional. */ }
      }
      function showArcadeOverlay(id, icon, title, message, buttonText, action) {
        const node = document.getElementById(id);
        node.innerHTML = `<div class="overlay-icon">${icon}</div><h3>${title}</h3><p>${message}</p><button class="btn primary big-btn" data-action="${action}">${buttonText}</button>`;
        node.classList.remove("is-hidden");
      }
      function hideArcadeOverlay(id) { document.getElementById(id).classList.add("is-hidden"); }

      // ---------------------------------------------
      // Snake: fixed-timestep grid game
      // ---------------------------------------------
      const snakeCanvas = document.getElementById("snake-canvas");
      const snakeCtx = snakeCanvas.getContext("2d");
      const SW = snakeCanvas.width, SH = snakeCanvas.height, TILE = 24;
      const S_COLS = SW / TILE, S_ROWS = SH / TILE;
      let snake = [], snakeFood = { x: 18, y: 9 }, snakeDirection = { x: 1, y: 0 };
      let snakeQueuedDirection = { x: 1, y: 0 }, snakeMode = "ready", snakeTimer = null;
      let snakeScore = 0, snakeBest = Number(localStorage.getItem("gamehub-snake-best") || 0);
      let snakeParticles = [], snakeTick = 0;
      const directionMap = {
        up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
      };
      const randCell = () => ({ x: Math.floor(Math.random() * S_COLS), y: Math.floor(Math.random() * S_ROWS) });
      function placeSnakeFood() {
        let point, attempts = 0;
        do { point = randCell(); attempts++; }
        while (snake.some(part => part.x === point.x && part.y === point.y) && attempts < 1000);
        snakeFood = point;
      }
      function resetSnake() {
        clearInterval(snakeTimer); snakeTimer = null;
        snake = [{ x: 11, y: 10 }, { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        snakeDirection = { x: 1, y: 0 }; snakeQueuedDirection = { x: 1, y: 0 };
        snakeScore = 0; snakeMode = "ready"; snakeParticles = [];
        placeSnakeFood(); updateSnakeStats(); drawSnake();
        showArcadeOverlay("snake-overlay", "🐍", "آماده‌ای رکورد بزنی؟", "با خوردن انرژی‌ها بزرگ‌تر شو؛ مراقب مسیرت باش!", "شروع بازی", "snake-start");
      }
      function updateSnakeStats() {
        document.getElementById("snake-score").textContent = faNumber(snakeScore);
        document.getElementById("snake-best").textContent = faNumber(snakeBest);
        document.getElementById("snake-speed").textContent = (1 + Math.floor(snakeScore / 3) * .12).toLocaleString("fa-IR", { maximumFractionDigits: 2 }) + "×";
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
        clearInterval(snakeTimer);
        snakeTimer = setInterval(snakeStep, Math.max(62, 145 - Math.floor(snakeScore / 3) * 7));
        drawSnake();
      }
      function pauseSnake() {
        if (snakeMode !== "running") return;
        clearInterval(snakeTimer); snakeTimer = null; snakeMode = "paused";
        showArcadeOverlay("snake-overlay", "Ⅱ", "بازی متوقف شد", "هر زمان آماده بودی ادامه بده.", "ادامه بازی", "snake-start");
      }
      function snakeStep() {
        if (snakeMode !== "running") return;
        snakeDirection = snakeQueuedDirection;
        const head = { x: snake[0].x + snakeDirection.x, y: snake[0].y + snakeDirection.y };
        const eating = head.x === snakeFood.x && head.y === snakeFood.y;
        const bodyToCheck = eating ? snake : snake.slice(0, -1);
        if (head.x < 0 || head.x >= S_COLS || head.y < 0 || head.y >= S_ROWS || bodyToCheck.some(p => p.x === head.x && p.y === head.y)) {
          endSnake(); return;
        }
        snake.unshift(head);
        if (eating) {
          snakeScore += 1; playTone("eat", "sound-toggle");
          for (let i = 0; i < 12; i++) snakeParticles.push({ x: (snakeFood.x + .5) * TILE, y: (snakeFood.y + .5) * TILE, vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4, life: 22, color: i % 2 ? "#55f0c5" : "#ffc96b" });
          placeSnakeFood(); updateSnakeStats();
          clearInterval(snakeTimer); snakeTimer = setInterval(snakeStep, Math.max(62, 145 - Math.floor(snakeScore / 3) * 7));
        } else snake.pop();
        snakeTick++; drawSnake();
      }
      function endSnake() {
        clearInterval(snakeTimer); snakeTimer = null; snakeMode = "over";
        playTone("crash", "sound-toggle");
        const isNewRecord = snakeScore > snakeBest;
        if (isNewRecord) { snakeBest = snakeScore; localStorage.setItem("gamehub-snake-best", String(snakeBest)); }
        updateSnakeStats(); drawSnake();
        showArcadeOverlay("snake-overlay", "💥", "پایان بازی!", `امتیازت ${faNumber(snakeScore)} شد. ${isNewRecord ? "رکورد جدید ثبت شد!" : "دوباره تلاش کن و رکوردت را بشکن."}`, "دوباره بازی کن", "snake-restart");
      }
      function drawSnake() {
        const c = snakeCtx; c.clearRect(0, 0, SW, SH);
        const bg = c.createLinearGradient(0, 0, SW, SH); bg.addColorStop(0, "#071522"); bg.addColorStop(1, "#0a1c2b"); c.fillStyle = bg; c.fillRect(0, 0, SW, SH);
        c.strokeStyle = "rgba(106,160,195,.075)"; c.lineWidth = 1;
        for (let x = 0; x <= SW; x += TILE) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, SH); c.stroke(); }
        for (let y = 0; y <= SH; y += TILE) { c.beginPath(); c.moveTo(0, y); c.lineTo(SW, y); c.stroke(); }
        const pulse = .75 + Math.sin(Date.now() / 180) * .15;
        c.save(); c.shadowBlur = 24 * pulse; c.shadowColor = "#ffbd5b";
        const fx = (snakeFood.x + .5) * TILE, fy = (snakeFood.y + .5) * TILE;
        const foodGrad = c.createRadialGradient(fx - 3, fy - 4, 1, fx, fy, 11); foodGrad.addColorStop(0, "#fff1be"); foodGrad.addColorStop(.45, "#ffc35c"); foodGrad.addColorStop(1, "#ec6d54");
        c.fillStyle = foodGrad; c.beginPath(); c.arc(fx, fy, 7.5 + pulse, 0, Math.PI * 2); c.fill(); c.restore();
        snake.forEach((part, index) => {
          const inset = index === 0 ? 2 : 3.5; const x = part.x * TILE + inset, y = part.y * TILE + inset, size = TILE - inset * 2;
          const ratio = 1 - index / Math.max(8, snake.length + 3);
          c.save(); c.shadowBlur = index === 0 ? 17 : 7; c.shadowColor = "#36e5bc";
          const g = c.createLinearGradient(x, y, x + size, y + size); g.addColorStop(0, `hsl(${164 + ratio * 12}, 91%, ${53 + ratio * 8}%)`); g.addColorStop(1, `hsl(${183 + ratio * 8}, 76%, ${34 + ratio * 8}%)`);
          c.fillStyle = g; roundedRect(c, x, y, size, size, index === 0 ? 7 : 5); c.fill(); c.restore();
          if (index === 0) {
            const eyeA = snakeDirection.x !== 0 ? { x: part.x * TILE + (snakeDirection.x > 0 ? 17 : 7), y: part.y * TILE + 7 } : { x: part.x * TILE + 7, y: part.y * TILE + (snakeDirection.y > 0 ? 17 : 7) };
            const eyeB = snakeDirection.x !== 0 ? { x: eyeA.x, y: eyeA.y + 9 } : { x: eyeA.x + 9, y: eyeA.y };
            c.fillStyle = "#06202b"; c.beginPath(); c.arc(eyeA.x, eyeA.y, 2, 0, Math.PI * 2); c.arc(eyeB.x, eyeB.y, 2, 0, Math.PI * 2); c.fill();
          }
        });
        snakeParticles = snakeParticles.filter(p => p.life > 0);
        snakeParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; c.globalAlpha = p.life / 22; c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, 2.3, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1;
      }
      function roundedRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

      // ---------------------------------------------
      // Brick Breaker: collision, levels and particles
      // ---------------------------------------------
      const breakerCanvas = document.getElementById("breaker-canvas");
      const breakerCtx = breakerCanvas.getContext("2d");
      const BW = breakerCanvas.width, BH = breakerCanvas.height;
      let breakerMode = "ready", breakerRaf = null, breakerLastTime = 0;
      let breakerScore = 0, breakerBest = Number(localStorage.getItem("gamehub-breaker-best") || 0), breakerLives = 3, breakerLevel = 1;
      let paddle = { x: BW / 2 - 62, y: BH - 35, w: 124, h: 12, targetX: BW / 2 };
      let ball = { x: BW / 2, y: BH - 50, vx: 3.4, vy: -4.7, r: 7, trail: [] };
      let bricks = [], breakerParticles = [], breakerKeys = { left: false, right: false };
      const brickPalette = ["#48d6d0", "#54b6ff", "#8b92ff", "#c27dff", "#ff8aab"];
      function makeBreakerLevel() {
        bricks = []; const rows = Math.min(5 + Math.floor((breakerLevel - 1) / 2), 7), cols = 10, gap = 8, margin = 26, bw = (BW - margin * 2 - gap * (cols - 1)) / cols, bh = 21;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          if (breakerLevel > 2 && (row + col + breakerLevel) % 11 === 0) continue;
          bricks.push({ x: margin + col * (bw + gap), y: 56 + row * (bh + 9), w: bw, h: bh, hp: breakerLevel >= 4 && row < 2 ? 2 : 1, maxHp: breakerLevel >= 4 && row < 2 ? 2 : 1, color: brickPalette[row % brickPalette.length], alive: true });
        }
      }
      function placeBall() { ball = { x: paddle.x + paddle.w / 2, y: paddle.y - 9, vx: (Math.random() < .5 ? -1 : 1) * (3.2 + breakerLevel * .28), vy: -(4.5 + breakerLevel * .35), r: 7, trail: [] }; }
      function updateBreakerStats() {
        document.getElementById("breaker-score").textContent = faNumber(breakerScore);
        document.getElementById("breaker-best").textContent = faNumber(breakerBest);
        document.getElementById("breaker-level").textContent = faNumber(breakerLevel);
        document.getElementById("breaker-lives").textContent = faNumber(breakerLives);
      }
      function resetBreaker() {
        stopBreakerFrame(); breakerMode = "ready"; breakerScore = 0; breakerLives = 3; breakerLevel = 1; breakerParticles = [];
        paddle.x = BW / 2 - paddle.w / 2; paddle.targetX = BW / 2; makeBreakerLevel(); placeBall(); updateBreakerStats(); drawBreaker();
        showArcadeOverlay("breaker-overlay", "🧱", "آماده شکستن رکوردی؟", "با توپ به آجرها ضربه بزن؛ نگذار توپ از کنترل خارج شود.", "شروع بازی", "breaker-start");
      }
      function startBreaker() {
        if (breakerMode === "over") resetBreaker();
        if (breakerMode === "running") return;
        breakerMode = "running"; hideArcadeOverlay("breaker-overlay"); breakerLastTime = performance.now();
        if (!ball.launched) { ball.launched = true; ball.x = paddle.x + paddle.w / 2; ball.y = paddle.y - ball.r - 2; }
        breakerRaf = requestAnimationFrame(breakerLoop);
      }
      function pauseBreaker() {
        if (breakerMode !== "running") return;
        breakerMode = "paused"; stopBreakerFrame();
        showArcadeOverlay("breaker-overlay", "Ⅱ", "بازی متوقف شد", "توپ همین‌جا منتظر می‌ماند؛ هر وقت خواستی ادامه بده.", "ادامه بازی", "breaker-start");
      }
      function stopBreakerFrame() { if (breakerRaf) cancelAnimationFrame(breakerRaf); breakerRaf = null; }
      function movePaddleTo(clientX) {
        const rect = breakerCanvas.getBoundingClientRect(); const scale = BW / rect.width;
        const x = (clientX - rect.left) * scale; paddle.targetX = Math.max(paddle.w / 2, Math.min(BW - paddle.w / 2, x));
        if (breakerMode !== "running" && !ball.launched) { paddle.x = paddle.targetX - paddle.w / 2; ball.x = paddle.x + paddle.w / 2; drawBreaker(); }
      }
      breakerCanvas.addEventListener("pointermove", e => movePaddleTo(e.clientX));
      breakerCanvas.addEventListener("pointerdown", e => { movePaddleTo(e.clientX); if (breakerMode === "ready" || breakerMode === "paused") startBreaker(); });
      function breakerLoop(now) {
        if (breakerMode !== "running") return;
        const dt = Math.min(2, (now - breakerLastTime) / 16.67 || 1); breakerLastTime = now;
        updateBreaker(dt); drawBreaker();
        if (breakerMode === "running") breakerRaf = requestAnimationFrame(breakerLoop);
      }
      function emitBrickParticles(brick) {
        for (let i = 0; i < 10; i++) breakerParticles.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, life: 26 + Math.random() * 14, color: brick.color, size: 2 + Math.random() * 2 });
      }
      function circleRectCollision(cx, cy, radius, rect) {
        const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w)); const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
        const dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy < radius * radius;
      }
      function updateBreaker(dt) {
        const target = paddle.targetX - paddle.w / 2;
        paddle.x += (target - paddle.x) * Math.min(1, .24 * dt);
        if (breakerKeys.left) paddle.x -= 7 * dt; if (breakerKeys.right) paddle.x += 7 * dt;
        paddle.x = Math.max(0, Math.min(BW - paddle.w, paddle.x));
        if (!ball.launched) { ball.x = paddle.x + paddle.w / 2; ball.y = paddle.y - ball.r - 2; return; }
        ball.trail.unshift({ x: ball.x, y: ball.y }); if (ball.trail.length > 8) ball.trail.pop();
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); playTone("paddle", "sound-toggle-breaker"); }
        if (ball.x > BW - ball.r) { ball.x = BW - ball.r; ball.vx = -Math.abs(ball.vx); playTone("paddle", "sound-toggle-breaker"); }
        if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
        if (ball.vy > 0 && circleRectCollision(ball.x, ball.y, ball.r, paddle)) {
          ball.y = paddle.y - ball.r - 1; const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          ball.vx = hit * (5.4 + breakerLevel * .28); ball.vy = -Math.sqrt(Math.max(13, 34 - ball.vx * ball.vx)); playTone("paddle", "sound-toggle-breaker");
        }
        for (const brick of bricks) if (brick.alive && circleRectCollision(ball.x, ball.y, ball.r, brick)) {
          const prevX = ball.x - ball.vx * dt, prevY = ball.y - ball.vy * dt;
          if (prevY + ball.r <= brick.y || prevY - ball.r >= brick.y + brick.h) ball.vy *= -1; else ball.vx *= -1;
          brick.hp--; if (brick.hp <= 0) { brick.alive = false; breakerScore += 10 * breakerLevel; emitBrickParticles(brick); } else { brick.color = "#fff0a6"; emitBrickParticles(brick); }
          playTone("brick", "sound-toggle-breaker"); updateBreakerStats(); break;
        }
        if (ball.y > BH + ball.r) {
          breakerLives--; playTone("life", "sound-toggle-breaker"); updateBreakerStats();
          if (breakerLives <= 0) { finishBreaker(false); return; }
          ball.launched = false; placeBall();
          breakerMode = "ready"; stopBreakerFrame(); drawBreaker();
          showArcadeOverlay("breaker-overlay", "❤️", "یک جان کم شد", `${faNumber(breakerLives)} جان دیگر داری؛ دوباره توپ را پرتاب کن.`, "ادامه بازی", "breaker-start");
          return;
        }
        if (bricks.every(b => !b.alive)) {
          breakerLevel++; playTone("win", "sound-toggle-breaker"); makeBreakerLevel(); ball.launched = false; placeBall(); updateBreakerStats();
          breakerMode = "ready"; stopBreakerFrame(); drawBreaker();
          showArcadeOverlay("breaker-overlay", "✨", `مرحله ${faNumber(breakerLevel - 1)} کامل شد!`, "عالی بود! مرحله بعدی سریع‌تر و چالش‌برانگیزتر است.", "ادامه مرحله بعد", "breaker-start");
        }
        breakerParticles = breakerParticles.filter(p => p.life > 0);
        breakerParticles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += .05 * dt; p.life -= dt; });
      }
      function finishBreaker(won) {
        breakerMode = "over"; stopBreakerFrame();
        if (breakerScore > breakerBest) { breakerBest = breakerScore; localStorage.setItem("gamehub-breaker-best", String(breakerBest)); }
        updateBreakerStats();
        showArcadeOverlay("breaker-overlay", won ? "🏆" : "💥", won ? "تو برنده شدی!" : "پایان بازی", `امتیاز نهایی: ${faNumber(breakerScore)} · مرحله: ${faNumber(breakerLevel)}`, "بازی دوباره", "breaker-restart");
      }
      function drawBreaker() {
        const c = breakerCtx; c.clearRect(0, 0, BW, BH);
        const bg = c.createLinearGradient(0, 0, BW, BH); bg.addColorStop(0, "#071421"); bg.addColorStop(1, "#0b1e31"); c.fillStyle = bg; c.fillRect(0, 0, BW, BH);
        c.strokeStyle = "rgba(105,166,200,.055)"; c.lineWidth = 1;
        for (let x = 0; x < BW; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, BH); c.stroke(); }
        for (let y = 0; y < BH; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(BW, y); c.stroke(); }
        // Bricks with soft neon edges
        bricks.forEach(b => { if (!b.alive) return; c.save(); c.shadowBlur = 13; c.shadowColor = b.color; const g = c.createLinearGradient(b.x, b.y, b.x, b.y + b.h); g.addColorStop(0, b.hp > 1 ? "#fff1b4" : b.color); g.addColorStop(.25, b.color); g.addColorStop(1, "#17334d"); c.fillStyle = g; roundedRect(c, b.x, b.y, b.w, b.h, 5); c.fill(); c.shadowBlur = 0; c.fillStyle = "rgba(255,255,255,.22)"; roundedRect(c, b.x + 5, b.y + 3, b.w - 10, 2, 2); c.fill(); c.restore(); });
        // Paddle
        c.save(); c.shadowBlur = 22; c.shadowColor = "#53d9e8"; const pg = c.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y); pg.addColorStop(0, "#398cff"); pg.addColorStop(.5, "#59f0d1"); pg.addColorStop(1, "#398cff"); c.fillStyle = pg; roundedRect(c, paddle.x, paddle.y, paddle.w, paddle.h, 7); c.fill(); c.restore();
        // Ball trail
        ball.trail.forEach((t, i) => { c.globalAlpha = (1 - i / ball.trail.length) * .22; c.fillStyle = "#a8fff0"; c.beginPath(); c.arc(t.x, t.y, ball.r * (1 - i / (ball.trail.length + 2)), 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1;
        c.save(); c.shadowBlur = 22; c.shadowColor = "#d9ffff"; const rg = c.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r + 3); rg.addColorStop(0, "#fff"); rg.addColorStop(.4, "#bafff0"); rg.addColorStop(1, "#51c6ff"); c.fillStyle = rg; c.beginPath(); c.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); c.fill(); c.restore();
        breakerParticles.forEach(p => { c.globalAlpha = Math.max(0, p.life / 35); c.fillStyle = p.color; c.fillRect(p.x, p.y, p.size, p.size); }); c.globalAlpha = 1;
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

      renderTtt();
      renderRpsScores();
      resetSnake();
      resetBreaker();
    })();