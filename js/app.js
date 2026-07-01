/* ============================================================
   app.js — オーダーサポート メインロジック
   ============================================================ */

const state = {
  menus: [],
  outputPatterns: [],
  casterSets: [],
  kaesobaRules: null,

  currentScreen: 'home',
  selectedCategory: null,
  selectedMenu: null,
  selectedNoodle: null,    // 'soba' | 'kishimen' | null
  selectedStyle: null,     // 'kake' | 'zaru' | null
  selectedTemp: null,      // 'hot' | 'cold' | null
  currentPattern: null,

  selectedBig: false,          // 大オプション（麺単品）
  selectedMenBig: false,       // 丼セット 麺大
  selectedMeshiBig: false,     // 丼セット ご飯大
  selectedBento: null,         // null | 'bento'(かやくご飯) | 'teishoku'(白ご飯)
  selectedDonKake: null,       // 未使用（変えそばで統合）

  cart: [],
  cartIdCounter: 0,
  history: [],             // 最大5件

  selectedKaesobaTopping: null,
  selectedKaesobaKishi: false,  // 変えそば きしめん選択（コラボ・なす用）

  selectedKishi: false,         // コラボ・なすおろし・きのこ きしめん選択
  selectedIppinBig: false,      // なすおろし・きのこ 大盛選択
};

// カテゴリ定義（表示名 → category_large の値）
const CATEGORIES = [
  { label: '麺メニュー',          key: '麺' },
  { label: '丼セット',            key: '丼セット' },
  { label: 'ミニ丼セット',        key: 'ミニ丼セット' },
  { label: '弁当・御膳',          key: '弁当・御膳' },
  { label: '釜飯',                key: '釜飯' },
  { label: '鍋',                  key: '鍋' },
  { label: 'なすおろし・きのこ',  key: 'なすおろし・きのこ' },
  { label: 'コラボ',              key: 'コラボ' },
  { label: '付け合わせ・ご飯',    key: '付け合わせ・ご飯' },
  { label: '飲み物・甘味・持帰',  key: '飲み物・甘味・持帰' },
];

/* ============================================================
   初期化
   ============================================================ */
async function init() {
  try {
    const { menus, outputPatterns, casterSets, kaesobaRules } = await loadAllData();
    state.menus = menus;
    state.outputPatterns = outputPatterns;
    state.casterSets = casterSets;
    state.kaesobaRules = kaesobaRules;

    // 検索バーのイベント設定
    document.getElementById('search-input').addEventListener('input', onSearchHome);
    document.getElementById('search-input-menu').addEventListener('input', onSearchMenu);

    renderHome();
    showScreen('home');
  } catch (e) {
    document.body.innerHTML = `<p style="color:red;padding:20px">データ読み込み失敗: ${e.message}</p>`;
  }
}

/* ============================================================
   画面切替
   ============================================================ */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  state.currentScreen = name;

  // 戻る・ホームボタン：常に表示
  const fabBack = document.getElementById('fab-back');
  const fabHome = document.getElementById('fab-home');
  if (fabBack) fabBack.style.display = 'flex';
  if (fabHome) fabHome.style.display = 'flex';

  // ホーム以外では検索を隠す
  if (name === 'home') {
    document.getElementById('search-input').value = '';
    onSearchHome();
  }
}

function fabBack() {
  const screen = state.currentScreen;
  if (screen === 'menu')   { showScreen('home'); }
  else if (screen === 'option') { showScreen('menu'); }
  else if (screen === 'result') { showScreen('option'); }
  else { showScreen('home'); }
}

/* ============================================================
   ホーム画面
   ============================================================ */
function renderHome() {
  renderCategories();
  renderHistory();
}

function renderCategories() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.textContent = cat.label;
    btn.addEventListener('click', () => selectCategory(cat.key, cat.label));
    grid.appendChild(btn);
  });
}

function selectCategory(key, label) {
  state.selectedCategory = key;
  renderMenuList(key, label);
  showScreen('menu');
  document.getElementById('search-input-menu').value = '';
}

/* ============================================================
   検索
   ============================================================ */
