# Gradiverse

Gradiverse は、**解析的に導出した微分情報**をカード単位で管理するカタログです。  
1 つのカードに、次の 3 要素を揃えます。

- 数式定義と導出（LaTeX）
- 実装（`value`, `grad` / `jac`, 必要に応じて `hess` / `hvp`）
- 有限差分参照による数値検証テスト

## まず見る場所（初見向け）

- 公開ドキュメント（GitHub Pages）: https://takuto-NA.github.io/Gradiverse/
- 入口ページ: `docs/index.md`
- 作成ルール: `docs/guide/derivative-card-standard.md`

閲覧だけなら、まず GitHub Pages を開くのが最短です。

## 1 分でローカル起動

### 前提環境

- Node.js 22.x
- npm 10+

### 手順

```bash
npm install
npm run docs:dev
```

ローカルサイトが立ち上がったら、ブラウザで表示された URL を開いて確認します。

## よく使うコマンド

- ドキュメント開発サーバー: `npm run docs:dev`
- 型チェック: `npm run typecheck`
- カタログ検証テスト一括実行: `npm test`
- 本番用ビルド: `npm run docs:build`
- ビルド結果プレビュー: `npm run docs:preview`

`npm test` は `docs/catalog` 配下の実カードの `check()` を一括実行します（テンプレートは除外）。
実行後、カード別の検証レポートが `docs/verification/catalog-check-report.md` と `docs/verification/catalog-check-report.json` に自動出力されます。

## 新規カードを追加する流れ

1. `docs/guide/derivative-card-standard.md` と `docs/guide/testing-standard.md` を確認
2. `docs/catalog/templates/derivative-card/` を複製
3. `spec.md`, `impl.ts`, `test.ts`, `meta.yaml` を実装
4. `npm run typecheck` と `npm test` を実行
5. Pull Request を作成

詳細は `CONTRIBUTING.md` を参照してください。

## リポジトリ構成（最小）

- `docs/`: VitePress ドキュメントソース
- `scripts/run-catalog-checks.ts`: カード検証テスト実行エントリ
- `.github/workflows/deploy-docs.yml`: GitHub Pages デプロイ設定
