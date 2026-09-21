/**
 * effect-cursor-magnetic.js
 * カスタムカーソル + 磁力エフェクト
 *
 * セットアップ:
 *   {% from "effect-cursor-magnetic/effect-cursor-magnetic.njk" import cursorMagnetic %}
 *   {{ cursorMagnetic() }}  ← body 直下などに1回配置
 *
 * カーソル有効エリア: data-cursor-area 属性を付与したセクション
 * 磁力効果:          data-magnetic 属性を付与した要素
 */

(function () {
  'use strict';

  /* ── グローバルマウス座標 ────────────────────────────────── */
  var Mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', function (e) {
    Mouse.x = e.clientX;
    Mouse.y = e.clientY;
  });

  /* ── Lerp ────────────────────────────────────────────────── */
  function lerp(a, b, n) { return (1 - n) * a + n * b; }

  /* ── AK2CursorController ────────────────────────────────── */
  function AK2CursorController() {
    this.dot  = document.getElementById('ak2-cursor-dot');
    this.ring = document.getElementById('ak2-cursor-ring');
    if (!this.dot || !this.ring) return;

    this.ringX    = Mouse.x;
    this.ringY    = Mouse.y;
    this.isActive = false;

    this._init();
  }

  AK2CursorController.prototype._init = function () {
    var self = this;

    /* カーソル有効エリアの入退出 */
    document.querySelectorAll('[data-cursor-area]').forEach(function (area) {
      area.addEventListener('mouseenter', function () {
        self.isActive = true;
        document.body.classList.add('is-custom-cursor');
      });
      area.addEventListener('mouseleave', function () {
        self.isActive = false;
        document.body.classList.remove('is-custom-cursor');
      });
    });

    /* ホバー & マグネット */
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { self._addHover(); });
      el.addEventListener('mouseleave', function () { self._removeHover(el); });
      el.addEventListener('mousemove',  function (e) { self._magnetize(e, el); });
    });

    /* a / button はホバー状態のみ（マグネットなし） */
    document.querySelectorAll('a, button').forEach(function (el) {
      if (el.hasAttribute('data-magnetic')) return;
      el.addEventListener('mouseenter', function () { self._addHover(); });
      el.addEventListener('mouseleave', function () { self._removeHover(null); });
    });

    this._render();
  };

  AK2CursorController.prototype._addHover = function () {
    this.dot.classList.add('is-hover');
    this.ring.classList.add('is-hover');
  };

  AK2CursorController.prototype._removeHover = function (el) {
    this.dot.classList.remove('is-hover');
    this.ring.classList.remove('is-hover');
    if (el && el.hasAttribute('data-magnetic')) {
      el.style.transform = 'translate(0px, 0px)';
    }
  };

  AK2CursorController.prototype._magnetize = function (e, el) {
    var rect = el.getBoundingClientRect();
    var x = (e.clientX - (rect.left + rect.width  / 2)) * 0.35;
    var y = (e.clientY - (rect.top  + rect.height / 2)) * 0.35;
    el.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  };

  AK2CursorController.prototype._render = function () {
    var self = this;

    if (this.isActive) {
      /* ドット: 遅延なし */
      this.dot.style.transform =
        'translate(calc(' + Mouse.x + 'px - 50%), calc(' + Mouse.y + 'px - 50%))';

      /* リング: Lerp で滑らかに追従 */
      this.ringX = lerp(this.ringX, Mouse.x, 0.15);
      this.ringY = lerp(this.ringY, Mouse.y, 0.15);
      this.ring.style.transform =
        'translate(calc(' + this.ringX + 'px - 50%), calc(' + this.ringY + 'px - 50%))';
    } else {
      /* エリア外: リング位置をマウスに即合わせ（次回入った時のジャンプ防止） */
      this.ringX = Mouse.x;
      this.ringY = Mouse.y;
    }

    requestAnimationFrame(function () { self._render(); });
  };

  /* ── 自動初期化 ──────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('ak2-cursor-dot')) {
      window.AK2CursorController = new AK2CursorController();
    }
  });

})();
