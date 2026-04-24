import sys, json, openpyxl
sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(r"C:\Users\happy\tmp_menu.xlsx")

def get_rows(sn):
    ws = wb[sn]
    d = list(ws.iter_rows(values_only=True))
    h = d[0]
    return [dict(zip(h, r)) for r in d[1:] if any(v for v in r if v is not None)]

def nv(v):
    if v is None or str(v).strip() in ('-', '－', ''):
        return None
    return str(v).strip()

def to_int(v):
    try:
        return int(str(v).replace(',', ''))
    except:
        return None

menus = []
patterns = []
mid = 1
pid = 1

TEMP_MENUS = {
    'おろし', '磯おろし', '天おろし', '天上おろし', '野菜天おろし',
    'じゃこ天おろし', '満足おろし', '冷・温きつね', '山かけ',
    '花鴨せいろ', '鴨せいろ', '肉せいろ', '鳥せいろ'
}
ZARU_MENUS = {'ざる', 'ざる小', '盛合', '天ざる', '上天ざる', '割子'}
KAKE_MENUS = {
    'かけ', '天かけ', '上天かけ', '大名', '釜あげ', '天ぷら', '天上', '天とじ',
    '玉子', '月見', 'きつね', 'じゃこ天', '鳥なん', '肉', '鴨なん', 'おかめ',
    '田舎', 'にしん', '田舎にしん', '都', '満足', '山菜', '盛合',
    '花鴨せいろ', '鴨せいろ', '肉せいろ', '鳥せいろ',
    '鳥カレー', '肉カレー', '鴨カレー', '天とじカレー', 'とろそ', '肉つけ(広島)'
}


def add_menu(name, cat_d, cat_i, price=None, has_soba=True, has_kishi=False,
             has_kake=False, has_zaru=False, has_temp=False, season=None, notes=None, order=0):
    global mid
    menu_id = f"MENU_{mid:03d}"
    menus.append({
        "menu_id": menu_id,
        "name": name,
        "category_large": cat_d,
        "category_internal": cat_i,
        "has_soba": has_soba,
        "has_kishimen": has_kishi,
        "has_kake": has_kake,
        "has_zaru": has_zaru,
        "has_temp": has_temp,
        "price": price,
        "season": season,
        "notes": nv(notes),
        "display_order": order,
        "is_active": True,
    })
    mid += 1
    return menu_id


def add_pat(menu_id, noodle_type, style, temperature, toshi, denpyo, cst='CST_A', notes=None):
    global pid
    if not toshi or not denpyo:
        return
    patterns.append({
        "pattern_id": f"PAT_{pid:03d}",
        "menu_id": menu_id,
        "noodle_type": noodle_type,
        "style": style,
        "temperature": temperature,
        "toshi": toshi,
        "denpyo": denpyo,
        "caster_set_id": cst,
        "notes": nv(notes),
    })
    pid += 1


# ── 麺単品 ──
soba_rows = get_rows('麺単品_基本')
kishi_map = {r['商品名']: r for r in get_rows('麺単品_きしめん')}
order = 1
for r in soba_rows:
    name = r['商品名']
    price = to_int(r.get('価格'))
    has_temp = name in TEMP_MENUS
    has_zaru = name in ZARU_MENUS
    has_kake = name in KAKE_MENUS or has_temp
    has_kishi = name in kishi_map
    m = add_menu(name, '麺', 'noodle', price, True, has_kishi, has_kake, has_zaru, has_temp, order=order)
    order += 1
    t = nv(r.get('通し方'))
    d = nv(r.get('書き方'))
    if has_temp and t and d:
        add_pat(m, 'soba', 'kake', 'hot',
                t.replace('あつ・ひや ', 'あつ'), d.replace('温・冷 ', '温'), 'CST_A')
        add_pat(m, 'soba', 'kake', 'cold',
                t.replace('あつ・ひや ', 'ひや'), d.replace('温・冷 ', '冷'), 'CST_A')
    else:
        if has_kake:
            add_pat(m, 'soba', 'kake', None, t, d, 'CST_A')
        if has_zaru:
            add_pat(m, 'soba', 'zaru', None, t, d, 'CST_A')
    if has_kishi and name in kishi_map:
        kr = kishi_map[name]
        kt = nv(kr.get('通し方'))
        kd = nv(kr.get('書き方'))
        if has_temp and kt and kd:
            add_pat(m, 'kishimen', 'kake', 'hot',
                    kt.replace('あつ・ひや ', 'あつ'), kd.replace('温・冷 ', '温'), 'CST_A')
            add_pat(m, 'kishimen', 'kake', 'cold',
                    kt.replace('あつ・ひや ', 'ひや'), kd.replace('温・冷 ', '冷'), 'CST_A')
        else:
            if has_kake:
                add_pat(m, 'kishimen', 'kake', None, kt, kd, 'CST_A')
            if has_zaru:
                add_pat(m, 'kishimen', 'zaru', None, kt, kd, 'CST_A')

