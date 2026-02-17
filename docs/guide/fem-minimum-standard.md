# FEM Minimum Standard

## 形状関数カード

必須:

- `N(xi)`
- `dN_dxi(xi)`
- `J`
- `dN_dx`（`inv(J)` 経由）

推奨テスト:

- Partition of unity
- 線形場再現（簡易パッチテスト）

## エネルギー密度カード

必須:

- `psi(F)`（スカラー）
- `P(F) = dpsi/dF`

推奨:

- `hvp(F, dF)`（接線作用）

推奨テスト:

- `P` の差分一致
- `hvp` の方向微分一致
