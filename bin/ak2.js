#!/usr/bin/env node
/**
 * ak2 CLI — レシピ・エフェクトの管理ツール
 *
 * 使い方:
 *   npx ak2 add hero-basic BgEffectSnow           — レシピ/エフェクトを追加
 *   npx ak2 create my-hero --from hero-basic       — レシピをフォークして新規作成
 *   npx ak2 create BgEffectCustom --effect         — エフェクトのスケルトン生成
 *   npx ak2 save my-hero "説明文"                  — ローカルをレシピとして保存
 *   npx ak2 list                                   — 利用可能なレシピ一覧
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// レジストリの読み込み（ローカル優先 → npm パッケージ内）
function loadRegistry() {
  const localPath = path.resolve("registry.json");
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, "utf8"));
  }
  const pkgPath = path.join(path.dirname(__dirname), "registry.json");
  if (fs.existsSync(pkgPath)) {
    return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  }
  // npm パッケージとしてインストールされている場合
  try {
    const engineRoot = path.dirname(require.resolve("@ak2lab/engine/package.json"));
    const engineRegistry = path.join(engineRoot, "registry.json");
    if (fs.existsSync(engineRegistry)) {
      return JSON.parse(fs.readFileSync(engineRegistry, "utf8"));
    }
  } catch (_) {}
  console.error("registry.json が見つかりません。");
  process.exit(1);
}

// GitHub からファイルをダウンロード
function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "ak2-cli" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${u}`));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }).on("error", reject);
    };
    get(url);
  });
}

// プロジェクトのディレクトリを検出
function detectDirs() {
  // src/_sections/ があればそこ、なければ _sections/
  const candidates = ["src/_sections", "_sections"];
  let sectionsDir = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) { sectionsDir = c; break; }
  }
  if (!sectionsDir) {
    // 初回は作成
    sectionsDir = fs.existsSync("src") ? "src/_sections" : "_sections";
  }

  const effectsCandidates = ["src/_effects", "_effects"];
  let effectsDir = null;
  for (const c of effectsCandidates) {
    if (fs.existsSync(c)) { effectsDir = c; break; }
  }
  if (!effectsDir) {
    effectsDir = fs.existsSync("src") ? "src/_effects" : "_effects";
  }

  return { sectionsDir, effectsDir };
}

// ── コマンド: list ──
function cmdList(args) {
  const registry = loadRegistry();
  const target = args[0];

  if (!target || target === "sections" || target === "recipes") {
    console.log("\n  セクションレシピ一覧:\n");
    for (const [name, info] of Object.entries(registry.sections)) {
      console.log(`    ${name.padEnd(20)} ${info.description}`);
    }
  }

  if (!target || target === "effects") {
    console.log("\n  エフェクト一覧:\n");
    for (const [name, info] of Object.entries(registry.effects)) {
      console.log(`    ${name.padEnd(28)} ${info.description}`);
    }
  }

  console.log("");
}

// ── コマンド: add ──
async function cmdAdd(names) {
  if (names.length === 0) {
    console.log("追加するレシピ名またはエフェクト名を指定してください。");
    console.log("例: npx ak2 add hero-basic BgEffectSnow");
    process.exit(1);
  }

  const registry = loadRegistry();
  const { sectionsDir, effectsDir } = detectDirs();
  const repoBase = registry.repo;

  for (const name of names) {
    // セクションかエフェクトかを判定
    const sectionInfo = registry.sections[name];
    const effectInfo = registry.effects[name];

    if (!sectionInfo && !effectInfo) {
      console.log(`  ✗ "${name}" はレジストリに見つかりません。`);
      continue;
    }

    if (sectionInfo) {
      fs.mkdirSync(sectionsDir, { recursive: true });
      for (const file of sectionInfo.files) {
        const destPath = path.join(sectionsDir, file);
        if (fs.existsSync(destPath)) {
          console.log(`  ⊘ ${destPath} は既に存在します（スキップ）`);
          continue;
        }
        try {
          const url = `${repoBase}/sections/${name}/${file}`;
          const content = await download(url);
          fs.writeFileSync(destPath, content, "utf8");
          console.log(`  ✓ ${destPath}`);
        } catch (e) {
          // GitHub から取得できない場合、ローカル（エンジン内）からコピー
          const localSrc = findLocalFile("_sections", file) || findLocalFile("sandbox/_sections", file);
          if (localSrc) {
            fs.copyFileSync(localSrc, destPath);
            console.log(`  ✓ ${destPath} (ローカル)`);
          } else {
            console.log(`  ✗ ${file} のダウンロードに失敗: ${e.message}`);
          }
        }
      }
    }

    if (effectInfo) {
      fs.mkdirSync(effectsDir, { recursive: true });
      for (const file of effectInfo.files) {
        const destPath = path.join(effectsDir, file);
        if (fs.existsSync(destPath)) {
          console.log(`  ⊘ ${destPath} は既に存在します（スキップ）`);
          continue;
        }
        try {
          const url = `${repoBase}/effects/${name}/${file}`;
          const content = await download(url);
          fs.writeFileSync(destPath, content, "utf8");
          console.log(`  ✓ ${destPath}`);
        } catch (e) {
          const localSrc = findLocalFile("_effects", file) || findLocalFile("sandbox/_effects", file);
          if (localSrc) {
            fs.copyFileSync(localSrc, destPath);
            console.log(`  ✓ ${destPath} (ローカル)`);
          } else {
            console.log(`  ✗ ${file} のダウンロードに失敗: ${e.message}`);
          }
        }
      }
    }
  }
  console.log("\n完了。");
}

// ローカルのエンジンパッケージ内からファイルを探す
function findLocalFile(subdir, filename) {
  // カレントディレクトリ内
  const local = path.resolve(subdir, filename);
  if (fs.existsSync(local)) return local;
  // CLI 自身のディレクトリ基準（直接実行時）
  const cliRoot = path.dirname(__dirname);
  const cliFile = path.join(cliRoot, subdir, filename);
  if (fs.existsSync(cliFile)) return cliFile;
  const cliSandbox = path.join(cliRoot, "sandbox", subdir, filename);
  if (fs.existsSync(cliSandbox)) return cliSandbox;
  // npm パッケージ内
  try {
    const engineRoot = path.dirname(require.resolve("@ak2lab/engine/package.json"));
    const pkgFile = path.join(engineRoot, subdir, filename);
    if (fs.existsSync(pkgFile)) return pkgFile;
    const pkgSandbox = path.join(engineRoot, "sandbox", subdir, filename);
    if (fs.existsSync(pkgSandbox)) return pkgSandbox;
  } catch (_) {}
  return null;
}

// ── ユーティリティ ──

// コマンド引数からフラグを解析
function parseFlags(args) {
  const result = { positional: [], from: null, effect: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && i + 1 < args.length) {
      result.from = args[++i];
    } else if (args[i] === "--effect") {
      result.effect = true;
    } else if (!args[i].startsWith("--")) {
      result.positional.push(args[i]);
    }
  }
  return result;
}

// PascalCase → kebab-case
function toKebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

// 上書き確認プロンプト
function confirm(message) {
  return new Promise((resolve) => {
    process.stdout.write(message + " (y/N): ");
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (data) => {
      resolve(data.trim().toLowerCase() === "y");
    });
  });
}

// registry.json を更新（キーをソートして書き出し）
function updateRegistry(registryPath, type, name, entry) {
  if (!fs.existsSync(registryPath)) return false;
  const reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  if (!reg[type]) reg[type] = {};
  reg[type][name] = entry;
  const sorted = {};
  for (const k of Object.keys(reg[type]).sort()) {
    sorted[k] = reg[type][k];
  }
  reg[type] = sorted;
  fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2) + "\n", "utf8");
  return true;
}

// ak2-recipes ディレクトリを検出
function detectRecipesDir() {
  if (process.env.AK2_RECIPES_DIR) {
    const dir = path.resolve(process.env.AK2_RECIPES_DIR);
    if (fs.existsSync(dir)) return dir;
  }
  const sibling = path.resolve(process.cwd(), "../ak2-recipes");
  if (fs.existsSync(sibling)) return sibling;
  return null;
}

// ── コマンド: create ──
async function cmdCreate(args) {
  const flags = parseFlags(args);
  const name = flags.positional[0];

  if (!name) {
    console.log("  作成するレシピ名を指定してください。");
    console.log("  例: npx ak2 create my-hero --from hero-basic");
    console.log("      npx ak2 create BgEffectCustom --effect");
    process.exit(1);
  }

  const { sectionsDir, effectsDir } = detectDirs();

  if (flags.effect) {
    // ── エフェクト作成 ──
    if (!/^BgEffect[A-Z]/.test(name)) {
      console.log(`  ✗ エフェクト名は BgEffect で始めてください（例: BgEffectCustom）`);
      process.exit(1);
    }
    const filename = toKebab(name) + ".js";
    const destPath = path.join(effectsDir, filename);

    if (fs.existsSync(destPath)) {
      console.log(`  ✗ ${destPath} は既に存在します。`);
      process.exit(1);
    }

    fs.mkdirSync(effectsDir, { recursive: true });

    if (flags.from) {
      // --from: コピー＆リネーム
      const fromFilename = toKebab(flags.from) + ".js";
      let content = null;

      // ローカル → エンジン内 → GitHub
      const localPath = path.join(effectsDir, fromFilename);
      if (fs.existsSync(localPath)) {
        content = fs.readFileSync(localPath, "utf8");
      } else {
        const found = findLocalFile("_effects", fromFilename) || findLocalFile("sandbox/_effects", fromFilename);
        if (found) {
          content = fs.readFileSync(found, "utf8");
        } else {
          const registry = loadRegistry();
          const info = registry.effects[flags.from];
          if (info) {
            try {
              content = await download(`${registry.repo}/effects/${flags.from}/${fromFilename}`);
            } catch (_) {}
          }
        }
      }

      if (!content) {
        console.log(`  ✗ "${flags.from}" が見つかりません。`);
        process.exit(1);
      }

      // クラス名・window登録名をリネーム
      content = content.replace(new RegExp(flags.from, "g"), name);
      fs.writeFileSync(destPath, content, "utf8");
      console.log(`  ✓ ${destPath} (${flags.from} からフォーク)`);
    } else {
      // スケルトン生成
      const skeleton = `/**
 * ${name}
 * ─────────────────────────────────────
 * コンストラクタオプション:
 *   （ここにオプション一覧を記載）
 *
 * CSS 変数:
 *   （ここにCSS変数一覧を記載）
 * ─────────────────────────────────────
 */
