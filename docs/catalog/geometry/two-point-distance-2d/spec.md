# Two-Point Distance in 2D

## Definition

- Input (distance): `q = [x1, y1, x2, y2]`
- Input (natural-length residual): `z = [x1, y1, x2, y2, l]`
- Output:
  - Distance: `d(q) \in \mathbb{R}_{\ge 0}`
  - Residual: `r(z) = d(q) - l \in \mathbb{R}`
- Symbols:
  - Point 1: `p1 = (x1, y1)`
  - Point 2: `p2 = (x2, y2)`
  - Natural length: `l`

## Domain / Assumptions

- `x1, y1, x2, y2, l` are finite values.
- For derivative of distance and residual, `d(q) > 0` is required.
  - At `d = 0`, direction is not uniquely defined for `d(q)` itself.

## Function

Inline:
$d(q) = \sqrt{(x2 - x1)^2 + (y2 - y1)^2}$

$$
d(q) = \sqrt{(x2 - x1)^2 + (y2 - y1)^2}
$$

Natural-length residual:

$$
r(z) = d(q) - l
$$

## First-order Derivative

Distance gradient (`q = [x1, y1, x2, y2]`):

$$
\frac{\partial d}{\partial x1} = -\frac{x2 - x1}{d}, \quad
\frac{\partial d}{\partial y1} = -\frac{y2 - y1}{d}
$$

$$
\frac{\partial d}{\partial x2} = \frac{x2 - x1}{d}, \quad
\frac{\partial d}{\partial y2} = \frac{y2 - y1}{d}
$$

Residual gradient (`z = [x1, y1, x2, y2, l]`):

$$
\nabla r(z) =
\left[
 -\frac{x2-x1}{d},
 -\frac{y2-y1}{d},
 \frac{x2-x1}{d},
 \frac{y2-y1}{d},
 -1
\right]
$$

## Second-order

Let
$\Delta x = x2 - x1$, $\Delta y = y2 - y1$, $d = \sqrt{\Delta x^2 + \Delta y^2}$.
Define:

$$
A =
\frac{1}{d^3}
\begin{bmatrix}
\Delta y^2 & -\Delta x \Delta y \\
-\Delta x \Delta y & \Delta x^2
\end{bmatrix}
$$

Then:

$$
\nabla^2 d(q) =
\begin{bmatrix}
A & -A \\
-A & A
\end{bmatrix}
$$

For residual $r(z)=d-l$:

$$
\nabla^2 r(z)=
\begin{bmatrix}
\nabla^2 d(q) & 0 \\
0 & 0
\end{bmatrix}
$$

- `hess`: implemented for residual `r(z)`
- `hvp`: implemented analytically as `hess(z) @ v`

## Numerical Stability Notes

- Guard `d(q)` with `minimumDistanceThreshold` to avoid division by zero.
- Central difference test uses a fixed epsilon and seed for reproducibility.

## API Availability

- `value`: implemented (`r(z) = d - l`)
- `grad`: implemented (gradient of residual wrt `[x1, y1, x2, y2, l]`)
- `hess`: implemented
- `hvp`: implemented (`hess(z) @ v`)
- `distanceValue`: implemented
- `distanceGradient`: implemented
- `distanceHessian`: implemented

## References

- Standard Euclidean geometry
