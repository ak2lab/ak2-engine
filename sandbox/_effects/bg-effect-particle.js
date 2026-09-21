/**
 * AK² Lab / effects/particles.js
 * ================================
 * Three.js を使った波打つパーティクルエフェクト（クラスベース）
 *
 * 計画書 3-4「物理現象（波紋/火花）」の基礎実装
 * v40.html の HeroParticles より移植
 *
 * マウント先: #hero-particles div
 * ※ Three.js は base.njk で読み込み済み（useThreeJS: true 時）
 * ※ AK²Engine（2D Canvas）とは独立した Three.js の WebGL ループを持つ
 */
class BgEffectParticle {

  /** @type {THREE.Scene|null} */
  #scene = null;

  /** @type {THREE.PerspectiveCamera|null} */
  #camera = null;

  /** @type {THREE.WebGLRenderer|null} */
  #renderer = null;

  /** @type {THREE.Points|null} */
  #particles = null;

  /** @type {HTMLElement|null} */
  #mount = null;

  /** @type {number} 波アニメーション用カウンタ */
  #tick = 0;

  /** @type {number} グリッド横方向パーティクル数 */
  #amountX = 121;

  /** @type {number} グリッド縦方向パーティクル数 */
  #amountY = 60;

  /**
   * @param {object|string} options - mountId 文字列、または { mountId } オブジェクト
   */
  constructor(options = {}) {
    const mountId = (typeof options === 'string') ? options
                  : (options.mountId || 'hero-particles');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.#init(mountId));
    } else {
      this.#init(mountId);
    }
  }

  // SectionEffectRunner 互換スタブ（Three.js 独自ループのため不使用）
  init() {}
  update() {}
  draw() {}
  onResize() {}

  // ── 初期化 ────────────────────────────────────────

  #init(mountId) {
    this.#mount = document.getElementById(mountId);
    if (!this.#mount || typeof THREE === 'undefined') return;

    const w = this.#mount.clientWidth;
    const h = this.#mount.clientHeight;

    // シーン・カメラ
    this.#scene  = new THREE.Scene();
    this.#camera = new THREE.PerspectiveCamera(60, w / h, 1, 10000);
    this.#camera.position.set(0, 150, 400);
    this.#camera.lookAt(0, 0, 0);

    // レンダラー
    this.#renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.#renderer.setSize(w, h);
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    this.#mount.appendChild(this.#renderer.domElement);

    this.#buildParticles();
    this.#animate();

    window.addEventListener('resize', () => this.#onResize(), { passive: true });
  }

  // ── パーティクル生成 ──────────────────────────────

  #buildParticles() {
    // 円形テクスチャを Canvas で生成
    const tex2d = document.createElement('canvas');
    tex2d.width = tex2d.height = 32;
    const ctx2d = tex2d.getContext('2d');
    ctx2d.beginPath();
    ctx2d.arc(16, 16, 14, 0, 2 * Math.PI);
    ctx2d.fillStyle = 'white';
    ctx2d.fill();
    const texture = new THREE.CanvasTexture(tex2d);

    // パーティクルグリッドの頂点データ
    const sep       = 25;
    const count     = this.#amountX * this.#amountY;
    const positions = new Float32Array(count * 3);
    let i = 0;
    for (let ix = 0; ix < this.#amountX; ix++) {
      for (let iy = 0; iy < this.#amountY; iy++) {
        positions[i]     = ix * sep - (this.#amountX * sep) / 2;
        positions[i + 1] = 0;
        positions[i + 2] = iy * sep - (this.#amountY * sep) / 2;
        i += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color:           0x025DCC,  // AK² ブランドカラー（青）
      size:            3,
      map:             texture,
      transparent:     true,
      opacity:         0.5,
      sizeAttenuation: true,
    });

    this.#particles = new THREE.Points(geometry, material);
    this.#scene.add(this.#particles);
  }

  // ── アニメーションループ ──────────────────────────

  #animate() {
    requestAnimationFrame(() => this.#animate());

    const pos = this.#particles.geometry.attributes.position.array;
    let idx = 0;
    for (let ix = 0; ix < this.#amountX; ix++) {
      for (let iy = 0; iy < this.#amountY; iy++) {
        // 複数サイン波の重ね合わせで自然な波紋を表現
        pos[idx + 1] =
          Math.sin((ix + this.#tick) * 0.3) * 30 +
          Math.sin((iy + this.#tick) * 0.5) * 30 +
          Math.sin((ix + iy + this.#tick * 1.5) * 0.2) * 10;
        idx += 3;
      }
    }
    this.#particles.geometry.attributes.position.needsUpdate = true;
    this.#tick += 0.02;

    this.#camera.lookAt(this.#scene.position);
    this.#renderer.render(this.#scene, this.#camera);
  }

  // ── リサイズ対応 ──────────────────────────────────

  #onResize() {
    if (!this.#mount || !this.#renderer) return;
    const w = this.#mount.clientWidth;
    const h = this.#mount.clientHeight;
    this.#camera.aspect = w / h;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(w, h);
  }
}

// 自動起動
window.BgEffectParticle = BgEffectParticle;
