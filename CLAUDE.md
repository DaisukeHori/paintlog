# PaintLog - 塗装技術データ管理アプリ

## 概要
塗装条件データ（温度、湿度、エア圧、回転数等）を記録・分析するiPhone向けWebアプリ。
グローブ着用での操作前提。保存ボタンなしの自動保存。

## 技術スタック
- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Supabase (Auth + PostgreSQL)
- AWS S3 (写真・動画)
- Vercel (ホスティング)

## 自動保存アーキテクチャ
- フィールド変更 → 500msデバウンス → Supabase update
- 「新規」= 空レコード即insert → /logs/[id] で編集開始
- ページ移動しても一覧からタップで続き入力可能
- src/lib/autosave.ts の useAutoSave フック

## デフォルト値
- 📌ピン = 固定値（毎回適用） / ピンなし = 前回値引き継ぎ
- 新規時「固定値を適用しました」バナー表示

## UI原則
- タップ領域 min 44x44px / viewport maximumScale=1
- 5カテゴリの展開・折り畳みカード / 折り畳み時サマリー表示

## DB: supabase/migration.sql
paint_logs(23カラム+JSONB), user_defaults, text_suggestions, custom_field_definitions

## セットアップ
1. Supabase: migration.sql実行 + Auth Email/Password有効化
2. S3バケット作成 + CORS設定
3. .env.local.example → .env.local
4. npm install && npm run dev
