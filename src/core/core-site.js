/**
 * core-site.js
 * ============
 * サイト共通インフラ初期化
 *  - Lucide アイコン初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
