/* ================================================================
   layout-header-nav.js
   AK² グローバルヘッダーナビゲーション
   ================================================================ */

/* ── State Controller ────────────────────────────────────────── */

class AK2NavController {
  static #isOpen = false;
  static #listeners = [];

  static toggle() { this.#isOpen = !this.#isOpen; this.#notify(); }
  static close()  { if (this.#isOpen) { this.#isOpen = false; this.#notify(); } }
  static subscribe(cb) { this.#listeners.push(cb); cb(this.#isOpen); }
  static reset()   { this.#listeners = []; this.#isOpen = false; }
  static #notify() { this.#listeners.forEach(cb => cb(this.#isOpen)); }
}

/* ── Global Nav Indicator (underline / pill) ─────────────────── */

class AK2NavGlobalIndicator {
  #nav; #indicator; #links;

  constructor(nav, type) {
    this.#nav = nav;
    const sel = type === 'pill' ? '.ak2-nav-indicator--pill' : '.ak2-nav-indicator--line';
    this.#indicator = nav.querySelector(sel);
    this.#links = nav.querySelectorAll('a');
    if (!this.#indicator) return;

    this.#links.forEach(l => l.addEventListener('mouseenter', e => this.#move(e.target)));
    this.#nav.addEventListener('mouseleave', () => this.#reset());
    setTimeout(() => this.#reset(), 50);
  }

  #move(target) {
    this.#indicator.style.opacity = '1';
    this.#indicator.style.width   = `${target.offsetWidth}px`;
    this.#indicator.style.left    = `${target.offsetLeft}px`;
  }

  #reset() {
    const active = Array.from(this.#links).find(l => l.classList.contains('is-active'));
    if (active) this.#move(active);
    else this.#indicator.style.opacity = '0';
  }
}

/* ── Toggle: Magnetic Elastic ────────────────────────────────── */

class AK2NavToggleMagnetic {
  #wrapper; #inner;

  constructor(btn) {
    this.#wrapper = btn;
    this.#inner   = btn.querySelector('.ak2-nav-toggle--magnetic');

    btn.addEventListener('mousemove', e => this.#move(e));
    btn.addEventListener('mouseleave', () => this.#leave());
    btn.addEventListener('click', () => AK2NavController.toggle());

    AK2NavController.subscribe(isOpen => {
      btn.classList.toggle('is-active', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  #move(e) {
    const rect = this.#wrapper.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width  / 2)) * 0.4;
    const y = (e.clientY - (rect.top  + rect.height / 2)) * 0.4;
    this.#inner.style.transform = `translate(${x}px, ${y}px)`;
  }

  #leave() { this.#inner.style.transform = 'translate(0px, 0px)'; }
}

/* ── Toggle: Kinetic Particle ────────────────────────────────── */

class AK2NavToggleParticle {
  #particles = []; #numParticles = 120; #w = 120; #h = 120; #isActive = false;
  #offCanvas; #offCtx; #canvas; #ctx; #geomDOM; #animTimer; #clearFlag = true; #reqId; #lt = 0;

  constructor(hybridWrap, canvas, geomBtn) {
    this.#geomDOM  = geomBtn;
    this.#canvas   = canvas;
    this.#ctx      = canvas.getContext('2d');
    this.#offCanvas = document.createElement('canvas');
    this.#offCtx   = this.#offCanvas.getContext('2d', { willReadFrequently: true });

    this.#initCanvas();
    this.#create();

    hybridWrap.addEventListener('click', () => AK2NavController.toggle());

    AK2NavController.subscribe(isOpen => {
      if (this.#isActive !== isOpen) {
        this.#isActive = isOpen;
        this.#geomDOM.style.opacity = '0';
        this.#geomDOM.setAttribute('aria-expanded', String(isOpen));
        this.#clearFlag = false;
        this.#updateTargets();
        this.#explode();

        clearTimeout(this.#animTimer);
        this.#animTimer = setTimeout(() => {
          this.#geomDOM.classList.toggle('is-active', isOpen);
          this.#geomDOM.style.opacity = '1';
          this.#clearFlag = true;
        }, 800);
      }
    });

    this.#reqId = requestAnimationFrame(this.#loop);
  }

  #initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.#canvas.width    = this.#w * dpr;
    this.#canvas.height   = this.#h * dpr;
    this.#ctx.scale(dpr, dpr);
    this.#offCanvas.width  = this.#w * dpr;
    this.#offCanvas.height = this.#h * dpr;
    this.#offCtx.scale(dpr, dpr);
  }

  #create() {
    this.#particles = Array.from({ length: this.#numParticles }, () => ({
      x: this.#w / 2, y: this.#h / 2, vx: 0, vy: 0, tx: 0, ty: 0,
      s: Math.random() * 1.0 + 0.5,
    }));
    this.#updateTargets();
    this.#particles.forEach(p => { p.x = p.tx; p.y = p.ty; });
  }

  #updateTargets() {
    if (!this.#particles.length) return;
    const len = 30, cx = 60, ppl = this.#numParticles / 3;
    for (let i = 0; i < this.#numParticles; i++) {
      const li = Math.floor(i / ppl), t = (i % ppl) / (ppl - 1);
      let tx, ty;
      if (!this.#isActive) {
        tx = cx - len / 2 + len * t;
        if (li === 0) ty = 51.5; else if (li === 1) ty = 60; else ty = 68.5;
      } else {
        const clen = 30;
        if      (li === 0) { tx = cx - clen / 2 + clen * t; ty = 60 - clen / 2 + clen * t; }
        else if (li === 2) { tx = cx - clen / 2 + clen * t; ty = 60 + clen / 2 - clen * t; }
        else               { tx = cx; ty = 60; }
      }
      this.#particles[i].tx = tx;
      this.#particles[i].ty = ty;
    }
  }

  #explode() {
    this.#particles.forEach(p => {
      const a = Math.random() * Math.PI * 2, f = Math.random() * 12 + 3;
      p.vx += Math.cos(a) * f;
      p.vy += Math.sin(a) * f;
    });
  }

  #updateLogic() {
    this.#particles.forEach(p => {
      p.vx += (p.tx - p.x) * 0.08; p.vy += (p.ty - p.y) * 0.08;
      p.vx *= 0.80; p.vy *= 0.80; p.x += p.vx; p.y += p.vy;
    });
  }

  #drawLogic() {
    const styles    = getComputedStyle(document.documentElement);
    const navIcon   = styles.getPropertyValue('--nav-icon').trim()   || '#0f172a';
    const navAccent = styles.getPropertyValue('--nav-accent').trim() || '#025DCC';

    this.#offCtx.globalAlpha = 0.4;
    this.#offCtx.globalCompositeOperation = 'destination-out';
    this.#offCtx.fillStyle = '#fff';
    this.#offCtx.fillRect(0, 0, this.#w, this.#h);
    this.#offCtx.globalAlpha = 1.0;
    this.#offCtx.globalCompositeOperation = 'source-over';

    this.#offCtx.fillStyle = this.#isActive ? navAccent : navIcon;
    this.#offCtx.beginPath();
    this.#particles.forEach(p => {
      this.#offCtx.moveTo(p.x, p.y);
      this.#offCtx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    });
    this.#offCtx.fill();

    this.#ctx.drawImage(this.#offCanvas, 0, 0, this.#w, this.#h);
  }

  #loop = (t) => {
    const dt = (t - this.#lt) / 1000; // eslint-disable-line no-unused-vars
    this.#lt = t;
    if (!document.getElementById('ak2-nav-particle-canvas')) return;
    this.#ctx.clearRect(0, 0, this.#w, this.#h);
    if (!this.#clearFlag) { this.#updateLogic(); this.#drawLogic(); }
    this.#reqId = requestAnimationFrame(this.#loop);
  }

  destroy() { clearTimeout(this.#animTimer); cancelAnimationFrame(this.#reqId); }
}

/* ── Drawer ──────────────────────────────────────────────────── */

class AK2NavDrawer {
  #el; #header;

  constructor(drawerEl, header) {
    this.#el     = drawerEl;
    this.#header = header;

    AK2NavController.subscribe(isOpen => {
      this.#el.classList.toggle('is-open', isOpen);
      this.#el.setAttribute('aria-hidden', String(!isOpen));

      if (isOpen) {
        const sbw = window.innerWidth - document.documentElement.clientWidth;
        const basePR = parseFloat(getComputedStyle(this.#header).paddingRight) || 0;
        document.body.style.overflow     = 'hidden';
        document.body.style.paddingRight = `${sbw}px`;
        if (this.#header) this.#header.style.paddingRight = `${basePR + sbw}px`;
      } else {
        document.body.style.overflow     = '';
        document.body.style.paddingRight = '';
        if (this.#header) this.#header.style.paddingRight = '';
      }
    });

    drawerEl.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => AK2NavController.close())
    );
  }
}

/* ── Auto Init ───────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('ak2-nav-header');
  if (!header) return;

  const gType = header.dataset.global    || 'underline';
  const tType = header.dataset.toggle    || 'geometric';
  const tPos  = header.dataset.togglePos || 'right';

  // Scroll shrink
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }, { passive: true });

  // Left-toggle body class (for circular drawer origin)
  if (tPos === 'left') document.body.classList.add('ak2-nav-toggle-pos-left');

  // Global nav indicator
  const globalNav = document.getElementById('ak2-nav-global');
  if (globalNav && (gType === 'underline' || gType === 'pill')) {
    new AK2NavGlobalIndicator(globalNav, gType);
  }

  // Drawer
  const drawerEl = document.getElementById('ak2-nav-drawer');
  if (drawerEl) new AK2NavDrawer(drawerEl, header);

  // Toggle button
  const toggleBtn = document.getElementById('ak2-nav-toggle-btn');
  if (!toggleBtn) return;

  if (tType === 'magnetic') {
    new AK2NavToggleMagnetic(toggleBtn);
  } else if (tType === 'particle') {
    const hybridWrap    = document.getElementById('ak2-nav-hybrid-wrap');
    const particleCanvas = document.getElementById('ak2-nav-particle-canvas');
    if (hybridWrap && particleCanvas) {
      new AK2NavToggleParticle(hybridWrap, particleCanvas, toggleBtn);
    }
  } else {
    // geometric or liquid
    toggleBtn.addEventListener('click', () => AK2NavController.toggle());
    AK2NavController.subscribe(isOpen => {
      toggleBtn.classList.toggle('is-active', isOpen);
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }
});
