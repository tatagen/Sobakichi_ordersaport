# そば吉 オーダーサポートアプリ

> 飲食店スタッフ向け オーダー研修ツール

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)

---

## 解決する課題

新人スタッフがオーダーを受けてから料理を提供するまでの手順を覚えるのに時間がかかります。このアプリはメニューを選ぶだけで調理手順・チーキーフォーマット・提供セットを即座に表示し、研修コストを削減します。

---

## 機能

- メニューを選択すると調理手順をステップ形式で表示
- チーキーフォーマット（伝票記入方法）の確認
- 提供セット（付け合わせ・食器など）の一覧表示
- スマートフォン最適化UI（max-width: 480px）

---

## 技術的なポイント

- **外部ライブラリ完全不使用**：React・Vue等のフレームワークを一切使わず、Vanilla JS / HTML / CSS のみで構築。軽量・高速・依存関係ゼロ。
- メニューデータをJSONファイルで管理しているため、新メニューの追加・変更がコードを触らずに可能
- スマートフォンでも片手操作しやすいレスポンシブレイアウト

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | HTML / CSS / Vanilla JavaScript |
| データ管理 | JSON ファイル |
| アーキテクチャ | クライアントサイドのみ（外部ライブラリ不使用） |

---

## 起動方法

`fetch()` でJSONデータを読み込むため、ローカルサーバーが必要です。

**VS Code Live Server を使う場合**

`index.html` を右クリック → `Open with Live Server`

**Python を使う場合**

```bash
python -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

**Node.js を使う場合**

```bash
npx serve .
```
