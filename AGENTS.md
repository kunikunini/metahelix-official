# Repository Guidelines

## プロジェクト構成とモジュール
- `index.html`: セクションの骨組み（hero/about/news/artists/works/video/contact）。
- `styles.css`: CSS変数とレスポンシブグリッドでデザインを定義。
- `script.js`: `content.json` を読み込み、各セクション・ナビ・効果を描画。
- `content.json`: サイトのコンテンツと設定の単一ソース。
- `image/`: 画像アセット置き場（`image/...` で参照）。
- ホスティング設定: `netlify.toml`, `vercel.json`（`content.json` のキャッシュ制御）。

## ビルド・テスト・開発コマンド
- ローカル確認（Python）: `python3 -m http.server 5173` → `http://localhost:5173` を開く。
- ビルド不要: 静的サイトのためそのままコミットで反映。
- デプロイ: Netlify/Vercel に接続（ビルドコマンド不要）。設定ファイル同梱。

## コーディング規約・命名
- インデント2スペース、UTF-8、LF 改行。
- ファイル/パスは小文字ケバブケース（例: `artist-card.jpg`, `about-team.html`）。
- HTML: セクションIDは固定（`hero`, `about`, `news`, `artists`, `works`, `video`, `contact`）。
- CSS: 変数は `:root` に集約。インラインスタイルは避け、浅いセレクタを維持。
- JS: 素の ES2015+。小さな純粋関数を優先し、グローバル汚染を避ける。`CONTENT_PATH` と画像パス正規化の挙動は維持。

## テスト方針
- 導入フレームワークなし（手動確認）。
- スモークテスト: キャッシュ無効で読み込み、`content.json` が全セクションに反映されること、画像解決、モバイルメニューの開閉、ヒーロー演出、コンソールエラーなしを確認。
- 端末差分: 幅 360/768/1280px で崩れとコントラストを確認。
- 任意: Lighthouse でPerformance/Accessibility回帰を目視。

## コミットとプルリクエスト
- コミット: 命令形・簡潔な件名。例: `feat(hero): add background video`, `fix(cards): normalize image paths`。
- PR: 概要、関連Issue、UIのBefore/After画像、`content.json` スキーマ変更点を記載。
- チェック: ローカル確認を通し、JSON バリデーションを実施。

## セキュリティと設定のヒント
- 機密は `content.json` に置かない（公開ファイル）。送信は外部フォーム/サービスを利用。
- `netlify.toml`/`vercel.json` の `no-store` を維持し、編集を即時反映。
- 外部埋め込み/リンクは検証し、`rel="noopener"` と既存のターゲット設定を踏襲。
