const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setupMobileMenu() {
  const btn = $(".nav__toggle");
  const menu = $("#navMenu");
  if (!btn || !menu) return;

  const setOpen = (open) => {
    document.body.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", () => {
    const open = !document.body.classList.contains("menu-open");
    setOpen(open);
  });

  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("menu-open")) return;
    const target = e.target;
    const within = target instanceof Element && (menu.contains(target) || btn.contains(target));
    if (!within) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  $$("[data-link]").forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });
}

function setupReveal() {
  const nodes = $$(".reveal");
  if (!nodes.length) return;

  if (prefersReducedMotion()) {
    nodes.forEach((n) => n.classList.add("is-in"));
    return;
  }

  // track scroll direction so reveals can slide from appropriate side
  let lastY = window.scrollY;
  let dir = "down";
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (y > lastY) dir = "down";
      else if (y < lastY) dir = "up";
      lastY = y;
    },
    { passive: true }
  );

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (entry.isIntersecting) {
          el.classList.add("from-" + dir);
          el.classList.add("is-in");
        } else {
          // remove so animation can replay when coming back
          el.classList.remove("is-in", "from-up", "from-down");
        }
      }
    },
    { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
  );

  nodes.forEach((n) => io.observe(n));
}

function setupToTop() {
  const btn = $(".to-top");
  if (!btn) return;

  const onScroll = () => {
    const on = window.scrollY > 520;
    btn.classList.toggle("is-on", on);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });
}

function setupYear() {
  const y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function setupTilt() {
  if (prefersReducedMotion()) return;

  const cards = $$("[data-tilt]");
  if (!cards.length) return;

  for (const el of cards) {
    let raf = 0;
    let rect = null;

    const reset = () => {
      el.style.transform = "";
      el.style.transition = "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
      window.clearTimeout(reset._t);
      reset._t = window.setTimeout(() => (el.style.transition = ""), 260);
    };

    const move = (e) => {
      rect ??= el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rx = clamp((0.5 - y) * 10, -10, 10);
      const ry = clamp((x - 0.5) * 12, -12, 12);

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
    };

    el.addEventListener("mouseenter", () => {
      rect = el.getBoundingClientRect();
    });
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", () => {
      rect = null;
      reset();
    });
  }
}

function setupCounters() {
  const nodes = $$("[data-counter]");
  if (!nodes.length) return;

  const run = (el) => {
    const targetRaw = el.getAttribute("data-counter") ?? "0";
    const target = Number(targetRaw);
    if (!Number.isFinite(target)) return;

    const decimals = targetRaw.includes(".") ? targetRaw.split(".")[1].length : 0;
    const duration = prefersReducedMotion() ? 0 : 900;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const t = duration === 0 ? 1 : clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      el.textContent = v.toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (prefersReducedMotion()) {
    nodes.forEach((n) => run(n));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          run(entry.target);
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.4 }
  );

  nodes.forEach((n) => io.observe(n));
}

function setFieldState(fieldEl, state, msg = "") {
  fieldEl.classList.toggle("is-error", state === "error");
  fieldEl.classList.toggle("is-ok", state === "ok");
  const input = $(".field__input", fieldEl);
  if (input) input.setAttribute("aria-invalid", state === "error" ? "true" : "false");
  const err = input ? $(`[data-error-for="${input.name}"]`, fieldEl) : null;
  if (err) err.textContent = msg;
}

function validateName(v) {
  const s = v.trim();
  if (!s) return "Please enter your name.";
  if (s.length < 2) return "Name is too short.";
  return "";
}

function validateEmail(v) {
  const s = v.trim();
  if (!s) return "Please enter your email.";
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(s);
  if (!ok) return "Please enter a valid email address.";
  return "";
}

function validateMessage(v) {
  const s = v.trim();
  if (!s) return "Please write a message.";
  if (s.length < 10) return "Message must be at least 10 characters.";
  return "";
}