# ── ミニ丼セット ──
mini_kishi = {r['商品名']: r for r in get_rows('ミニ丼セット_きしめん')}
for r in get_rows('ミニ丼セット_基本'):
    name = r['商品名']
    tk = nv(r.get('通し方(かけ)'))
    dk = nv(r.get('書き方(かけ)'))
    tz = nv(r.get('通し方(ざる)'))
    dz = nv(r.get('書き方(ざる)'))
    has_kishi = name in mini_kishi
    m = add_menu(name, 'セット', 'mini_donset', to_int(r.get('価格')),
                 True, has_kishi, bool(tk), bool(tz), order=order)
    order += 1
    if tk:
        add_pat(m, 'soba', 'kake', None, tk, dk, 'CST_B')
    if tz:
        add_pat(m, 'soba', 'zaru', None, tz, dz, 'CST_B')
    if has_kishi:
        kr = mini_kishi[name]
        ktk = nv(kr.get('通し方(かけ)'))
        kdk = nv(kr.get('書き方(かけ)'))
        ktz = nv(kr.get('通し方(ざる)'))
        kdz = nv(kr.get('書き方(ざる)'))
        if ktk:
            add_pat(m, 'kishimen', 'kake', None, ktk, kdk, 'CST_B')
        if ktz:
            add_pat(m, 'kishimen', 'zaru', None, ktz, kdz, 'CST_B')

# ── ミニ丼単品 ──
for r in get_rows('ミニ丼単品'):
    name = r['商品名']
    m = add_menu(name, 'セット', 'mini_don_single', to_int(r.get('価格')), False, order=order)
    order += 1
    add_pat(m, None, None, None, nv(r.get('通し方')), nv(r.get('書き方')), 'CST_B')

# ── 丼ぶりセット ──
don_kishi = {r['商品名']: r for r in get_rows('丼ぶりセット_きしめん')}
for r in get_rows('丼ぶりセット_基本'):
    name = r['商品名']
    tk = nv(r.get('通し方(かけ)'))
    dk = nv(r.get('書き方(かけ)'))
    tz = nv(r.get('通し方(ざる)'))
    dz = nv(r.get('書き方(ざる)'))
    has_kishi = name in don_kishi
    m = add_menu(name, 'セット', 'donset', to_int(r.get('価格')),
                 True, has_kishi, bool(tk), bool(tz), order=order)
    order += 1
    if tk:
        add_pat(m, 'soba', 'kake', None, tk, dk, 'CST_C')
    if tz:
        add_pat(m, 'soba', 'zaru', None, tz, dz, 'CST_C')
    if has_kishi:
        kr = don_kishi[name]
        ktk = nv(kr.get('通し方(かけ)'))
        kdk = nv(kr.get('書き方(かけ)'))
        ktz = nv(kr.get('通し方(ざる)'))
        kdz = nv(kr.get('書き方(ざる)'))
        if ktk:
            add_pat(m, 'kishimen', 'kake', None, ktk, kdk, 'CST_C')
        if ktz:
            add_pat(m, 'kishimen', 'zaru', None, ktz, kdz, 'CST_C')

# ── 弁当・御膳 ──
for r in get_rows('弁当_御膳'):
    name = r['商品名']
    tk = nv(r.get('通し方(かけ)'))
    dk = nv(r.get('書き方(かけ)'))
    tz = nv(r.get('通し方(ざる)'))
    dz = nv(r.get('書き方(ざる)'))
    m = add_menu(name, '弁当・御膳', 'bento', to_int(r.get('価格')),
                 False, False, bool(tk), bool(tz), order=order)
    order += 1
    if tk:
        add_pat(m, None, 'kake', None, tk, dk, 'CST_D')
    if tz:
        add_pat(m, None, 'zaru', None, tz, dz, 'CST_D')

# ── 釜飯 ──
for r in get_rows('釜飯'):
    name = r['商品名']
    m = add_menu(name, 'その他', 'kamameshi', to_int(r.get('単品(吸い物付)')), False, order=order)
    order += 1
    add_pat(m, None, None, None, nv(r.get('通し方')), nv(r.get('書き方')), 'CST_D')

# ── 鍋 ──
for r in get_rows('鍋'):
    name = r['商品名']
    m = add_menu(name, 'その他', 'nabe', to_int(r.get('価格')), False, order=order)
    order += 1
    add_pat(m, None, None, None, nv(r.get('通し方')), nv(r.get('書き方')), 'CST_D')

# ── 一品 ──
for r in get_rows('単品付物'):
    name = r['商品名']
    m = add_menu(name, '一品', 'ippin_side', has_soba=False, order=order)
    order += 1
    add_pat(m, None, None, None, nv(r.get('通し方')), nv(r.get('書き方')), 'CST_A')

for r in get_rows('ご飯_量変更'):
    name = r['商品名']
    m = add_menu(name, '一品', 'gohan', has_soba=False, order=order)
    order += 1
    add_pat(m, None, None, None, nv(r.get('通し方')), nv(r.get('書き方')), 'CST_A')

for r in get_rows('温冷_きのこ_そいろ'):
    name = r['商品名']
    m = add_menu(name, '一品', 'ippin_hot', has_soba=False, order=order)
    order += 1
    add_pat(m, None, None, None, nv(r.get('通し方')), nv(r.get('書き方')), 'CST_A')

with open('data/menus.json', 'w', encoding='utf-8') as f:
    json.dump(menus, f, ensure_ascii=False, indent=2)
with open('data/output_patterns.json', 'w', encoding='utf-8') as f:
    json.dump(patterns, f, ensure_ascii=False, indent=2)

patted = {p['menu_id'] for p in patterns}
missing = [m for m in menus if m['menu_id'] not in patted]
print(f"menus: {len(menus)}件, patterns: {len(patterns)}件")
if missing:
    print(f"パターン未登録:")
    for m in missing:
        print(f"  {m['menu_id']} {m['name']}")
else:
    print("全メニューにパターン登録済み")
print("完了")