class ${name} {
  #options = {};

  constructor(options = {}) {
    this.#options = options;
  }

  init(canvas, ctx) {
    this.w = canvas.width;
    this.h = canvas.height;
  }

  update(dt) {}

  draw(ctx) {}

  onResize(w, h) {
    this.w = w;
    this.h = h;
  }
}
window.${name} = ${name};
`;
      fs.writeFileSync(destPath, skeleton, "utf8");
      console.log(`  ✓ ${destPath} (スケルトン)`);
    }
  } else {
    // ── セクション作成 ──
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      console.log(`  ✗ セクション名は kebab-case にしてください（例: my-hero）`);
      process.exit(1);
    }
    const njkPath = path.join(sectionsDir, name + ".njk");
    const cssPath = path.join(sectionsDir, name + ".css");

    if (fs.existsSync(njkPath) || fs.existsSync(cssPath)) {
      console.log(`  ✗ ${sectionsDir}/${name}.* は既に存在します。`);
      process.exit(1);
    }

    fs.mkdirSync(sectionsDir, { recursive: true });

    if (flags.from) {
      // --from: コピー＆リネーム
      let njkContent = null;
      let cssContent = null;

      // ローカル → エンジン内 → GitHub
      const localNjk = path.join(sectionsDir, flags.from + ".njk");
      const localCss = path.join(sectionsDir, flags.from + ".css");
      if (fs.existsSync(localNjk)) {
        njkContent = fs.readFileSync(localNjk, "utf8");
        cssContent = fs.existsSync(localCss) ? fs.readFileSync(localCss, "utf8") : "";
      } else {
        const foundNjk = findLocalFile("_sections", flags.from + ".njk") || findLocalFile("sandbox/_sections", flags.from + ".njk");
        const foundCss = findLocalFile("_sections", flags.from + ".css") || findLocalFile("sandbox/_sections", flags.from + ".css");
        if (foundNjk) {
          njkContent = fs.readFileSync(foundNjk, "utf8");
          cssContent = foundCss ? fs.readFileSync(foundCss, "utf8") : "";
        } else {
          const registry = loadRegistry();
          const info = registry.sections[flags.from];
          if (info) {
            try {
              njkContent = await download(`${registry.repo}/sections/${flags.from}/${flags.from}.njk`);
              cssContent = await download(`${registry.repo}/sections/${flags.from}/${flags.from}.css`).catch(() => "");
            } catch (_) {}
          }
        }
      }

      if (njkContent === null) {
        console.log(`  ✗ "${flags.from}" が見つかりません。`);
        process.exit(1);
      }

      // BEM クラス名をリネーム（.hero-basic → .my-hero, .hero-basic__title → .my-hero__title）
      const fromPattern = new RegExp(flags.from, "g");
      njkContent = njkContent.replace(fromPattern, name);
      cssContent = cssContent.replace(fromPattern, name);

      fs.writeFileSync(njkPath, njkContent, "utf8");
      fs.writeFileSync(cssPath, cssContent, "utf8");
      console.log(`  ✓ ${njkPath} (${flags.from} からフォーク)`);
      console.log(`  ✓ ${cssPath}`);
    } else {
      // スケルトン生成
      const njkSkeleton = `{# ${name} セクション
   ─────────────────────────────────────
   YAML パラメータ:
     title       - 見出し
     text        - 本文（HTML可）
     extraClass  - 追加CSSクラス
     style       - インラインCSS変数の上書き（例: "--${name}-bg: #1a1a2e"）

   CSS 調整変数:
     --${name}-padding    : セクション余白
     --${name}-bg         : 背景色
     --${name}-title-size : 見出しサイズ
   ───────────────────────────────────── #}
<section class="${name} {{ section.extraClass }}" style="{{ section.style }}">
  <div class="container">
    {% if section.title %}
    <h2 class="${name}__title">{{ section.title }}</h2>
    {% endif %}
    {% if section.text %}
    <div class="${name}__text">{{ section.text | safe }}</div>
    {% endif %}
  </div>
</section>
`;
      const cssSkeleton = `/* ── 調整ポイント ── */
.${name} {
  --${name}-padding: 5rem 0;
  --${name}-bg: white;
  --${name}-title-size: 2rem;

  padding: var(--${name}-padding);
  background: var(--${name}-bg);
}

.${name} .container {
  max-width: 800px;
  margin: 0 auto;
}

.${name}__title {
  font-size: var(--${name}-title-size);
  font-weight: 700;
  color: var(--color-dark, #1e293b);
  margin-bottom: 1.5rem;
}

.${name}__text {
  font-size: 1rem;
  color: var(--color-text, #475569);
  line-height: 1.8;
}
`;
      fs.writeFileSync(njkPath, njkSkeleton, "utf8");
      fs.writeFileSync(cssPath, cssSkeleton, "utf8");
      console.log(`  ✓ ${njkPath} (スケルトン)`);
      console.log(`  ✓ ${cssPath}`);
    }
  }

  console.log("\n完了。");
}

// ── コマンド: save ──
async function cmdSave(args) {
  const name = args[0];
  const description = args[1];

  if (!name || !description) {
    console.log("  レシピ名と説明を指定してください。");
    console.log('  例: npx ak2 save my-hero "カスタムヒーロー。2カラム対応。"');
    process.exit(1);
  }

  const recipesDir = detectRecipesDir();
  if (!recipesDir) {
    console.log("  ✗ ak2-recipes ディレクトリが見つかりません。");
    console.log("    AK2_RECIPES_DIR 環境変数を設定するか、隣接フォルダに ak2-recipes を配置してください。");
    process.exit(1);
  }

  const { sectionsDir, effectsDir } = detectDirs();
  const isEffect = name.startsWith("BgEffect");

  if (isEffect) {
    // ── エフェクト保存 ──
    const filename = toKebab(name) + ".js";
    const srcPath = path.join(effectsDir, filename);

    if (!fs.existsSync(srcPath)) {
      console.log(`  ✗ ${srcPath} が見つかりません。`);
      process.exit(1);
    }

    const destDir = path.join(recipesDir, "effects", name);
    const destPath = path.join(destDir, filename);

    if (fs.existsSync(destPath)) {
      const ok = await confirm(`  ${destPath} を上書きしますか？`);
      if (!ok) { console.log("  中止しました。"); process.exit(0); }
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ ${destPath}`);

    const entry = { description, files: [filename] };
    const recipesReg = path.join(recipesDir, "registry.json");
    const engineReg = path.resolve("registry.json");
    if (updateRegistry(recipesReg, "effects", name, entry)) {
      console.log(`  ✓ ${recipesReg} 更新`);
    }
    if (updateRegistry(engineReg, "effects", name, entry)) {
      console.log(`  ✓ ${engineReg} 更新`);
    }
  } else {
    // ── セクション保存 ──
    const njkSrc = path.join(sectionsDir, name + ".njk");
    const cssSrc = path.join(sectionsDir, name + ".css");

    if (!fs.existsSync(njkSrc)) {
      console.log(`  ✗ ${njkSrc} が見つかりません。`);
      process.exit(1);
    }

    const destDir = path.join(recipesDir, "sections", name);
    const files = [name + ".njk"];
    const destNjk = path.join(destDir, name + ".njk");

    if (fs.existsSync(destNjk)) {
      const ok = await confirm(`  ${destDir}/ を上書きしますか？`);
      if (!ok) { console.log("  中止しました。"); process.exit(0); }
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(njkSrc, destNjk);
    console.log(`  ✓ ${destNjk}`);

    if (fs.existsSync(cssSrc)) {
      const destCss = path.join(destDir, name + ".css");
      fs.copyFileSync(cssSrc, destCss);
      files.push(name + ".css");
      console.log(`  ✓ ${destCss}`);
    }

    const entry = { description, files };
    const recipesReg = path.join(recipesDir, "registry.json");
    const engineReg = path.resolve("registry.json");
    if (updateRegistry(recipesReg, "sections", name, entry)) {
      console.log(`  ✓ ${recipesReg} 更新`);
    }
    if (updateRegistry(engineReg, "sections", name, entry)) {
      console.log(`  ✓ ${engineReg} 更新`);
    }
  }

  console.log("\n完了。");
}

// ── メイン ──
const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case "list":
  case "ls":
    cmdList(args);
    break;
  case "add":
    cmdAdd(args).catch((e) => {
      console.error("エラー:", e.message);
      process.exit(1);
    });
    break;
  case "create":
    cmdCreate(args).catch((e) => {
      console.error("エラー:", e.message);
      process.exit(1);
    });
    break;
  case "save":
    cmdSave(args).catch((e) => {
      console.error("エラー:", e.message);
      process.exit(1);
    });
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    console.log(`
  AK²Engine CLI

  使い方:
    npx ak2 <コマンド> [引数]

  コマンド:
    add <名前...>                          レシピやエフェクトをプロジェクトに追加
    create <名前> [--from <元>] [--effect]  レシピをフォーク or スケルトン生成
    save <名前> "<説明>"                    ローカルのセクション/エフェクトをレシピとして保存
    list [sections|effects]                利用可能なレシピ・エフェクト一覧
    help                                   このヘルプを表示

  例:
    npx ak2 add hero-basic BgEffectSnow
    npx ak2 create my-hero --from hero-basic
    npx ak2 create BgEffectCustom --effect --from BgEffectSnow
    npx ak2 save my-hero "カスタムヒーロー。2カラム対応。"
    npx ak2 list
`);
    break;
  default:
    console.log(`不明なコマンド: ${cmd}\nnpx ak2 help でヘルプを表示します。`);
    process.exit(1);
}