function setupForm() {
  const form = $("#contactForm");
  if (!form) return;

  const toast = $("#toast");
  const closeToast = $(".toast__close", toast || undefined);
  const submitBtn = $("#submitBtn");

  const nameInput = $('input[name="name"]', form);
  const emailInput = $('input[name="email"]', form);
  const msgInput = $('textarea[name="message"]', form);

  const fieldFor = (input) => input?.closest?.(".field");

  const showToast = () => {
    if (!toast) return;
    toast.classList.add("is-on");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("is-on"), 4200);
  };

  const validateAll = (show = true) => {
    const fields = [
      { input: nameInput, fn: validateName },
      { input: emailInput, fn: validateEmail },
      { input: msgInput, fn: validateMessage },
    ];

    let ok = true;
    for (const { input, fn } of fields) {
      if (!input) continue;
      const msg = fn(input.value);
      const field = fieldFor(input);
      if (!field) continue;
      if (msg) {
        ok = false;
        if (show) setFieldState(field, "error", msg);
      } else {
        if (show) setFieldState(field, "ok", "");
      }
    }

    if (submitBtn) submitBtn.disabled = !ok;
    return ok;
  };

  const softValidate = (input, fn) => {
    const field = fieldFor(input);
    if (!field) return;
    const msg = fn(input.value);
    if (msg) setFieldState(field, "error", msg);
    else setFieldState(field, "ok", "");
    validateAll(false);
  };

  if (nameInput) nameInput.addEventListener("input", () => softValidate(nameInput, validateName));
  if (emailInput) emailInput.addEventListener("input", () => softValidate(emailInput, validateEmail));
  if (msgInput) msgInput.addEventListener("input", () => softValidate(msgInput, validateMessage));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = validateAll(true);
    if (!ok) {
      form.classList.remove("shake");
      void form.offsetWidth;
      form.classList.add("shake");
      return;
    }

    showToast();
    form.reset();
    $$(".field", form).forEach((f) => {
      f.classList.remove("is-ok", "is-error");
      const input = $(".field__input", f);
      if (input) input.setAttribute("aria-invalid", "false");
      const err = $(".field__error", f);
      if (err) err.textContent = "";
    });
    if (submitBtn) submitBtn.disabled = true;
  });

  if (toast && closeToast) {
    closeToast.addEventListener("click", () => toast.classList.remove("is-on"));
  }

  // Start disabled until valid inputs exist.
  if (submitBtn) submitBtn.disabled = true;
}

function setupActiveNav() {
  const links = $$('a.nav__link[href^="#"]');
  const map = new Map();
  links.forEach((a) => map.set(a.getAttribute("href"), a));
  const sections = ["#home", "#pricing", "#contact"].map((h) => $(h)).filter(Boolean);
  if (!sections.length || !links.length) return;

  const setActive = (hash) => {
    links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === hash));
  };

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
      if (!visible) return;
      const id = `#${visible.target.id}`;
      if (map.has(id)) setActive(id);
    },
    { threshold: [0.2, 0.32, 0.45], rootMargin: "-20% 0px -55% 0px" }
  );

  sections.forEach((s) => io.observe(s));
  setActive("#home");
}

setupYear();
setupMobileMenu();
setupReveal();
setupToTop();
setupTilt();
setupCounters();
setupForm();
setupActiveNav();

