(() => {
  "use strict";

  const navButtons = document.querySelectorAll(".nav-btn");
  const polaroidCards = document.querySelectorAll(".polaroid-card");
  const detailsTrigger = document.getElementById("details-trigger");
  const ctaButtons = document.querySelectorAll(".cta-btn");
  const characterButtons = document.querySelectorAll(".corner-char");

  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalClose = document.getElementById("modal-close");
  const modalBadge = document.getElementById("modal-badge");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalActions = document.getElementById("modal-actions");

  const heartsLayer = document.getElementById("floating-hearts-layer");
  const confettiCanvas = document.getElementById("confetti-canvas");
  const ctx = confettiCanvas.getContext("2d");

  let lastFocusedElement = null;
  let confettiPieces = [];
  let confettiAnimationId = null;

  /* ---------------- Canvas Sizing ---------------- */
  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  /* ---------------- Confetti Engine ---------------- */
  const CONFETTI_COLORS = [
    "#fa5d92",
    "#ff8cb3",
    "#ffd86f",
    "#c49bf0",
    "#89c96c",
    "#ff9f7f",
    "#ee4b5e"
  ];

  function launchConfetti(count = 110) {
    const width = confettiCanvas.width;
    const height = confettiCanvas.height;

    for (let i = 0; i < count; i++) {
      const isHeart = Math.random() < 0.25;
      confettiPieces.push({
        x: width * (0.15 + Math.random() * 0.7),
        y: height * (0.35 + Math.random() * 0.25),
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 14 - 5,
        gravity: 0.28 + Math.random() * 0.12,
        size: isHeart ? 12 + Math.random() * 6 : 7 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.22,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        isHeart,
        alpha: 1
      });
    }

    if (!confettiAnimationId) {
      animateConfetti();
    }
  }

  function drawHeartShape(c, x, y, size, rotation, color, alpha) {
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    const s = size * 0.5;
    c.moveTo(0, s * 0.4);
    c.bezierCurveTo(-s, -s * 0.5, -s * 1.6, s * 0.7, 0, s * 1.6);
    c.bezierCurveTo(s * 1.6, s * 0.7, s, -s * 0.5, 0, s * 0.4);
    c.fill();
    c.restore();
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiPieces = confettiPieces.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;

      if (p.y > confettiCanvas.height + 30) {
        return false;
      }

      if (p.isHeart) {
        drawHeartShape(ctx, p.x, p.y, p.size, p.rotation, p.color, p.alpha);
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "#2b2327";
        ctx.lineWidth = 1.2;
        ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        ctx.strokeRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        ctx.restore();
      }
      return true;
    });

    if (confettiPieces.length > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      confettiAnimationId = null;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  /* ---------------- Floating Heart Burst ---------------- */
  function spawnHeartBurst(originX, originY, amount = 7) {
    const icons = ["❤️", "💖", "💗", "🥰", "✨", "💚"];
    for (let i = 0; i < amount; i++) {
      const span = document.createElement("span");
      span.className = "pop-heart";
      span.textContent = icons[Math.floor(Math.random() * icons.length)];
      const offsetX = (Math.random() - 0.5) * 44;
      const driftX = (Math.random() - 0.5) * 90;
      const rot = (Math.random() - 0.5) * 36;
      span.style.left = `${originX + offsetX}px`;
      span.style.top = `${originY}px`;
      span.style.setProperty("--drift-x", `${driftX}px`);
      span.style.setProperty("--rot", `${rot}deg`);
      span.style.animationDelay = `${i * 0.045}s`;
      heartsLayer.appendChild(span);

      span.addEventListener("animationend", () => {
        span.remove();
      });
    }
  }

  /* ---------------- Floating Crokokis Badge ---------------- */
  function spawnCrokokisBadge(originX, originY, text) {
    const badge = document.createElement("span");
    badge.className = "pop-crokokis";
    badge.textContent = text;
    badge.style.left = `${originX}px`;
    badge.style.top = `${originY}px`;
    heartsLayer.appendChild(badge);

    badge.addEventListener("animationend", () => {
      badge.remove();
    });
  }

  /* ---------------- Modal System ---------------- */
  function openModal({ badge, title, paragraphs, hintText = null, actions = [] }) {
    lastFocusedElement = document.activeElement;
    modalBadge.textContent = badge;
    modalTitle.textContent = title;
    modalBody.innerHTML = "";

    paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      modalBody.appendChild(p);
    });

    if (hintText) {
      const hintBox = document.createElement("div");
      hintBox.className = "hint-reveal";
      hintBox.textContent = hintText;
      modalBody.appendChild(hintBox);
    }

    modalActions.innerHTML = "";
    modalActions.hidden = actions.length === 0;
    actions.forEach((cfg) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = cfg.primary ? "modal-btn-primary" : "modal-btn-secondary";
      btn.textContent = cfg.label;
      btn.addEventListener("click", () => cfg.onClick(btn));
      modalActions.appendChild(btn);
    });

    modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }

  function closeModal() {
    if (modalBackdrop.hidden) return;
    modalBackdrop.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBackdrop.hidden) {
      closeModal();
    }
  });

  /* ---------------- Navigation Links ---------------- */
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      navButtons.forEach((item) => item.classList.remove("is-active"));
      btn.classList.add("is-active");

      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.remove("section-pulse");
      void targetEl.offsetWidth;
      targetEl.classList.add("section-pulse");
    });
  });

  /* ---------------- Polaroid Cards ---------------- */
  const POLAROID_CONTENT = {
    dinner: {
      badge: "🍕",
      title: "Вкусный ужин",
      paragraphs: [
        "Крокодил и кошечка любят острое ням ням"
      ]
    },
    walk: {
      badge: "🌌",
      title: "Прогулка под звёздами",
      paragraphs: [
        "Крокодил и кошечка любят летать и быть выше всех (потому что они и так выше и лучше всех!!)"
      ]
    },
    surprise: {
      badge: "🎁",
      title: "Особенный сюрприз",
      paragraphs: [
        "Крокодил и кошечка любят получать подарочки, но вот какой, секрет!"
      ]
    }
  };

  polaroidCards.forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.modal;
      const data = POLAROID_CONTENT[key];
      if (!data) return;

      openModal({
        badge: data.badge,
        title: data.title,
        paragraphs: data.paragraphs,
        actions: []
      });
    });
  });

  /* ---------------- When & Where Box ---------------- */
  detailsTrigger.addEventListener("click", () => {
    openModal({
      badge: "📅",
      title: "Когда и где встречаемся?",
      paragraphs: [
        "КОГДА: Суббота (вечер) ⏰",
        "ГДЕ: Секрет! 🤫",
        "Жду тебя в платьешке 👗💖"
      ],
      actions: []
    });
  });

  /* ---------------- CTA Celebration Buttons ---------------- */
  const CTA_MESSAGES = {
    "yes-1": {
      badge: "❤️",
      title: "+5 крококисов",
      paragraphs: ["Люблю тебя, моя кошечка ❤️"]
    },
    "yes-2": {
      badge: "🥰",
      title: "+10 крококисов",
      paragraphs: ["Люблю тебя, моя кошечка ❤️"]
    }
  };

  ctaButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const topY = rect.top + 10;

      const choice = btn.dataset.choice;
      const data = CTA_MESSAGES[choice] || CTA_MESSAGES["yes-1"];

      spawnHeartBurst(centerX, topY, 12);
      spawnCrokokisBadge(centerX, rect.top - 6, data.title);
      launchConfetti(125);

      openModal({
        badge: data.badge,
        title: data.title,
        paragraphs: data.paragraphs,
        actions: [
          {
            label: "Ещё конфетти! 🎉",
            primary: true,
            onClick: () => {
              launchConfetti(90);
              spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 10);
            }
          }
        ]
      });
    });
  });

  /* ---------------- Character Easter Eggs ---------------- */
  characterButtons.forEach((charBtn) => {
    charBtn.addEventListener("click", (e) => {
      const rect = charBtn.getBoundingClientRect();
      const x = e.clientX || rect.left + rect.width / 2;
      const y = e.clientY || rect.top + rect.height / 3;
      spawnHeartBurst(x, y, 8);
    });
  });
})();