function toHira(str) {
  return str.replace(/[\u30A1-\u30F6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function searchMenus(query) {
  const q = toHira(query.trim().toLowerCase());
  if (!q) return [];
  return state.menus.filter(m => m.is_active && toHira(m.name).includes(q));
}

function onSearchHome() {
  const q = document.getElementById('search-input').value;
  const results = document.getElementById('search-results');
  const homeContent = document.getElementById('home-content');
  if (!q.trim()) {
    results.style.display = 'none';
    homeContent.style.display = '';
    return;
  }
  homeContent.style.display = 'none';
  results.style.display = '';
  renderSearchResults(q, results);
}

function onSearchMenu() {
  const q = document.getElementById('search-input-menu').value;
  renderMenuList(state.selectedCategory, null, q);
}

function renderSearchResults(q, container) {
  const found = searchMenus(q);
  container.innerHTML = '';
  if (found.length === 0) {
    container.innerHTML = '<p class="no-result">該当なし</p>';
    return;
  }
  found.forEach(menu => {
    container.appendChild(makeMenuBtn(menu, () => {
      selectMenuDirect(menu);
    }));
  });
}

/* ============================================================
   商品一覧
   ============================================================ */
function renderMenuList(categoryKey, label, searchQuery) {
  if (label) document.getElementById('menu-screen-title').textContent = label;

  let filtered = state.menus.filter(m => m.is_active);
  if (categoryKey) {
    filtered = filtered.filter(m => m.category_large === categoryKey);
  }
  if (searchQuery && searchQuery.trim()) {
    const q = toHira(searchQuery.trim().toLowerCase());
    filtered = filtered.filter(m => toHira(m.name).includes(q));
  }
  filtered.sort((a, b) => a.display_order - b.display_order);

  const container = document.getElementById('menu-list');
  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = '<p class="no-result">該当なし</p>';
    return;
  }
  filtered.forEach(menu => {
    container.appendChild(makeMenuBtn(menu, () => selectMenu(menu)));
  });
}

function makeMenuBtn(menu, onClick) {
  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  const priceHtml = menu.price != null
    ? `<span class="menu-btn-price">¥${menu.price.toLocaleString()}</span>`
    : '';
  btn.innerHTML = `<span class="menu-btn-name">${menu.name}${priceHtml}</span><span class="arrow">›</span>`;
  btn.addEventListener('click', onClick);
  return btn;
}

/* ============================================================
   メニュー選択 → オプション
   ============================================================ */
function resetMenuState(menu) {
  state.selectedMenu = menu;
  state.selectedNoodle = menu.has_soba ? (menu.has_kishimen ? null : 'soba') : null;
  state.selectedStyle = null;
  state.selectedTemp = null;
  state.currentPattern = null;
  state.selectedKaesobaTopping = null;
  state.selectedKaesobaKishi = false;
  state.selectedKishi = false;
  state.selectedIppinBig = false;
  state.selectedBig = false;
  state.selectedMenBig = false;
  state.selectedMeshiBig = false;
  state.selectedBento = null;
  state.selectedDonKake = null;
}

function selectMenu(menu) {
  resetMenuState(menu);
  showScreen('option');
  renderOptions();
}

function selectMenuDirect(menu) {
  resetMenuState(menu);
  showScreen('option');
  renderOptions();
}

/* ============================================================
   オプション選択（全選択完了で自動遷移）
   ============================================================ */
function renderOptions() {
  const menu = state.selectedMenu;
  document.getElementById('option-screen-title').textContent = menu.name;
  const container = document.getElementById('option-list');
  container.innerHTML = '';

  // そば不要かつオプション選択不要のメニューは直接自動確定
  const isKishiMenu = menu.category_large === 'コラボ' || menu.category_large === 'なすおろし・きのこ';
  if (!menu.has_soba && !menu.has_kishimen && !menu.has_kake && !menu.has_zaru && !menu.has_temp && !isKishiMenu) {
    autoConfirm();
    return;
  }

  // 麺種
  if (menu.has_soba && menu.has_kishimen) {
    container.appendChild(makeOptionGroup('麺の種類', [
      { label: 'そば', value: 'soba' },
      { label: 'きしめん', value: 'kishimen' },
    ], 'noodle', state.selectedNoodle, v => { state.selectedNoodle = v; checkAutoConfirm(); }));
  }

  // かけ・ざる
  if (menu.has_kake && menu.has_zaru) {
    container.appendChild(makeOptionGroup('提供形式', [
      { label: 'かけ', value: 'kake' },
      { label: 'ざる', value: 'zaru' },
    ], 'style', state.selectedStyle, v => { state.selectedStyle = v; checkAutoConfirm(); }));
  } else if (menu.has_kake) {
    state.selectedStyle = 'kake';
  } else if (menu.has_zaru) {
    state.selectedStyle = 'zaru';
  }

  // 温・冷
  if (menu.has_temp) {
    container.appendChild(makeOptionGroup('温度', [
      { label: '温', value: 'hot' },
      { label: '冷', value: 'cold' },
    ], 'temp', state.selectedTemp, v => { state.selectedTemp = v; checkAutoConfirm(); }));
  }

  // 大オプション（麺メニューのみ）
  if (menu.category_internal === 'noodle') {
    container.appendChild(makeToggleOption('量', '大（だい）', state.selectedBig, v => {
      state.selectedBig = v;
      renderOptions();
    }));
  }

  // 丼セット用 麺大・ご飯大
  if (menu.category_internal === 'donset' || menu.category_internal === 'mini_donset') {
    container.appendChild(makeToggleOption('麺の量', '麺大', state.selectedMenBig || false, v => {
      state.selectedMenBig = v;
      renderOptions();
    }));
    container.appendChild(makeToggleOption('ご飯の量', 'ご飯大', state.selectedMeshiBig || false, v => {
      state.selectedMeshiBig = v;
      renderOptions();
    }));
  }

  // 弁当/定食オプション
  const hasBentoDenpyo = menu.bento_denpyo || menu.bento_denpyo_kishi;
  const isBentoMenu = menu.category_large === '弁当・御膳';
  if ((menu.category_internal === 'noodle' && hasBentoDenpyo) || isBentoMenu) {
    container.appendChild(makeOptionGroup('ご飯', [
      { label: 'なし', value: null },
      { label: '弁当（かやくご飯）', value: 'bento' },
      { label: '定食（白ご飯）', value: 'teishoku' },
    ], 'bento', state.selectedBento, v => { state.selectedBento = v; checkAutoConfirm(); }));
  }

  // コラボ・なすおろし・きのこ: きしめんオプション
  if (isKishiMenu) {
    container.appendChild(makeToggleOption('麺の種類', 'きしめん', state.selectedKishi, v => {
      state.selectedKishi = v;
      renderOptions();
    }, 'そば'));
  }

  // なすおろし・きのこ: 大盛オプション
  if (menu.category_large === 'なすおろし・きのこ') {
    container.appendChild(makeToggleOption('量', '大（だい）', state.selectedIppinBig, v => {
      state.selectedIppinBig = v;
      renderOptions();
    }));
  }

  // コラボ・なすおろし・きのこ: 確認ボタン（autoConfirmしないため手動確認）
  if (isKishiMenu) {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-option-confirm';
    confirmBtn.textContent = '通し方・伝票を確認する';
    confirmBtn.addEventListener('click', () => {
      // 固定値を解決してから確定
      if (!state.selectedNoodle) state.selectedNoodle = menu.has_soba ? 'soba' : null;
      if (!state.selectedStyle)  state.selectedStyle  = menu.has_kake ? 'kake' : (menu.has_zaru ? 'zaru' : null);
      if (!state.selectedTemp)   state.selectedTemp   = null;
      autoConfirm();
    });
    container.appendChild(confirmBtn);
    return; // checkAutoConfirmは呼ばない
  }

  // 初回レンダリング後に自動確定チェック
  checkAutoConfirm();
}

function makeToggleOption(groupLabel, label, isOn, onChange, falseLabel) {
  const section = document.createElement('div');
  section.className = 'option-section';
  const lbl = document.createElement('p');
  lbl.className = 'option-label';
  lbl.textContent = groupLabel;
  section.appendChild(lbl);
  const wrap = document.createElement('div');
  wrap.className = 'option-btn-group';
  [{ label: falseLabel || '通常', val: false }, { label: label, val: true }].forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (isOn === opt.val ? ' selected' : '');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => onChange(opt.val));
    wrap.appendChild(btn);
  });
  section.appendChild(wrap);
  return section;
}

