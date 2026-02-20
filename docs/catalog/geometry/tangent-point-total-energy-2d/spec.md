# Tangent-Point Total Energy in 2D

## Purpose

This card defines total Tangent Point Energy (TPE) on a closed 2D polyline and provides its analytical gradient.

Compared with simple inverse-distance repulsion, TPE uses local tangents and normals, so neighboring points do not need ad-hoc exclusion.

## Definition

- Input:
  - `x = [x0, y0, x1, y1, ..., x_{n-1}, y_{n-1}]` (closed polyline, cyclic indexing)
- Parameters:
  - `alpha > 0`
- At each point `p_i`:
  - tangent: `T_i = p_{i+1} - p_{i-1}`
  - unit normal: `n_i = R (T_i / |T_i|)`, `R = [[0, -1], [1, 0]]`
- Pair symbols:
  - `r_ij = p_j - p_i`
  - `a_ij = n_i · r_ij`

Pair energy:

$$
E_{ij} = \left(\frac{2|a_{ij}|}{|r_{ij}|^2}\right)^\alpha,\quad j \neq i
$$

Total energy:

$$
E_{total} = \sum_i \sum_{j \neq i} E_{ij}
$$

## Domain / Assumptions

- All values are finite.
- `alpha > 0`.
- `n >= 3` points are required.
- Differentiability constraints:
  - `|T_i| > 0`
  - `|r_{ij}| > 0`
  - `|a_{ij}| > 0`
- Implementation guards:
  - `|T_i| > 1e-8`
  - `|r_{ij}| > 1e-8`
  - `|a_{ij}| > 1e-10`

## Gradient Decomposition

For each pair `(i, j)` with `j != i`, the contribution is decomposed into:

1. **Term A (direct position dependency)**  
   `p_i` and `p_j` directly affect `r_ij`
2. **Term B (`dE/dn_i`)**  
   sensitivity of `E_ij` to normal `n_i`
3. **Term C (chain rule through tangent-normal map)**  
   `n_i` depends on `p_{i-1}` and `p_{i+1}`

Direct term:

$$
\frac{\partial E_{ij}}{\partial p_j}
=
\alpha E_{ij}
\left(
\frac{n_i}{a_{ij}}
-
\frac{2r_{ij}}{|r_{ij}|^2}
\right),
\quad
\frac{\partial E_{ij}}{\partial p_i}
=
-\frac{\partial E_{ij}}{\partial p_j}
$$

Normal sensitivity:

$$
\frac{\partial E_{ij}}{\partial n_i}
=
\alpha E_{ij}\frac{r_{ij}}{a_{ij}}
$$

Chain rule through `n_i = R (T_i / |T_i|)`:

$$
\frac{\partial n_i}{\partial p_{i+1}}
=
\frac{1}{|T_i|}R\left(I-\frac{T_iT_i^\top}{|T_i|^2}\right),
\quad
\frac{\partial n_i}{\partial p_{i-1}}
=
-\frac{\partial n_i}{\partial p_{i+1}}
$$

Total gradient is the accumulation of Term A + Term B→C over all ordered pairs.

## Numerical Verification

- `test.ts` compares analytical `grad` with central-difference gradient.
- Verification uses fixed seeds, fixed `epsilon`, and explicit tolerances.
- Multiple point counts are sampled for broader coverage.

## API Availability

- `value(stateVector, parameters) -> number`
- `grad(stateVector, parameters) -> GradientVector`
- `domain.sample(seed, sampleCount, pointCount?) -> StateVector[]`
- `check() -> void`

## File Structure

- `spec.md`: mathematical definition and derivative structure
- `impl.ts`: analytical implementation (`value`, `grad`)
- `test.ts`: finite-difference verification for `grad`
- `meta.yaml`: catalog metadata

## References

- Tangent Point Energy formulations for self-avoiding curves
