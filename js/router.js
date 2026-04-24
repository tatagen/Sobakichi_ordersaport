/* ============================================================
   router.js — 画面遷移管理
   ============================================================ */

/**
 * 指定した画面IDをアクティブにし、それ以外を非表示にする
 * @param {string} screenId - 表示する画面の要素ID
 */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    // 画面トップへスクロール
    target.scrollTop = 0;
    window.scrollTo(0, 0);
  }
}
