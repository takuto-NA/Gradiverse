# Point-Plane Distance in 3D

## Definition

- Input: `x = [px, py, pz, nx, ny, nz, d]`
- Output: `f(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Point: `p = (px, py, pz)`
  - Plane normal: `n = (nx, ny, nz)`
  - Plane offset: `d`

## Domain / Assumptions

- Inputs are finite values.
- Plane normal is non-degenerate: `\|n\|_2^2 > 0`.
- For gradient of unsigned distance: `|n^\top p + d| > 0`.

## Function

Signed plane value:

$$
s = n^\top p + d
$$

Unsigned distance:

$$
f(x) = \frac{|s|}{\|n\|_2}
$$

## First-order Derivative

Let:

$$
m = \|n\|_2,\quad \sigma = \operatorname{sign}(s)
$$

Then:

$$
\nabla_p f = \sigma \frac{n}{m}
$$

$$
\frac{\partial f}{\partial d} = \frac{\sigma}{m}
$$

$$
\nabla_n f = \sigma \frac{p}{m} - \frac{|s|}{m^3}n
$$

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Guard for near-zero normal norm with `minimumNormalNormSquared`.
- Guard for absolute-value cusp with `minimumSignedDistanceAbsolute`.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard point-to-plane distance differentiation
