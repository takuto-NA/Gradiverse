# Gradiverse へのコントリビュート

初見のコントリビューターが derivative card を追加・更新できるように、必要手順をまとめています。

## 1) 前提環境

- Node.js 22.x
- npm 10+

依存をインストール:

```bash
npm install
```

## 2) ガイドを確認

- `docs/guide/derivative-card-standard.md`
- `docs/guide/testing-standard.md`
- `docs/index.md`（ドキュメントの入口）

## 3) 新しいカードを作成

正規テンプレートを複製:

```text
docs/catalog/templates/derivative-card/
```

新規ディレクトリを作成:

```text
docs/catalog/<category>/<card-name>/
```

必須ファイル:

- `spec.md`
- `impl.ts`
- `test.ts`
- `meta.yaml`

## 4) 実装ルール

- 名前は自己説明的にする（省略しない）。
- マジックナンバーを避け、定数名を付ける。
- 深いネストを避け、ガード節と早期リターンを使う。
- スクリプト先頭に `Responsibility` コメントを置く。
- 数式・実装・テストの内容を一致させる。

## 5) PR 前の検証

以下をすべて実行:

```bash
npm run typecheck
npm test
npm run docs:build
```

## 6) Pull Request チェックリスト

- [ ] `spec.md` に入力・出力・制約・API が明記されている
- [ ] `impl.ts` が数式仕様と一致している
- [ ] `test.ts` で数値微分検証が通る
- [ ] `meta.yaml` のメタ情報が完全で整合している
- [ ] 5章のコマンドがすべて成功する

## 7) 補足

- 新規作業の開始点は `docs/catalog/templates/derivative-card/` を使う。