function makeOptionGroup(title, options, key, selected, onChange) {
  const section = document.createElement('div');
  section.className = 'option-section';
  const label = document.createElement('p');
  label.className = 'option-label';
  label.textContent = title;
  section.appendChild(label);
  const btnWrap = document.createElement('div');
  btnWrap.className = 'option-btn-group';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (selected === opt.value ? ' selected' : '');
    btn.textContent = opt.label;
    btn.dataset.key = key;
    btn.dataset.value = opt.value;
    btn.addEventListener('click', () => {
      btnWrap.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onChange(opt.value);
    });
    btnWrap.appendChild(btn);
  });
  section.appendChild(btnWrap);
  return section;
}

function checkAutoConfirm() {
  const menu = state.selectedMenu;
  // コラボ・なすおろし・きのこは確認ボタンで確定（autoConfirmしない）
  if (menu.category_large === 'コラボ' || menu.category_large === 'なすおろし・きのこ') return;
  // 麺種が必要か
  const needNoodle = menu.has_soba && menu.has_kishimen;
  // スタイルが必要か
  const needStyle = menu.has_kake && menu.has_zaru;
  // 温度が必要か
  const needTemp = menu.has_temp;

  if (needNoodle && !state.selectedNoodle) return;
  if (needStyle  && !state.selectedStyle)  return;
  if (needTemp   && !state.selectedTemp)   return;

  // 固定値の解決
  if (!needNoodle) {
    state.selectedNoodle = menu.has_soba ? 'soba' : (menu.has_kishimen ? 'kishimen' : null);
  }
  if (!needStyle) {
    if (menu.has_kake) state.selectedStyle = 'kake';
    else if (menu.has_zaru) state.selectedStyle = 'zaru';
    else state.selectedStyle = null;
  }
  if (!needTemp) state.selectedTemp = null;

  autoConfirm();
}

function autoConfirm() {
  const pattern = findPattern();
  state.currentPattern = pattern;
  renderResult(state.selectedMenu, pattern);
  showScreen('result');
}

/* ============================================================
   パターン検索
   ============================================================ */
function findPattern() {
  const { selectedMenu: menu, selectedNoodle, selectedStyle, selectedTemp } = state;
  return state.outputPatterns.find(p =>
    p.menu_id === menu.menu_id &&
    p.noodle_type === selectedNoodle &&
    p.style === selectedStyle &&
    p.temperature === selectedTemp
  ) || null;
}

