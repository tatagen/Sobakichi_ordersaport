import json

with open('../menu_raw.json', encoding='utf-8') as f:
    rows = json.load(f)

menus    = []
patterns = []
mid_cnt  = 1
pid_cnt  = 1

def new_mid():
    global mid_cnt
    v = f"MENU_{mid_cnt:03d}"
    mid_cnt += 1
    return v

def new_pid():
    global pid_cnt
    v = f"PAT_{pid_cnt:03d}"
    pid_cnt += 1
    return v

def val(v):
    if v is None or str(v).strip() == '-':
        return None
    s = str(v).strip()
    return s if s else None

def has_temp_menu(name):
    return any(k in name for k in ['おろし', '山かけ', 'せいろ', '山里', 'きのこそいろ'])

def get_style(name):
    for k in ['ざる', '割子', '夏割子']:
        if k in name:
            return 'zaru'
    return 'kake'

def expand_denpyo(raw, temp):
    if raw is None:
        return None
    r = raw
    if '温・冷 ' in r:
        r = r.replace('温・冷 ', '温' if temp == 'hot' else '冷')
    elif '温・冷' in r:
        r = r.replace('温・冷', '温' if temp == 'hot' else '冷')
    return r

def expand_toshi(raw, temp):
    if raw is None:
        return None
    r = raw
    if 'あつ・ひや ' in r:
        r = r.replace('あつ・ひや ', 'あつ' if temp == 'hot' else 'ひや')
    elif 'あつ・ひや' in r:
        r = r.replace('あつ・ひや', 'あつ' if temp == 'hot' else 'ひや')
    return r

def get_category(name, style):
    if 'カレー' in name:
        return '麺類', 'カレー系'
    if 'なべ' in name or '鍋' in name:
        return '麺類', '鍋系'
    if any(k in name for k in ['おろし', '山かけ', '山里', 'きのこそいろ']):
        return '麺類', 'おろし・山かけ系'
    if any(k in name for k in ['せいろ', '夏割子', '割子']):
        return '麺類', 'せいろ・割子系'
    if style == 'zaru':
        return '麺類', 'ざる系'
    return '麺類', 'かけ系'

SKIP_NAMES = {
    '単品名', '書き方', '通し方', '書き方（温・冷）', '通し方（あつ・ひや）',
    '弁当 書き方', 'ミニ天丼セット 書き方', 'ミニセット 書き方', '通し方（基本）'
}

DO_ORDER = 0

# ---- 単品処理（cols 0-4: そば / cols 6-10: きしめん） ----
for row in rows:
    soba_name   = val(row[0])
    soba_dep    = val(row[1])
    soba_toshi  = val(row[2])
    kishi_dep   = val(row[7]) if len(row) > 7 else None
    kishi_toshi = val(row[8]) if len(row) > 8 else None

    if soba_name is None:
        continue
    if soba_name in SKIP_NAMES:
        continue
    if soba_dep is None and soba_toshi is None:
        continue

    name      = soba_name
    has_kishi = (kishi_dep is not None or kishi_toshi is not None)
    is_temp   = has_temp_menu(name)
    style     = get_style(name)
    cat_l, cat_m = get_category(name, style)

    mid = new_mid()
    DO_ORDER += 1

    menus.append({
        "menu_id":        mid,
        "name":           name,
        "category_large": cat_l,
        "category_mid":   cat_m,
        "has_kishimen":   has_kishi,
        "has_kake":       (style == 'kake'),
        "has_zaru":       (style == 'zaru'),
        "has_temp":       is_temp,
        "has_omori":      True,
        "season":         None,
        "display_order":  DO_ORDER,
        "is_active":      True,
        "notes":          None
    })

    if is_temp:
        for temp in ['hot', 'cold']:
            if soba_dep and soba_toshi:
                patterns.append({
                    "pattern_id":    new_pid(),
                    "menu_id":       mid,
                    "noodle_type":   "soba",
                    "style":         None,
                    "temperature":   temp,
                    "toshi":         expand_toshi(soba_toshi, temp),
                    "denpyo":        expand_denpyo(soba_dep, temp),
                    "caster_set_id": "CST_A",
                    "notes":         None
                })
            if has_kishi and kishi_dep and kishi_toshi:
                patterns.append({
                    "pattern_id":    new_pid(),
                    "menu_id":       mid,
                    "noodle_type":   "kishimen",
                    "style":         None,
                    "temperature":   temp,
                    "toshi":         expand_toshi(kishi_toshi, temp),
                    "denpyo":        expand_denpyo(kishi_dep, temp),
                    "caster_set_id": "CST_A",
                    "notes":         None
                })
    else:
        if soba_dep and soba_toshi:
            patterns.append({
                "pattern_id":    new_pid(),
                "menu_id":       mid,
                "noodle_type":   "soba",
                "style":         style,
                "temperature":   None,
                "toshi":         soba_toshi,
                "denpyo":        soba_dep,
                "caster_set_id": "CST_A",
                "notes":         None
            })
        if has_kishi and kishi_dep and kishi_toshi:
            patterns.append({
                "pattern_id":    new_pid(),
                "menu_id":       mid,
                "noodle_type":   "kishimen",
                "style":         style,
                "temperature":   None,
                "toshi":         kishi_toshi,
                "denpyo":        kishi_dep,
                "caster_set_id": "CST_A",
                "notes":         None
            })


