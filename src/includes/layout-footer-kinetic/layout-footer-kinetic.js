/**
 * layout-footer-kinetic.js
 * ========================
 * フッター年号自動更新
 */
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
});
