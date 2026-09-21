/**
 * layout-hero-particle.js
 * テキストパーティクル ヒーローセクション
 *
 * Nunjucks マクロ経由で自動初期化:
 *   {% from "layout-hero-particle/layout-hero-particle.njk" import heroParticle %}
 *   {{ heroParticle(text="AK²Lab", subtitle="INTERACTIVE ECOSYSTEM") }}
 *
 * - マウスに近いパーティクルが反発し、春のように元の位置に戻ります
 * - Retina (devicePixelRatio > 1) 対応
 * - スマホ (hover: none) は CSS フォールバックでテキスト表示
 */

(function () {
  'use strict';

  /* ── グローバルマウス座標（AK2CursorController と共有しない独自追跡）── */
  var Mouse = { x: -9999, y: -9999 };
  window.addEventListener('mousemove', function (e) {
    Mouse.x = e.clientX;
    Mouse.y = e.clientY;
  });

  /* ── CSS カスタムプロパティ / 色文字列を解決する ── */
  function resolveColor(colorStr) {
    if (!colorStr) {
      /* 空欄: --color-primary を使用 */
      var primary = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary').trim();
      return primary || '#007bff';
    }
    /* hex / rgb など直接値なら即返す */
    if (!colorStr.includes('var(')) return colorStr;
    /* var() 参照を解決: 一時的に color プロパティに適用して読む */
    var tmp = document.createElement('div');
    tmp.style.color = colorStr;
    document.body.appendChild(tmp);
    var resolved = getComputedStyle(tmp).color;
    document.body.removeChild(tmp);
    /* 無効値 (rgba(0,0,0,0)) の場合はフォールバック */
    if (resolved === 'rgba(0, 0, 0, 0)') {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary').trim() || '#007bff';
    }
    return resolved;
  }

  /* ── TextParticleEngine ────────────────────────────────────── */
  function TextParticleEngine(canvas) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d', { willReadFrequently: true });
    this.particles = [];
    this.rafId     = null;
    this._color    = '#fff';

    /* タッチ専用デバイス判定（hover: none = スマホ/タブレット） */
    this._isMobile = window.matchMedia('(hover: none)').matches;

    /* 同じ .ak2-hero-particle セクション内のタイトル要素を探す */
    var section   = canvas.closest('.ak2-hero-particle');
    this.titleEl  = section ? section.querySelector('.ak2-hero-particle__title') : null;
    this._colorStr = canvas.dataset.color || '';

    if (!this.titleEl) return;

    var self = this;
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { self._resize(); }, 150);
    });

    this._resize();
    this.rafId = requestAnimationFrame(function (ts) { self._render(ts); });
  }

  TextParticleEngine.prototype._resize = function () {
    var section = this.canvas.closest('.ak2-hero-particle');
    var dpr = window.devicePixelRatio || 1;

    this.w = section ? section.offsetWidth  : window.innerWidth;
    this.h = section ? section.offsetHeight : window.innerHeight;

    this.canvas.width  = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.scale(dpr, dpr);

    this._color = resolveColor(this._colorStr);
    this._createParticles();
  };

  TextParticleEngine.prototype._createParticles = function () {
    this.particles = [];
    this.ctx.clearRect(0, 0, this.w, this.h);

    /* フォント設定を DOM 要素から取得 */
    var computed   = window.getComputedStyle(this.titleEl);
    var fontFamily = computed.fontFamily;
    var fontWeight = computed.fontWeight;
    /* getComputedStyle の fontSize は vw 等を px に変換済みで返す */
    var fontSize   = parseFloat(computed.fontSize) || Math.min(this.w * 0.15, 200);

    /* オフスクリーンに描画してピクセルデータを取得 */
    this.ctx.font         = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
    this.ctx.fillStyle    = this._color;
    this.ctx.textAlign    = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      (this.titleEl.innerText || this.titleEl.textContent).trim(),
      this.w / 2, this.h / 2
    );

    var dpr     = window.devicePixelRatio || 1;
    var imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    this.ctx.clearRect(0, 0, this.w, this.h);

    /* DPR を考慮したサンプリング間隔（密すぎると重い） */
    var step = Math.floor(dpr * 6);

    for (var y = 0; y < this.canvas.height; y += step) {
      for (var x = 0; x < this.canvas.width; x += step) {
        var idx = (y * this.canvas.width + x) * 4;
        if (imgData[idx + 3] > 128) {
          var posX = x / dpr;
          var posY = y / dpr;
          this.particles.push({
            x:     posX + (Math.random() - 0.5) * 120,
            y:     posY + (Math.random() - 0.5) * 120,
            baseX: posX,
            baseY: posY,
            vx: 0, vy: 0,
            size: Math.random() * 1.5 + 0.5
          });
        }
      }
    }
  };

  TextParticleEngine.prototype._render = function (timestamp) {
    var self = this;
    var t = (timestamp || 0) / 1000; /* 経過秒数 */

    /* 共鳴パラメーター（テキスト全体を左→右に伝わる波） */
    var waveK = 0.006;  /* ベースX座標による位相シフト量 (rad/px) */
    var freqX = 1.0;    /* X方向振動周波数 Hz */
    var freqY = 1.3;    /* Y方向振動周波数 Hz（少しずらして楕円軌道）*/
    var ampX  = 2.5;    /* X方向振幅 px */
    var ampY  = 2.0;    /* Y方向振幅 px */

    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.fillStyle = this._color;
    this.ctx.beginPath();

    this.particles.forEach(function (p) {
      /* 共鳴: ベース位置を中心とした正弦波振動（隣接パーティクルは近い位相） */
      var phase = p.baseX * waveK;
      var restX = p.baseX + Math.sin(t * freqX * Math.PI * 2 + phase) * ampX;
      var restY = p.baseY + Math.cos(t * freqY * Math.PI * 2 + phase + 1.1) * ampY;

      /* デスクトップのみ: マウスによる反発力 */
      if (!self._isMobile) {
        var dx   = Mouse.x - p.x;
        var dy   = Mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && dist > 0) {
          var force = (100 - dist) / 100;
          p.vx -= (dx / dist) * force * 5;
          p.vy -= (dy / dist) * force * 5;
        }
      }

      /* 共鳴位置へのスプリング */
      p.vx += (restX - p.x) * 0.05;
      p.vy += (restY - p.y) * 0.05;
      /* 摩擦 */
      p.vx *= 0.85;
      p.vy *= 0.85;

      p.x += p.vx;
      p.y += p.vy;

      self.ctx.rect(p.x, p.y, p.size, p.size);
    });

    this.ctx.fill();
    this.rafId = requestAnimationFrame(function (ts) { self._render(ts); });
  };

  /* ── 自動初期化 ─────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-particle-canvas]').forEach(function (canvas) {
      new TextParticleEngine(canvas);
    });
  });

})();
