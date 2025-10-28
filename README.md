# ポモドーロタイマー

シンプルで使いやすいポモドーロタイマーアプリケーション。タスク管理機能、ドラッグ&ドロップによる並び替え、ダークモードなどの便利な機能を搭載。

## 機能

- ⏱️ **ポモドーロタイマー**: 25分作業 / 5分休憩のサイクル
- 📝 **タスク管理**: Todoリストで作業を整理
- 🏃‍♀️ **リアルタイム追跡**: 作業中のタスクに自動で時間を記録
- 🎯 **ドラッグ&ドロップ**: タスクを自由に並び替え
- ☕ **視覚的フィードバック**: 作業中/休憩中のアイコン表示
- 🍅 **プログレスバー**: YouTubeスタイルの進捗表示
- 🌙 **ダークモード**: 目に優しい暗いテーマ
- 🔔 **通知音**: タイマー終了時のサウンド通知
- 💾 **自動保存**: LocalStorageで設定とタスクを永続化
- ⌨️ **キーボードショートカット**: スペースキーで一時停止/再開

## 技術スタック

- **TypeScript**: 型安全な開発
- **Vanilla JavaScript**: フレームワークなしの軽量実装
- **Tailwind CSS**: ユーティリティファーストCSS
- **SortableJS**: ドラッグ&ドロップ機能
- **ESLint + Prettier**: コード品質管理

## セットアップ

```bash
# 依存関係をインストール
npm install

# 開発モード（ウォッチモード）
npm run watch

# ビルド
npm run build

# コードフォーマット
npm run format

# Lint実行
npm run lint

# Lint自動修正
npm run lint:fix
```

## 使い方

1. `index.html`をブラウザで開く
2. タスクを追加して、スタートボタンをクリック
3. 25分間集中して作業
4. 休憩時間を取る
5. これを繰り返す

### デバッグモード

URLクエリパラメータで作業時間と休憩時間をカスタマイズできます：

```
index.html?work=1&break=1
```

- `work`: 作業時間（分）
- `break`: 休憩時間（分）

## プロジェクト構造

```
pomodoro/
├── src/
│   └── timer.ts          # メインアプリケーションロジック
├── dist/
│   └── timer.js          # コンパイル済みJavaScript
├── index.html            # メインHTMLファイル
├── package.json          # 依存関係とスクリプト
├── tsconfig.json         # TypeScript設定
├── eslint.config.js      # ESLint設定
├── .prettierrc.json      # Prettier設定
└── README.md             # このファイル
```

## コーディング規約

- TypeScript strictモード有効
- ESLint + Prettierによる自動フォーマット
- 関数には必ず返り値型を明示
- JSDocコメントで関数を文書化
- 日本語コメントで実装の背景を説明

## ライセンス

MIT