/* ============================================================
   カスター計算（動的ルールベース）
   ============================================================ */
function computeCasters(menu, pattern) {
  if (!menu) return { bonSize: null, items: [] };

  const name  = menu.name;
  const cat   = menu.category_internal;
  const style = pattern ? pattern.style : null;
  const isDon   = cat === 'donset' || cat === 'mini_donset' || cat === 'mini_don_single';
  const isGohan = cat === 'gohan';
  const isZaru  = style === 'zaru';
  const isKake  = style === 'kake' || isDon;

  // ── 盆サイズ ──
  let bonSize = null;
  if (name === '天ざる' || name === '上天ざる' ||
      name === 'おにぎりセット' || name.includes('おにぎりざる') ||
      name.includes('御膳') || name === '夫婦膳' || name === '二重膳') {
    bonSize = '大盆';
  } else if (cat === 'mini_don_single' ||
             name === '天丼セット' ||
             name === '天かけ' || name === '上天かけ' ||
             name === 'からあげ弁当' ||
             name.includes('せいろ') || name.includes('セイロ')) {
    bonSize = '中盆';
  } else if (cat === 'noodle' ||
             ((cat === 'donset' || cat === 'mini_donset') && style === 'kake') ||
             cat === 'bento') {
    bonSize = '小盆';
  }

  // ── カスターアイテム ──
  const items = [];

  // つけもの: 丼系・ごはん系
  if (isDon || isGohan) items.push('つけもの');

  // 蓋: 丼系すべて（おろしカツとろ除外）
  if (isDon && !(name.includes('おろしカツ') && name.includes('とろ'))) {
    items.push('蓋');
  }

  // 揚げ玉: 親子丼・玉子丼・カレー丼系（天ぷら入り除外）
  if (isDon) {
    const hasTen = name.includes('天') && cat !== 'mini_don_single';
    if ((name.includes('親子') || name.includes('玉子') || name.includes('カレー')) && !hasTen) {
      items.push('揚げ玉');
    }
  }

  // 黒レンゲ判定: 都系・じゃこ天・カレー・田舎・大名
  const needsKuroRenge = name.startsWith('都') || name.includes('じゃこ天') ||
                          name.includes('カレー') || name.includes('田舎') ||
                          name === '大名';

  // レンゲ / 黒レンゲ: かけ系・丼系（よくばり・ミニ天丼・天丼ざる・おろしカツ除外）
  const excludeRenge = name.includes('よくばり') ||
                       name === 'ミニ天丼' ||
                       (name === '天丼セット' && isZaru) ||
                       name.includes('おろしカツ');
  if (isKake && !excludeRenge) {
    items.push(needsKuroRenge ? '黒レンゲ' : 'レンゲ');
  }

  // こしょう: 肉系・鳥系（漢字・ひらがな両対応）
  if (name.includes('肉') || name.includes('鳥') ||
      name.startsWith('とり') || name.startsWith('かも')) items.push('こしょう');

  // 七味: 鳥（梅）・きのこ（ゆず）
  if ((name.includes('鳥') && name.includes('梅')) ||
      (name.includes('きのこ') && name.includes('ゆず'))) {
    items.push('七味');
  }

  return { bonSize, items };
}

/* ============================================================
   結果表示
   ============================================================ */

// 大/弁当/定食を適用したtoshi/denpyoを返す
function resolveNotation(menu, pattern) {
  if (!pattern) return { toshi: null, denpyo: null };
  let toshi = pattern.toshi;
  let denpyo = pattern.denpyo;

  // 弁当/定食モード（麺メニューの場合）
  if (state.selectedBento && menu.category_internal === 'noodle') {
    const isKishi = state.selectedNoodle === 'kishimen';
    const bentoDenpyo = isKishi ? (menu.bento_denpyo_kishi || menu.bento_denpyo) : menu.bento_denpyo;
    if (bentoDenpyo) {
      denpyo = bentoDenpyo;
      const isZaru = state.selectedStyle === 'zaru';
      const kishiSuffix = isKishi ? 'きし' : '';
      toshi = isZaru ? `ざる${toshi}べんとう${kishiSuffix}` : `${toshi}べんとう${kishiSuffix}`;
    }
  }

  // 弁当/定食モード（弁当・御膳メニューはdenpyoの末尾「弁」を「定」に変える）
  if (state.selectedBento === 'teishoku') {
    denpyo = denpyo.replace(/弁$/, '定');
    toshi = toshi.replace(/べんとう/, 'ていしょく');
  }

  // コラボ・なすおろし・きのこ きしめん
  if (state.selectedKishi && (menu.category_large === 'コラボ' || menu.category_large === 'なすおろし・きのこ')) {
    toshi  = toshi  + 'きし';
    denpyo = denpyo + 'き';
  }

  // なすおろし・きのこ 大盛
  if (state.selectedIppinBig && menu.category_large === 'なすおろし・きのこ') {
    toshi  = toshi  + '大（だい）';
    denpyo = denpyo + '大';
  }

  // 大オプション（麺単品）
  if (state.selectedBig) {
    toshi = toshi + '大（だい）';
    denpyo = denpyo + '大';
  }

  // 丼セット 麺大・ご飯大
  if (state.selectedMenBig) {
    toshi = toshi + '大（だい）';
    denpyo = denpyo + '大';
  }
  if (state.selectedMeshiBig) {
    toshi = toshi + 'ライス大（らいすだい）';
    denpyo = denpyo + 'ライス大';
  }

  return { toshi, denpyo };
}

