# Spring Energy in 2D

## Definition

- Input: `x = [x1, y1, x2, y2, l, k]`
- Output: `E(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Point 1: `p1 = (x1, y1)`
  - Point 2: `p2 = (x2, y2)`
  - Rest length: `l`
  - Stiffness: `k`
  - Distance: `d = \|p2 - p1\|_2`

## Domain / Assumptions

- `x1, y1, x2, y2, l, k` are finite values.
- For `grad`, `hess`, and `hvp`, `d > 0` is required.
- Typical physical setting uses `k \ge 0`.

## Function

$$
E(x) = \frac{1}{2}k(d-l)^2,\quad d=\sqrt{(x2-x1)^2+(y2-y1)^2}
$$

Let residual:

$$
r = d - l
$$

then:

$$
E = \frac{1}{2}k r^2
$$

## First-order Derivative

Let:

$$
g_d = \nabla_{[x1,y1,x2,y2]} d
$$

with:

$$
g_d=\left[
-\frac{x2-x1}{d},
-\frac{y2-y1}{d},
\frac{x2-x1}{d},
\frac{y2-y1}{d}
\right]
$$

Gradient:

$$
\nabla E =
\left[
k r g_{d,1},
k r g_{d,2},
k r g_{d,3},
k r g_{d,4},
-k r,
\frac{1}{2}r^2
\right]
$$

## Second-order

Let:

$$
H_d = \nabla^2_{[x1,y1,x2,y2]} d
$$

Then `q = [x1,y1,x2,y2]` block:

$$
\nabla^2_{qq}E = k\left(g_d g_d^\top + r H_d\right)
$$

Cross blocks:

$$
\nabla^2_{q l}E = -k g_d,\quad
\nabla^2_{q k}E = r g_d
$$

Scalar blocks:

$$
\frac{\partial^2 E}{\partial l^2}=k,\quad
\frac{\partial^2 E}{\partial l \partial k}=-r,\quad
\frac{\partial^2 E}{\partial k^2}=0
$$

- `hvp`: implemented as `hess(x) @ v`

## Numerical Stability Notes

- Near `d = 0`, normalized distance derivatives become unstable.
- Implementation guards `d` with `minimumDistanceThreshold`.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: implemented
- `hvp`: implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard spring-energy differentiation identities
