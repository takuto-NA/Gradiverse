# Derivative Card Standard

## 収録単位

1カード = 1対象関数（スカラー/ベクトル/行列）。

```text
<category>/<name>/
  spec.md
  impl.*
  test.*
  meta.yaml
```

## 必須項目

- 定義（入力・出力・記号・shape）
- ドメイン/前提（制約）
- 数式（LaTeX）
- 1階微分（grad または Jacobian）
- 実装（`value`, `grad` または `jac`）
- 検証テスト（数値微分一致）

## 推奨項目

- 2階（`hess` または `hvp`）
- 数値安定化ノート（`clamp`, `eps`, `log1p`, `expm1` など）
- 参考文献

## 標準API

- `value(x, params) -> scalar | vector | matrix`
- `grad(x, params) -> derivative`
- `hess(x, params) -> ...`（任意）
- `hvp(x, v, params) -> directional second derivative`（推奨）
- `domain.sample(seed, n) -> valid inputs`（推奨）
- `check() -> test report`（任意）

実装しない関数は、`not implemented` を明示してください。
