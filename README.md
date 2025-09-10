# AI 音楽プロデューサー ポートフォリオ（テンプレート）

このサイトは、参照サイトのレイアウト・雰囲気に近い構成を保ちつつ、テキストや画像・動画・リンクを `content.json` で差し替えできるようにしたテンプレートです。

## 構成

- `index.html`: セクションの骨組み（Hero / About / News / Artists / Works / Video / Contact / Footer）
- `styles.css`: デザイン（ダーク基調、グリッド、カード、レスポンシブ）
- `script.js`: `content.json` を読み込み、各セクションに描画
- `content.json`: コンテンツ設定（後述）
- `image/`: 画像ファイルを置くフォルダ（当テンプレで作成済み）

## 使い方

1. 画像は `image/` に追加し、`content.json` から参照します。
   - ファイル名のみ（例: `"artist-1.jpg"`）と書けば自動で `image/artist-1.jpg` に補完されます。
   - サブフォルダを使う場合は `image/album/cover.webp` のようにフル相対パスで指定してください。
2. テキストやリンクは `content.json` を編集するだけで反映されます。
3. セクションを一時的に非表示にしたい場合は、`hideSections` に id（例: `"news"`）を追加します。
4. 送信フォームはデモです。Googleフォームを使う場合は、`content.json > contact.form.embedUrl` に埋め込みURLを設定してください（下記参照）。

### ローカルプレビュー

任意のHTTPサーバーで配信してください。例（Python）：

```
python3 -m http.server 5173
```

ブラウザで `http://localhost:5173` を開きます。

## 画像の配置と指定ルール

- 保存場所: プロジェクト直下の `image/`（空ファイル `.gitkeep` 済み）
- 指定の書き方:
  - ファイル名のみ: `"artist-1.jpg"` → `image/artist-1.jpg` に自動解決
  - サブフォルダ: `"image/album/cover.webp"` と明示（`image/` からの相対パス）
  - フルURL: `https://...` はそのまま使用
  - data URI: `data:image/...` も使用可

## Googleフォームの設定

- Googleフォームでフォーム作成 → 送信 → `<>`（埋め込む）を開く → 表示された `src` のURLを `content.json > contact.form.embedUrl` にコピーします。
- 高さは `contact.form.height` で調整できます（省略時 760）。
- 埋め込みを使わない場合は、`contact.actions` にフォームへのリンクを置くか、`contact.form.action` に別サービスのエンドポイントを指定してください。

## デプロイ（無料サブドメイン）

- Netlify（推奨・簡単）
  - リポジトリをNetlifyに接続 → ビルドコマンドなし、Publishはルート（自動認識）。
  - 追加済みの `netlify.toml` で `content.json` は `no-store` キャッシュ。
  - 付与される `*.netlify.app` サブドメインで運用、後から独自ドメイン追加可。

- Vercel
  - リポジトリをVercelにインポート → Framework: Other（静的）を選択 → Buildなしでデプロイ。
  - `vercel.json` に `content.json` のキャッシュ制御を同梱。
  - `*.vercel.app` サブドメインで運用、後から独自ドメイン追加可。

- GitHub Pages（プロジェクトページ）
  - Settings → Pages → Branchを `main`/`docs` 等に設定。
  - 本テンプレートは相対パス（`./styles.css`, `./script.js`, `content.json`）なのでサブパスでも動作します。

## セクションID（非表示の指定に使用）

- `hero`, `about`, `news`, `artists`, `works`, `video`, `contact`

## カスタマイズのヒント

- `styles.css` の `:root` で色や角丸、影を変更できます。
- カードの列数は `.card-grid` の `grid-template-columns` と、`.card` の `grid-column` で制御しています。
- ナビゲーション項目の並びは `index.html` のメニューを変更してください（必要ならJSで動的化も可能）。

## ライセンス

クライアント案件向けサンプル。必要に応じてプロジェクト内で自由に改変してください。