// hide top bar on scroll down, show on scroll up
function setupScrollEffects() {
  let lastY = window.scrollY;
  const header = document.querySelector('.topbar');
  const progress = document.getElementById('scrollProgress');
  const hint = document.querySelector('.scroll-hint');

  function onScroll() {
    const y = window.scrollY;
    const delta = y - lastY;
    if (header) {
      if (y > 100 && delta > 0) {
        header.classList.add('is-hidden');
      } else {
        header.classList.remove('is-hidden');
      }
    }

    if (progress) {
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (y / docHeight) * 100 : 0;
      progress.style.width = pct + '%';
    }

    if (hint && y > 50) {
      hint.classList.add('fade');
    }

    lastY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

// theme switching logic
function setupThemeToggle() {
  const btn = $("#themeToggle");
  const meta = document.querySelector('meta[name="theme-color"]');
  const updateMeta = (color) => {
    if (meta) meta.setAttribute("content", color);
  };

  const apply = (theme) => {
    const light = theme === "light";
    document.documentElement.classList.toggle("theme-light", light);
    localStorage.setItem("theme", theme);
    updateMeta(light ? "#ffffff" : "#0b1220");
    if (btn) btn.textContent = light ? "🌞" : "🌙";
  };

  const stored = localStorage.getItem("theme");
  if (stored) apply(stored);
  else {
    const prefers = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    apply(prefers);
  }

  if (btn) {
    btn.addEventListener("click", () => {
      const current = document.documentElement.classList.contains("theme-light") ? "light" : "dark";
      apply(current === "light" ? "dark" : "light");
    });
  }

  // respond to system changes when user hasn't manually picked a theme
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      apply(e.matches ? "dark" : "light");
    }
  });
}

// simple guided tour implementation
function setupTour() {
  const steps = [
    { el: "#home", text: "Welcome to the home section where we set the stage." },
    { el: "#pricing", text: "Compare plans and pricing that scale with your crew." },
    { el: "#contact", text: "Reach out through the contact form for more information." },
  ];
  let index = 0;
  const overlay = document.getElementById("tourOverlay");
  const textEl = document.getElementById("tourText");
  const prevBtn = document.getElementById("tourPrev");
  const nextBtn = document.getElementById("tourNext");
  const closeBtn = document.getElementById("tourClose");
  const highlight = document.createElement("div");
  highlight.className = "tour-highlight";

  function showStep(i) {
    if (i < 0 || i >= steps.length) return;
    index = i;
    const step = steps[i];
    // animate text sliding
    if (textEl) {
      // determine direction based on index change
      if (i > index) {
        textEl.parentElement?.classList.remove('slide-left');
        textEl.parentElement?.classList.add('slide-right');
      } else if (i < index) {
        textEl.parentElement?.classList.remove('slide-right');
        textEl.parentElement?.classList.add('slide-left');
      }
      // force reflow to restart transition
      void textEl.offsetWidth;
      textEl.textContent = step.text;
      // cleanup after transition
      window.setTimeout(() => {
        textEl.parentElement?.classList.remove('slide-left', 'slide-right');
      }, 300);
    }

    const target = document.querySelector(step.el);
    if (target) {
      const rect = target.getBoundingClientRect();
      highlight.style.top = rect.top + window.scrollY + "px";
      highlight.style.left = rect.left + window.scrollX + "px";
      highlight.style.width = rect.width + "px";
      highlight.style.height = rect.height + "px";
      // ensure overlay covers entire viewport so highlight stands out
    }

    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === steps.length - 1 ? "Finish" : "Next";
  }

  function openTour() {
    if (!overlay) return;
    document.body.appendChild(highlight);
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    showStep(0);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove);
  }
  function closeTour() {
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    if (highlight.parentElement) highlight.parentElement.removeChild(highlight);
    window.removeEventListener("resize", onMove);
    window.removeEventListener("scroll", onMove);
  }
  function onMove() {
    showStep(index);
  }

  if (prevBtn) prevBtn.addEventListener("click", () => showStep(index - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => {
    if (index < steps.length - 1) showStep(index + 1);
    else closeTour();
  });
  if (closeBtn) closeBtn.addEventListener("click", closeTour);

  const tourLink = document.getElementById("takeTour");
  if (tourLink) {
    tourLink.addEventListener("click", (e) => {
      e.preventDefault();
      openTour();
    });
  }
}

setupThemeToggle();
setupTour();
setupScrollEffects();