function renderResult(menu, pattern) {
  const parts = [menu.name];
  if (state.selectedNoodle === 'kishimen') parts.push('きしめん');
  if (state.selectedKishi) parts.push('きしめん');
  if (state.selectedStyle === 'kake') parts.push('かけ');
  if (state.selectedStyle === 'zaru') parts.push('ざる');
  if (state.selectedTemp === 'hot') parts.push('温');
  if (state.selectedTemp === 'cold') parts.push('冷');
  if (state.selectedBig) parts.push('大');
  if (state.selectedIppinBig) parts.push('大');
  if (state.selectedBento === 'bento') parts.push('弁当');
  if (state.selectedBento === 'teishoku') parts.push('定食');
  document.getElementById('result-summary').textContent = parts.join(' / ');

  const container = document.getElementById('result-content');
  container.innerHTML = '';

  const addCartBtn = document.getElementById('btn-add-cart');
  if (!pattern) {
    container.innerHTML = `
      <div class="not-registered-card">
        <p class="not-registered-title">追加されていません</p>
        <p class="not-registered-sub">通し方・伝票はまだ登録されていません</p>
      </div>`;
    if (addCartBtn) addCartBtn.style.display = '';  // パターンなしでも追加可能
    return;
  }
  if (addCartBtn) addCartBtn.style.display = '';

  const { toshi, denpyo } = resolveNotation(menu, pattern);

  // ① 通し方
  const toshiCard = mkCard('通し方（キッチンへの声かけ）');
  toshiCard.appendChild(mkEl('p', 'result-toshi', toshi));
  container.appendChild(toshiCard);

  // ② 伝票
  const denpyoCard = mkCard('伝票の書き方');
  denpyoCard.appendChild(mkEl('p', 'result-denpyo', denpyo));
  container.appendChild(denpyoCard);

  // ③ カスター（動的ルールベース）
  const { bonSize, items: casterItems } = computeCasters(menu, pattern);
  if (bonSize || casterItems.length > 0) {
    const casterCard = mkCard('カスターセット');
    if (bonSize) {
      const bonEl = document.createElement('p');
      bonEl.className = 'caster-bon';
      bonEl.textContent = `盆: ${bonSize}`;
      casterCard.appendChild(bonEl);
    }
    if (casterItems.length > 0) {
      const wrap = document.createElement('div');
      wrap.className = 'caster-items';
      casterItems.forEach(item => {
        const span = document.createElement('span');
        span.className = 'caster-item';
        span.textContent = item;
        wrap.appendChild(span);
      });
      casterCard.appendChild(wrap);
    }
    container.appendChild(casterCard);
  }

  // ④ 注意事項
  if (pattern.notes) {
    const notesDiv = document.createElement('div');
    notesDiv.className = 'result-notes';
    notesDiv.innerHTML = `<p class="result-notes-label">⚠️ 注意事項</p>
                          <p class="result-notes-text">${pattern.notes}</p>`;
    container.appendChild(notesDiv);
  }

  // 料金
  if (menu.price != null) {
    const priceCard = mkCard('料金');
    priceCard.appendChild(mkEl('p', 'result-price', `¥${menu.price.toLocaleString()}`));
    container.appendChild(priceCard);
  }

  // 変えそばセクション（丼セット・弁当・おにぎりセット）
  const kaesobaPrefix = state.kaesobaRules?.menu_prefixes?.[menu.menu_id];
  if (kaesobaPrefix && state.selectedStyle === 'kake') {
    container.appendChild(buildKaesobaSection(menu.menu_id));
  }

  updateAddCartButton();
}

function mkCard(labelText) {
  const card = document.createElement('div');
  card.className = 'result-card';
  const lbl = document.createElement('p');
  lbl.className = 'result-card-label';
  lbl.textContent = labelText;
  card.appendChild(lbl);
  return card;
}

function mkEl(tag, cls, text) {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = text;
  return el;
}

/* ============================================================
   変えそば
   ============================================================ */
