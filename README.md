# Gradiverse

Gradiverse は、次の 3 つを 1 つのカード単位で統合する微分カタログです。

- 数式定義と導出（LaTeX）
- 実装（`value`, `grad`/`jac`, 必要に応じて `hess`/`hvp`）
- 有限差分参照による数値検証テスト

サイトは VitePress でビルドし、GitHub Actions で GitHub Pages に公開します。

## 前提環境

- Node.js 22.x（CI は `.github/workflows/deploy-docs.yml` で Node 22 を使用）
- npm 10+

Node バージョン管理を使う場合は `.nvmrc` を利用してください。

## クイックスタート

```bash
npm install
npm run docs:dev
```

## 品質チェック

```bash
npm run typecheck
npm test
```

`npm test` は `docs/catalog` 配下の実カードにある `check()` を一括実行します（テンプレートは除外）。

## ドキュメントビルド

```bash
npm run docs:build
npm run docs:preview
```

## コントリビュート手順

1. ガイドを確認:
   - `docs/guide/derivative-card-standard.md`
   - `docs/guide/testing-standard.md`
2. `docs/catalog/templates/derivative-card/` を複製してカードを作成
3. `spec.md`, `impl.ts`, `test.ts`, `meta.yaml` を実装
4. 次を実行:
   - `npm run typecheck`
   - `npm test`
5. Pull Request を作成

詳細チェックリストは `CONTRIBUTING.md` を参照してください。

## 言語ガイド

- 主要ガイドは `docs/` 配下にあります。
- 入口として `docs/index.md` を参照してください。

## リポジトリ構成

- `docs/`: VitePress ドキュメントソース
- `scripts/run-catalog-checks.ts`: カード検証テストの実行エントリ
- `.github/workflows/deploy-docs.yml`: GitHub Pages デプロイワークフロー