# ---- ミニ丼・丼セット・弁当・御膳・釜飯 処理（cols 12-16） ----
DON_SKIP = {
    'ミニ丼名', '丼ぶり名', '単品', '釜飯', '書き方', '通し方',
    '書き方（かけ）', '通し方（かけ）', '書き方（ざる）', '通し方（ざる）',
    '項目名', '書き方（温・冷）', '通し方（あつ・ひや）'
}
don_order = 1000

for row in rows:
    if len(row) < 17:
        continue
    don_name   = val(row[12])
    dep_kake   = val(row[13])
    toshi_kake = val(row[14])
    dep_zaru   = val(row[15])
    toshi_zaru = val(row[16])

    if don_name is None:
        continue
    if don_name in DON_SKIP:
        continue
    if dep_kake is None and toshi_kake is None:
        continue

    has_kake_v = (dep_kake is not None and toshi_kake is not None)
    has_zaru_v = (dep_zaru is not None and toshi_zaru is not None)

    if any(k in don_name for k in ['弁当', '御膳', '膳', 'めおと', 'ふたえ', 'よくばり', 'みちのく']):
        cat_l = '弁当・御膳'
    elif '釜飯' in don_name or '釜' in don_name:
        cat_l = '釜飯'
    elif 'ミニ' in don_name:
        cat_l = 'ミニ丼セット'
    else:
        cat_l = '丼セット'

    mid = new_mid()
    don_order += 1

    menus.append({
        "menu_id":        mid,
        "name":           don_name,
        "category_large": cat_l,
        "category_mid":   "",
        "has_kishimen":   False,
        "has_kake":       has_kake_v,
        "has_zaru":       has_zaru_v,
        "has_temp":       False,
        "has_omori":      False,
        "season":         None,
        "display_order":  don_order,
        "is_active":      True,
        "notes":          None
    })

    if has_kake_v:
        patterns.append({
            "pattern_id":    new_pid(),
            "menu_id":       mid,
            "noodle_type":   "soba",
            "style":         "kake",
            "temperature":   None,
            "toshi":         toshi_kake,
            "denpyo":        dep_kake,
            "caster_set_id": "CST_C",
            "notes":         None
        })
    if has_zaru_v:
        patterns.append({
            "pattern_id":    new_pid(),
            "menu_id":       mid,
            "noodle_type":   "soba",
            "style":         "zaru",
            "temperature":   None,
            "toshi":         toshi_zaru,
            "denpyo":        dep_zaru,
            "caster_set_id": "CST_C",
            "notes":         None
        })


# ---- 一品・ご飯・追加項目 処理（cols 18-20） ----
ADD_SKIP = {
    '項目名', '書き方', '通し方', '書き方（温・冷）', '通し方（あつ・ひや）'
}
add_order = 2000

for row in rows:
    if len(row) < 21:
        continue
    add_name  = val(row[18])
    add_dep   = val(row[19])
    add_toshi = val(row[20])

    if add_name is None:
        continue
    if add_name in ADD_SKIP:
        continue
    if add_dep is None and add_toshi is None:
        continue

    is_temp2 = (
        has_temp_menu(add_name) or
        'あつ・ひや' in str(add_toshi or '') or
        '温・冷' in str(add_dep or '')
    )

    if any(k in add_name for k in ['ご飯', 'ライス', 'おにぎり', 'かやく', '量変更']):
        cat_l = 'ご飯・おにぎり'
    elif any(k in add_name for k in ['御膳', '山里']):
        cat_l = '弁当・御膳'
    else:
        cat_l = '一品'

    mid = new_mid()
    add_order += 1

    menus.append({
        "menu_id":        mid,
        "name":           add_name,
        "category_large": cat_l,
        "category_mid":   "",
        "has_kishimen":   False,
        "has_kake":       False,
        "has_zaru":       False,
        "has_temp":       is_temp2,
        "has_omori":      False,
        "season":         None,
        "display_order":  add_order,
        "is_active":      True,
        "notes":          None
    })

    if is_temp2:
        for temp in ['hot', 'cold']:
            patterns.append({
                "pattern_id":    new_pid(),
                "menu_id":       mid,
                "noodle_type":   "soba",
                "style":         None,
                "temperature":   temp,
                "toshi":         expand_toshi(add_toshi, temp),
                "denpyo":        expand_denpyo(add_dep, temp),
                "caster_set_id": "CST_D",
                "notes":         None
            })
    else:
        patterns.append({
            "pattern_id":    new_pid(),
            "menu_id":       mid,
            "noodle_type":   "soba",
            "style":         None,
            "temperature":   None,
            "toshi":         add_toshi,
            "denpyo":        add_dep,
            "caster_set_id": "CST_D",
            "notes":         None
        })


print(f"menus: {len(menus)}件, patterns: {len(patterns)}件")

with open('data/menus.json', 'w', encoding='utf-8') as f:
    json.dump(menus, f, ensure_ascii=False, indent=2)

with open('data/output_patterns.json', 'w', encoding='utf-8') as f:
    json.dump(patterns, f, ensure_ascii=False, indent=2)

print("done")