function buildKaesobaResult(menuId, topping, isKishi) {
  const prefix = state.kaesobaRules?.menu_prefixes?.[menuId];
  if (!prefix) return null;
  const useKishi = isKishi && (topping.category === 'collab' || topping.category === 'nasu');
  const toshiSuffix  = useKishi ? 'きし' : '';
  const denpyoSuffix = useKishi ? 'き'   : '';
  if (prefix.format === 'bento') {
    if (topping.is_ten) return { toshi: `べんてん${toshiSuffix}`, denpyo: `天弁${denpyoSuffix}` };
    return { toshi: `べん${topping.toshi}${toshiSuffix}`, denpyo: `${topping.denpyo}弁${denpyoSuffix}` };
  }
  if (topping.is_ten) {
    return { toshi: `${prefix.toshi}せてん${toshiSuffix}`, denpyo: `${prefix.denpyo}セ天${denpyoSuffix}` };
  }
  return { toshi: `${prefix.toshi}${topping.toshi}せ${toshiSuffix}`, denpyo: `${prefix.denpyo}${topping.denpyo}セ${denpyoSuffix}` };
}

function buildKaesobaSection(menuId) {
  const section = document.createElement('div');
  section.className = 'kaesoba-section';
  const title = document.createElement('p');
  title.className = 'kaesoba-section-title';
  title.textContent = '変えそば';
  section.appendChild(title);

  const resultPanel = document.createElement('div');
  resultPanel.className = 'kaesoba-result';
  resultPanel.style.display = 'none';

  // カテゴリグループ定義
  const groups = [
    { key: 'noodle', label: '麺メニュー',        hasKishi: false },
    { key: 'collab', label: 'コラボ',             hasKishi: true  },
    { key: 'nasu',   label: 'なすおろし・きのこ', hasKishi: true  },
  ];
  const allBtns = [];
  let kishiSelector = null; // コラボ・なす用そば/きしめんセレクター

  groups.forEach(grp => {
    const toppings = (state.kaesobaRules.toppings || [])
      .filter(t => t.kaesoba_price && t.category === grp.key)
      .sort((a,b) => a.order - b.order);
    if (toppings.length === 0) return;

    const grpLabel = document.createElement('p');
    grpLabel.className = 'kaesoba-group-label';
    grpLabel.textContent = grp.label;
    section.appendChild(grpLabel);

    // コラボ・なすの最初のグループにそば/きしめんセレクターを挿入
    if (grp.hasKishi && !kishiSelector) {
      kishiSelector = document.createElement('div');
      kishiSelector.className = 'kaesoba-kishi-selector';
      ['そば', 'きしめん'].forEach((label, i) => {
        const btn = document.createElement('button');
        btn.className = 'kaesoba-kishi-btn' + (i === 0 ? ' selected' : '');
        btn.textContent = label;
        btn.dataset.kishi = i === 1 ? 'true' : 'false';
        btn.addEventListener('click', () => {
          kishiSelector.querySelectorAll('.kaesoba-kishi-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          state.selectedKaesobaKishi = (btn.dataset.kishi === 'true');
          // 選択中のコラボ・なすトッピングがあれば結果を再計算
          if (state.selectedKaesobaTopping &&
              (state.selectedKaesobaTopping.category === 'collab' || state.selectedKaesobaTopping.category === 'nasu')) {
            onSelectKaesobaTopping(null, null, menuId, state.selectedKaesobaTopping, resultPanel);
          }
        });
        kishiSelector.appendChild(btn);
      });
      section.appendChild(kishiSelector);
    }

    const grid = document.createElement('div');
    grid.className = 'kaesoba-grid';

    toppings.forEach(topping => {
      const btn = document.createElement('button');
      btn.className = 'kaesoba-topping-btn';
      btn.innerHTML = `${topping.name}<span class="kaesoba-btn-price">+¥${topping.kaesoba_price}</span>`;
      btn.addEventListener('click', () => {
        const wasSelected = btn.classList.contains('selected');
        allBtns.forEach(b => b.classList.remove('selected'));
        if (wasSelected) {
          state.selectedKaesobaTopping = null;
          resultPanel.style.display = 'none';
          updateAddCartButton();
          return;
        }
        btn.classList.add('selected');
        onSelectKaesobaTopping(btn, null, menuId, topping, resultPanel);
      });
      allBtns.push(btn);
      grid.appendChild(btn);
    });
    section.appendChild(grid);
  });

  section.appendChild(resultPanel);
  return section;
}

function onSelectKaesobaTopping(btn, _grid, menuId, topping, resultPanel) {
  state.selectedKaesobaTopping = topping;
  const result = buildKaesobaResult(menuId, topping, state.selectedKaesobaKishi);
  if (!result) return;

  resultPanel.innerHTML = '';
  resultPanel.style.display = 'flex';

  const tCard = document.createElement('div');
  tCard.className = 'kaesoba-result-card';
  tCard.innerHTML = `<p class="kaesoba-result-label">変えそば 通し方</p>
                     <p class="kaesoba-result-toshi">${result.toshi}</p>`;
  const dCard = document.createElement('div');
  dCard.className = 'kaesoba-result-card';
  dCard.innerHTML = `<p class="kaesoba-result-label">変えそば 伝票</p>
                     <p class="kaesoba-result-denpyo">${result.denpyo}</p>`;
  resultPanel.appendChild(tCard);
  resultPanel.appendChild(dCard);

  const basePrice = state.selectedMenu?.price;
  if (basePrice != null && topping.kaesoba_price != null) {
    const total = basePrice + topping.kaesoba_price;
    const pCard = document.createElement('div');
    pCard.className = 'kaesoba-result-card kaesoba-price-card';
    pCard.innerHTML = `<p class="kaesoba-result-label">変えそば後の料金</p>
                       <p class="kaesoba-result-price">¥${basePrice.toLocaleString()} + ¥${topping.kaesoba_price.toLocaleString()} = <strong>¥${total.toLocaleString()}</strong></p>`;
    resultPanel.appendChild(pCard);
  }
  updateAddCartButton();
}

function updateAddCartButton() {
  const btn = document.getElementById('btn-add-cart');
  if (!btn) return;
  btn.textContent = state.selectedKaesobaTopping
    ? `変えそば（${state.selectedKaesobaTopping.name}）をカートに追加`
    : '+ カートに追加';
}

/* ============================================================
   カート
   ============================================================ */
function addToCart() {
  const menu = state.selectedMenu;
  if (!menu) return;
  const pattern = state.currentPattern;

  const labelParts = [menu.name];
  if (state.selectedNoodle === 'kishimen') labelParts.push('きしめん');
  if (state.selectedKishi) labelParts.push('きしめん');
  if (state.selectedStyle === 'kake') labelParts.push('かけ');
  if (state.selectedStyle === 'zaru') labelParts.push('ざる');
  if (state.selectedTemp === 'hot') labelParts.push('温');
  if (state.selectedTemp === 'cold') labelParts.push('冷');
  if (state.selectedBig) labelParts.push('大');
  if (state.selectedIppinBig) labelParts.push('大');
  if (state.selectedBento === 'bento') labelParts.push('弁当');
  if (state.selectedBento === 'teishoku') labelParts.push('定食');

  let toshi = null, denpyo = null, patternId = null;

  if (pattern) {
    const resolved = resolveNotation(menu, pattern);
    toshi = resolved.toshi;
    denpyo = resolved.denpyo;
    patternId = pattern.pattern_id;

    if (state.selectedKaesobaTopping) {
      const result = buildKaesobaResult(menu.menu_id, state.selectedKaesobaTopping, state.selectedKaesobaKishi);
      if (result) {
        toshi = result.toshi;
        denpyo = result.denpyo;
        labelParts.push(`変えそば：${state.selectedKaesobaTopping.name}`);
      }
    }
    if (state.selectedDonKake) {
      labelParts.push(`かけ：${state.selectedDonKake.name}`);
    }
  }

  const label = labelParts.join(' / ');

  // 同一条件なら数量加算
  const key = toshi && denpyo ? `${toshi}||${denpyo}` : `no-pat||${menu.menu_id}||${label}`;
  const existing = state.cart.find(c => c._key === key);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      cartId: ++state.cartIdCounter,
      menuId: menu.menu_id,
      label, toshi, denpyo, patternId,
      quantity: 1,
      _key: key,
    });
  }

  // 履歴に追加（直近5件）
  if (pattern) addHistory({ menuId: menu.menu_id, label, toshi, denpyo, patternId });

  updateCartBadge();
  showToast(`「${menu.name}」をカートに追加しました`);
}

