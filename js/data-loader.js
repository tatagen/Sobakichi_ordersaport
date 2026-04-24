/* ============================================================
   data-loader.js — JSONデータ読み込み処理
   ============================================================ */

/**
 * 指定パスのJSONファイルを読み込む
 * @param {string} path - ファイルパス
 * @returns {Promise<any>} - パースされたJSONデータ
 */
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`JSONの読み込みに失敗しました: ${path} (${res.status})`);
  }
  return res.json();
}

/**
 * アプリに必要なJSONを並列で読み込む
 * @returns {Promise<{menus, outputPatterns, casterSets, kaesobaRules}>}
 */
async function loadAllData() {
  const [menus, outputPatterns, casterSets, kaesobaRules] = await Promise.all([
    loadJson('data/menus.json'),
    loadJson('data/output_patterns.json'),
    loadJson('data/caster_sets.json'),
    loadJson('data/kaesoba_rules.json'),
  ]);
  return { menus, outputPatterns, casterSets, kaesobaRules };
}
