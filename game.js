(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const VIEW_W = 800;
  const VIEW_H = 380;
  const WORLD_W = 2200;
  const GRAVITY = 0.54;
  const MOVE_SPEED = 4.5;
  const JUMP_VEL = -11.8;
  const TOTAL_TIME = 90; // 1:30 минуты

  // UI elements
  const timerEl = document.getElementById("game-timer");
  const rescuedEl = document.getElementById("game-rescued");
  const rewardEl = document.getElementById("game-reward");
  const rescueBtn = document.getElementById("btn-rescue");
  const startOverlay = document.getElementById("game-start-overlay");
  const endOverlay = document.getElementById("game-end-overlay");
  const startBtn = document.getElementById("btn-game-start");
  const replayBtn = document.getElementById("btn-game-replay");
  const toInviteBtn = document.getElementById("btn-to-invite");
  const endBadgeEl = document.getElementById("game-end-badge");
  const endRewardEl = document.getElementById("game-end-reward");
  const endStatsEl = document.getElementById("game-end-stats");

  const ctrlLeft = document.getElementById("ctrl-left");
  const ctrlRight = document.getElementById("ctrl-right");
  const ctrlJump = document.getElementById("ctrl-jump");
  const bgmAudio = document.getElementById("game-bgm");
  const bgmToggleBtn = document.getElementById("btn-bgm-toggle");

  // Load sprites
  const catImg = new Image();
  catImg.src = "images/cat-sprite.png?v=1";
  const crocImg = new Image();
  crocImg.src = "images/croco-sprite.png?v=1";

  // Level geometry: ground + Mario-style floating platforms
  const PLATFORMS = [
    // Ground segments (top y = 330)
    { x: 0, y: 330, w: 620, h: 50, type: "ground" },
    { x: 700, y: 330, w: 540, h: 50, type: "ground" },
    { x: 1320, y: 330, w: 880, h: 50, type: "ground" },

    // Section 1: Stepping stones & Crocodile #1 platform
    { x: 260, y: 255, w: 120, h: 24, type: "brick" },
    { x: 430, y: 205, w: 130, h: 24, type: "brick" },
    { x: 600, y: 240, w: 185, h: 26, type: "grass" }, // Croc #1 here

    // Section 2: Mid jump & high tower for Crocodile #2
    { x: 860, y: 255, w: 125, h: 24, type: "brick" },
    { x: 1030, y: 200, w: 135, h: 24, type: "brick" },
    { x: 1215, y: 145, w: 195, h: 26, type: "grass" }, // Croc #2 here

    // Section 3: Final run & Crocodile #3
    { x: 1510, y: 255, w: 130, h: 24, type: "brick" },
    { x: 1690, y: 210, w: 130, h: 24, type: "brick" },
    { x: 1885, y: 270, w: 225, h: 26, type: "grass" } // Croc #3 here
  ];

  const CLOUDS = [
    { x: 120, y: 58, s: 1.0 },
    { x: 420, y: 42, s: 0.85 },
    { x: 760, y: 68, s: 1.1 },
    { x: 1120, y: 48, s: 0.9 },
    { x: 1480, y: 62, s: 1.05 },
    { x: 1860, y: 45, s: 0.95 }
  ];

  const INITIAL_HEARTS = [
    { x: 320, y: 215, collected: false },
    { x: 495, y: 165, collected: false },
    { x: 920, y: 215, collected: false },
    { x: 1095, y: 160, collected: false },
    { x: 1575, y: 215, collected: false },
    { x: 1755, y: 170, collected: false }
  ];

  const INITIAL_CROCS = [
    { id: 1, x: 645, y: 240 - 38, w: 108, h: 38, rescued: false },
    { id: 2, x: 1265, y: 145 - 38, w: 108, h: 38, rescued: false },
    { id: 3, x: 1945, y: 270 - 38, w: 108, h: 38, rescued: false }
  ];

  let state = "idle"; // idle | playing | ended
  let timeLeft = TOTAL_TIME;
  let timerInterval = null;
  let rafId = null;
  let lastFrameTime = 0;
  let camX = 0;
  let animTick = 0;

  let player = {
    x: 60,
    y: 260,
    w: 52,
    h: 52,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    safeX: 60,
    safeY: 260
  };

  let crocs = [];
  let hearts = [];
  let popups = [];

  const keys = {
    left: false,
    right: false,
    jump: false
  };

  function getReward(rescuedCount) {
    if (rescuedCount >= 3) return 20;
    if (rescuedCount === 2) return 15;
    if (rescuedCount === 1) return 5;
    return 0;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateHud() {
    const savedCount = crocs.filter((c) => c.rescued).length;
    const reward = getReward(savedCount);
    timerEl.textContent = formatTime(timeLeft);
    rescuedEl.textContent = `${savedCount} / 3`;
    rewardEl.textContent = `${reward} крококисов`;
  }

  function getNearbyCroc() {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    let closest = null;
    let bestDist = 96;
    for (const c of crocs) {
      if (c.rescued) continue;
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist < bestDist) {
        bestDist = dist;
        closest = c;
      }
    }
    return closest;
  }

  function updateRescueButton(nearbyCroc) {
    if (state !== "playing") {
      rescueBtn.disabled = true;
      rescueBtn.classList.remove("is-ready");
      rescueBtn.textContent = "Спасти! 💚";
      return;
    }
    if (nearbyCroc) {
      rescueBtn.disabled = false;
      rescueBtn.classList.add("is-ready");
      rescueBtn.textContent = "Спасти крокодила! 💚";
    } else {
      rescueBtn.disabled = true;
      rescueBtn.classList.remove("is-ready");
      rescueBtn.textContent = "Подойди ближе 💚";
    }
  }

  function resetGameData() {
    timeLeft = TOTAL_TIME;
    camX = 0;
    player = {
      x: 60,
      y: 260,
      w: 52,
      h: 52,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      safeX: 60,
      safeY: 260
    };
    crocs = INITIAL_CROCS.map((c) => ({ ...c }));
    hearts = INITIAL_HEARTS.map((h) => ({ ...h }));
    popups = [];
    keys.left = false;
    keys.right = false;
    keys.jump = false;
    updateHud();
    updateRescueButton(null);
  }

  function startBgm() {
    if (!bgmAudio) return;
    bgmAudio.volume = 0.45;
    bgmAudio.currentTime = 0;
    const playPromise = bgmAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function stopBgm() {
    if (!bgmAudio) return;
    bgmAudio.pause();
  }

  function startGame() {
    resetGameData();
    state = "playing";
    startOverlay.hidden = true;
    endOverlay.hidden = true;
    startBgm();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (state !== "playing") return;
      timeLeft = Math.max(0, timeLeft - 1);
      updateHud();
      if (timeLeft <= 0) {
        finishGame(false);
      }
    }, 1000);

    lastFrameTime = performance.now();
    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function finishGame(allSaved) {
    if (state === "ended") return;
    state = "ended";
    stopBgm();
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateRescueButton(null);

    const savedCount = crocs.filter((c) => c.rescued).length;
    const reward = getReward(savedCount);

    endBadgeEl.textContent = allSaved ? "🐊💚🎉" : "⏰💚";
    endRewardEl.textContent = `Награда: +${reward} крококисов`;
    endStatsEl.textContent = `Спасено крокодилов: ${savedCount} из 3`;

    endOverlay.hidden = false;

    if (typeof window.launchConfetti === "function") {
      window.launchConfetti(savedCount > 0 ? 120 : 50);
    }
  }

  function rescueNearbyCroc() {
    if (state !== "playing") return;
    const target = getNearbyCroc();
    if (!target) return;

    target.rescued = true;
    updateHud();
    updateRescueButton(null);

    popups.push({
      x: target.x + target.w / 2,
      y: target.y - 12,
      text: "Спасён! 💚",
      life: 55
    });

    const rect = canvas.getBoundingClientRect();
    const screenX = rect.left + ((target.x + target.w / 2 - camX) / VIEW_W) * rect.width;
    const screenY = rect.top + (target.y / VIEW_H) * rect.height;

    if (typeof window.spawnHeartBurst === "function") {
      window.spawnHeartBurst(screenX, screenY, 10);
    }
    if (typeof window.launchConfetti === "function") {
      window.launchConfetti(45);
    }

    const savedCount = crocs.filter((c) => c.rescued).length;
    if (savedCount >= 3) {
      setTimeout(() => {
        finishGame(true);
      }, 750);
    }
  }

  function stepPhysics(dt) {
    animTick += dt;

    // Horizontal movement
    if (keys.left && !keys.right) {
      player.vx = -MOVE_SPEED;
      player.facing = -1;
    } else if (keys.right && !keys.left) {
      player.vx = MOVE_SPEED;
      player.facing = 1;
    } else {
      player.vx *= Math.pow(0.7, dt);
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    // Jump
    if (keys.jump && player.onGround) {
      player.vy = JUMP_VEL;
      player.onGround = false;
    }

    // Gravity
    player.vy = Math.min(player.vy + GRAVITY * dt, 13);

    // Move X & clamp to world
    player.x += player.vx * dt;
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > WORLD_W) player.x = WORLD_W - player.w;

    // Move Y & platform landing
    const prevBottom = player.y + player.h;
    player.y += player.vy * dt;
    player.onGround = false;

    for (const p of PLATFORMS) {
      const overlapX = player.x + player.w - 10 > p.x && player.x + 10 < p.x + p.w;
      if (overlapX && player.vy >= 0 && prevBottom <= p.y + 10 && player.y + player.h >= p.y) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.safeX = Math.max(p.x + 8, Math.min(player.x, p.x + p.w - player.w - 8));
        player.safeY = p.y - player.h - 4;
      }
    }

    // Pit respawn (forgiving)
    if (player.y > VIEW_H + 50) {
      player.x = player.safeX;
      player.y = player.safeY;
      player.vx = 0;
      player.vy = 0;
      popups.push({
        x: player.x + player.w / 2,
        y: player.y - 10,
        text: "Ой! 🐾",
        life: 40
      });
    }

    // Collect decorative hearts
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    for (const h of hearts) {
      if (!h.collected && Math.hypot(px - h.x, py - h.y) < 34) {
        h.collected = true;
        popups.push({ x: h.x, y: h.y - 8, text: "💖", life: 36 });
      }
    }

    // Update popups
    popups = popups.filter((p) => {
      p.y -= 0.75 * dt;
      p.life -= dt;
      return p.life > 0;
    });

    // Camera follow
    const targetCam = Math.max(0, Math.min(WORLD_W - VIEW_W, player.x - VIEW_W * 0.36));
    camX += (targetCam - camX) * Math.min(1, 0.14 * dt);

    updateRescueButton(getNearbyCroc());
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.closePath();
  }

  function render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, "#ffe4ef");
    sky.addColorStop(0.55, "#fff7ef");
    sky.addColorStop(1, "#e8f6ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Parallax clouds
    ctx.save();
    for (const cl of CLOUDS) {
      const cx = cl.x - camX * 0.45;
      if (cx < -140 || cx > VIEW_W + 140) continue;
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.beginPath();
      ctx.arc(cx, cl.y, 20 * cl.s, 0, Math.PI * 2);
      ctx.arc(cx + 20 * cl.s, cl.y - 8 * cl.s, 24 * cl.s, 0, Math.PI * 2);
      ctx.arc(cx + 44 * cl.s, cl.y, 18 * cl.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-camX, 0);

    // Platforms
    for (const p of PLATFORMS) {
      if (p.x + p.w < camX - 20 || p.x > camX + VIEW_W + 20) continue;

      if (p.type === "ground" || p.type === "grass") {
        // Warm earth body
        ctx.fillStyle = p.type === "ground" ? "#f4be97" : "#f7c8a6";
        drawRoundedRect(p.x, p.y + 8, p.w, p.h - 8, 8);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#2b2327";
        ctx.stroke();

        // Pastel grass top
        ctx.fillStyle = "#8fd974";
        drawRoundedRect(p.x, p.y, p.w, 14, 7);
        ctx.fill();
        ctx.stroke();
      } else {
        // Mario-style pastel brick platform
        ctx.fillStyle = "#ff9bb9";
        drawRoundedRect(p.x, p.y, p.w, p.h, 7);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#2b2327";
        ctx.stroke();

        // Brick seams
        ctx.beginPath();
        for (let bx = p.x + 28; bx < p.x + p.w - 10; bx += 28) {
          ctx.moveTo(bx, p.y + 3);
          ctx.lineTo(bx, p.y + p.h - 3);
        }
        ctx.strokeStyle = "rgba(43, 35, 39, 0.25)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // Collectible hearts
    ctx.font = "22px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < hearts.length; i++) {
      const h = hearts[i];
      if (h.collected) continue;
      const bob = Math.sin(animTick * 0.08 + i) * 4;
      ctx.fillText("💖", h.x, h.y + bob);
    }

    // Crocodiles
    const nearby = state === "playing" ? getNearbyCroc() : null;
    for (const c of crocs) {
      if (c.x + c.w < camX - 40 || c.x > camX + VIEW_W + 40) continue;

      const isNear = nearby && nearby.id === c.id;
      if (!c.rescued) {
        // Soft aura
        ctx.save();
        ctx.fillStyle = isNear ? "rgba(143, 217, 116, 0.42)" : "rgba(250, 93, 146, 0.2)";
        ctx.beginPath();
        ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w * 0.62, c.h * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (crocImg.complete && crocImg.naturalWidth > 0) {
        ctx.save();
        if (c.rescued) ctx.globalAlpha = 0.75;
        ctx.drawImage(crocImg, c.x, c.y, c.w, c.h);
        ctx.restore();
      }

      // Speech / status tag above crocodile
      const bob = Math.sin(animTick * 0.1 + c.id) * 3;
      ctx.save();
      ctx.font = "800 13px Nunito, sans-serif";
      ctx.textAlign = "center";
      const label = c.rescued ? "Спасён! 💚" : isNear ? "Жми «Спасти»! 💚" : "Спаси меня! 🆘";
      const tw = ctx.measureText(label).width + 16;
      const lx = c.x + c.w / 2 - tw / 2;
      const ly = c.y - 30 + bob;

      ctx.fillStyle = c.rescued ? "#e9fce1" : isNear ? "#fff0f6" : "#ffffff";
      drawRoundedRect(lx, ly, tw, 22, 11);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#2b2327";
      ctx.stroke();

      ctx.fillStyle = "#21171b";
      ctx.fillText(label, c.x + c.w / 2, ly + 11);
      ctx.restore();
    }

    // Player (Hand-drawn Cat)
    ctx.save();
    const walkBounce = player.onGround && Math.abs(player.vx) > 0.6 ? Math.abs(Math.sin(animTick * 0.3)) * 4 : 0;
    const drawX = player.x + player.w / 2;
    const drawY = player.y + player.h / 2 - walkBounce;
    ctx.translate(drawX, drawY);
    ctx.scale(player.facing, 1);

    if (catImg.complete && catImg.naturalWidth > 0) {
      ctx.drawImage(catImg, -player.w / 2, -player.h / 2, player.w, player.h);
    } else {
      ctx.fillStyle = "#2b2327";
      ctx.fillRect(-20, -20, 40, 40);
    }
    ctx.restore();

    // Floating popups
    for (const p of popups) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.font = "900 16px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#d93b70";
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min((now - lastFrameTime) / 16.667, 2.2);
    lastFrameTime = now;

    if (state === "playing") {
      stepPhysics(dt);
    }
    render();

    if (state === "playing") {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (state !== "playing") return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      keys.left = true;
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      keys.right = true;
    } else if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
      e.preventDefault();
      keys.jump = true;
    } else if (e.code === "KeyE" || e.code === "Enter") {
      rescueNearbyCroc();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      keys.left = false;
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      keys.right = false;
    } else if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
      keys.jump = false;
    }
  });

  // Touch / Pointer Arcade Controls
  function bindHoldButton(btn, keyName) {
    if (!btn) return;
    const press = (e) => {
      e.preventDefault();
      keys[keyName] = true;
      btn.classList.add("is-pressed");
    };
    const release = () => {
      keys[keyName] = false;
      btn.classList.remove("is-pressed");
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", release);
  }

  bindHoldButton(ctrlLeft, "left");
  bindHoldButton(ctrlRight, "right");
  bindHoldButton(ctrlJump, "jump");

  if (rescueBtn) {
    rescueBtn.addEventListener("click", rescueNearbyCroc);
  }
  if (bgmToggleBtn && bgmAudio) {
    bgmToggleBtn.addEventListener("click", () => {
      bgmAudio.muted = !bgmAudio.muted;
      bgmToggleBtn.textContent = bgmAudio.muted ? "🔇" : "🔊";
    });
  }
  if (startBtn) {
    startBtn.addEventListener("click", startGame);
  }
  if (replayBtn) {
    replayBtn.addEventListener("click", startGame);
  }
  if (toInviteBtn) {
    toInviteBtn.addEventListener("click", () => {
      document.body.classList.remove("is-game-locked");
      const hero = document.getElementById("invitation");
      if (hero) {
        requestAnimationFrame(() => {
          hero.scrollIntoView({ behavior: "smooth", block: "start" });
          hero.classList.remove("section-pulse");
          void hero.offsetWidth;
          hero.classList.add("section-pulse");
        });
      }
      if (typeof window.launchConfetti === "function") {
        window.launchConfetti(90);
      }
    });
  }

  // Initial render
  resetGameData();
  Promise.all([
    new Promise((r) => { if (catImg.complete) r(); else { catImg.onload = r; catImg.onerror = r; } }),
    new Promise((r) => { if (crocImg.complete) r(); else { crocImg.onload = r; crocImg.onerror = r; } })
  ]).then(() => {
    render();
  });
})();