function updateCartBadge() {
  const total = state.cart.reduce((s, c) => s + c.quantity, 0);
  document.getElementById('cart-badge').textContent = total;
}

function openCart() {
  renderCartModal();
  document.getElementById('cart-modal').style.display = 'flex';
}

function closeCart() {
  document.getElementById('cart-modal').style.display = 'none';
}

function buildCartSummary() {
  let kishiCount = 0, katsuCount = 0, miniKatsuCount = 0;
  let karaageBento = 0, karaageTeishoku = 0, karaageDai = 0, karaageSho = 0, karaageDon = 0;

  state.cart.forEach(item => {
    const lbl = item.label;
    const q   = item.quantity;
    const m   = state.menus.find(m => m.menu_id === item.menuId);
    if (!m) return;
    const name = m.name;

    // きしめん
    if (lbl.includes('きしめん')) kishiCount += q;

    // ミニかつ（ミニカツ丼セット）
    if (name === 'ミニカツ丼セット') { miniKatsuCount += q; return; }

    // かつ系（カツ丼セット・カツ丼・おろしカツ等）
    if ((name.includes('カツ') || name.includes('かつ')) &&
        !name.includes('ミニカツ') && !name.includes('からあげ')) {
      katsuCount += q;
    }

    // からあげ系（名前にからあげが含まれるすべて）
    if (name.includes('からあげ')) {
      if (name === 'からあげ（大）') karaageDai += q;
      else if (name === 'からあげ（小）') karaageSho += q;
      else if (name.includes('弁当') || name.includes('弁')) {
        if (lbl.includes('定食')) karaageTeishoku += q;
        else karaageBento += q;
      }
      else karaageDon += q; // からあげ丼・からあげ丼セット・天入からあげ等
    }
  });

  const hints = [];
  if (kishiCount > 0)    hints.push(`きしめん ${kishiCount}杯`);
  if (miniKatsuCount > 0) hints.push(`ミニかつ ${miniKatsuCount}枚`);
  if (katsuCount > 0)    hints.push(`かつ ${katsuCount}枚`);
  if (karaageBento > 0)  hints.push(`からあげ弁当`);
  if (karaageTeishoku > 0) hints.push(`からあげ定食`);
  if (karaageDai > 0)   hints.push(`からあげ大`);
  if (karaageSho > 0)   hints.push(`からあげ小`);
  if (karaageDon > 0)   hints.push(`からあげ丼 ${karaageDon}点`);

  if (hints.length === 0) return null;
  const div = document.createElement('div');
  div.className = 'cart-summary';
  div.textContent = hints.join('　');
  return div;
}

