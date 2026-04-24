# そば吉 オーダーサポートアプリ

ホール研修生向けに、注文内容を選択すると「通し方・伝票の書き方・カスターセット」を即座に表示するWebアプリです。

---

## ローカルで開く方法

このアプリはJSONファイルを `fetch()` で読み込むため、**ファイルを直接ダブルクリックしても動きません**。
必ずローカルサーバー経由で起動してください。

### 方法1: VS Code の Live Server 拡張機能（推奨）
1. VS Code に「Live Server」拡張機能をインストール
2. `index.html` を右クリック →「Open with Live Server」

### 方法2: Python で起動
```bash
# このフォルダ内で実行
python -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

### 方法3: Node.js (npx) で起動
```bash
npx serve .
```

---

## ファイル構成

```
sobakichi-app/
├── index.html              # エントリポイント（4画面分のHTMLを含む）
├── css/
│   └── style.css           # 全スタイル
├── js/
│   ├── app.js              # メインロジック・状態管理
│   ├── router.js           # 画面遷移管理
│   └── data-loader.js      # JSONデータ読み込み
├── data/
│   ├── menus.json          # メニューマスタ
│   ├── output_patterns.json # 通し方・伝票データ
│   └── caster_sets.json    # カスターセット定義
└── README.md
```

---

## メニューデータの追加方法

### 1. `data/menus.json` にメニューを追加

```json
{
  "menu_id": "MENU_XXX",        // 一意のID（連番で管理）
  "name": "メニュー名",
  "category_large": "麺類",     // ホーム画面のカテゴリ名
  "category_mid": "単品",       // サブカテゴリ（任意）
  "has_kishimen": true,         // きしめん選択を表示するか
  "has_kake": false,            // かけ・ざるの選択肢を出すか（has_zaruとセットで判定）
  "has_zaru": true,
  "has_temp": false,            // 温・冷の選択を表示するか
  "has_omori": true,            // 大もり選択（将来対応）
  "season": null,               // 季節限定の場合は季節名（"夏"など）
  "display_order": 99,          // 商品一覧内での表示順（小さい数が上）
  "is_active": true             // false にすると非表示
}
```

### 2. `data/output_patterns.json` に通し方・伝票を追加

```json
{
  "pattern_id": "PAT_XXX",
  "menu_id": "MENU_XXX",        // 対応するメニューID
  "noodle_type": "soba",        // "soba" または "kishimen"
  "style": "zaru",              // "kake" / "zaru" / null
  "temperature": null,          // "hot" / "cold" / null
  "toshi": "てんざる",           // キッチンへの声かけ（ひらがな推奨）
  "denpyo": "天ざ",             // 伝票の書き方
  "caster_set_id": "CST_A",    // カスターセットID
  "notes": null                 // 注意事項（nullなら非表示）
}
```

**ポイント**: `noodle_type` / `style` / `temperature` の組み合わせごとに1レコード必要です。
例：「おろし」はそば×温、そば×冷、きしめん×温、きしめん×冷の4レコード。

### 3. `data/caster_sets.json` にカスターセットを追加（必要な場合）

```json
{
  "set_id": "CST_X",
  "set_name": "セット名",
  "items": ["備品1", "備品2"]
}
```

---

## 技術仕様

- Vanilla HTML / CSS / JavaScript（フレームワーク不使用）
- ゼロ依存（外部ライブラリなし）
- スマートフォン対応（max-width: 480px）
- データはすべてJSONファイルで管理