function renderCartModal() {
  const total = state.cart.reduce((s, c) => s + c.quantity, 0);
  document.getElementById('cart-modal-title').textContent = `カート（${total}件）`;

  const body = document.getElementById('cart-modal-body');
  body.innerHTML = '';

  if (state.cart.length === 0) {
    body.innerHTML = '<p class="no-result">カートは空です</p>';
    document.getElementById('cart-modal-footer').innerHTML = '';
    return;
  }

  // サマリー表示
  const summary = buildCartSummary();
  if (summary) body.appendChild(summary);

  let totalPrice = 0;
  state.cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    const notation = item.toshi && item.denpyo
      ? `${item.denpyo} / ${item.toshi}`
      : '（通し方未登録）';
    const menuData = state.menus.find(m => m.menu_id === item.menuId);
    const unitPrice = menuData?.price ?? null;
    const priceStr = unitPrice != null ? `¥${unitPrice.toLocaleString()}` : '';
    if (unitPrice != null) totalPrice += unitPrice * item.quantity;
    row.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-label">${item.label}</span>
        <span class="cart-item-notation">${notation}</span>
        ${priceStr ? `<span class="cart-item-price">${priceStr}</span>` : ''}
      </div>
      <div class="cart-item-qty">
        <button onclick="changeQty(${item.cartId}, -1)">－</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty(${item.cartId}, +1)">＋</button>
      </div>`;
    body.appendChild(row);
  });

  // カスター集計（動的ルールベース）
  const allCasters = new Set();
  state.cart.forEach(item => {
    const menu = state.menus.find(m => m.menu_id === item.menuId);
    const p = state.outputPatterns.find(p => p.pattern_id === item.patternId);
    if (menu && p) {
      const { items } = computeCasters(menu, p);
      items.forEach(i => allCasters.add(i));
    }
  });

  const footer = document.getElementById('cart-modal-footer');
  const casterHtml = allCasters.size > 0
    ? `<div class="cart-caster">カスター: ${[...allCasters].join('・')}</div>`
    : '';
  const totalHtml = totalPrice > 0
    ? `<div class="cart-total">合計金額: <strong>¥${totalPrice.toLocaleString()}</strong></div>`
    : '';
  footer.innerHTML = `
    ${casterHtml}
    ${totalHtml}
    <div class="cart-footer-btns">
      <button class="btn-cart-clear" onclick="clearCart()">クリア</button>
      <button class="btn-cart-confirm" onclick="confirmOrder()">注文確定</button>
    </div>`;
}

function changeQty(cartId, delta) {
  const item = state.cart.find(c => c.cartId === cartId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter(c => c.cartId !== cartId);
  updateCartBadge();
  renderCartModal();
}

function clearCart() {
  state.cart = [];
  updateCartBadge();
  closeCart();
}

function confirmOrder() {
  state.cart = [];
  updateCartBadge();
  closeCart();
  showToast('注文を確定しました');
}

/* ============================================================
   履歴
   ============================================================ */
function addHistory(entry) {
  state.history = state.history.filter(h => h.toshi !== entry.toshi || h.denpyo !== entry.denpyo);
  state.history.unshift(entry);
  if (state.history.length > 5) state.history.pop();
  renderHistory();
}

function renderHistory() {
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');
  if (state.history.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  list.innerHTML = '';
  state.history.forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'history-btn';
    btn.innerHTML = `<span class="history-label">${h.label}</span>
                     <span class="history-notation">${h.denpyo}</span>`;
    btn.addEventListener('click', () => {
      const menu = state.menus.find(m => m.menu_id === h.menuId);
      const pattern = state.outputPatterns.find(p => p.pattern_id === h.patternId);
      if (menu && pattern) {
        state.selectedMenu = menu;
        state.currentPattern = pattern;
        state.selectedKaesobaTopping = null;
        renderResult(menu, pattern);
        showScreen('result');
      }
    });
    list.appendChild(btn);
  });
}

/* ============================================================
   トースト
   ============================================================ */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ============================================================
   起動
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);
