# Two-Point Squared Distance in 2D

## Definition

- Input: `q = [x1, y1, x2, y2]`
- Output: `f(q) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Point 1: `p1 = (x1, y1)`
  - Point 2: `p2 = (x2, y2)`
  - Relative vector: `\Delta p = p2 - p1`

## Domain / Assumptions

- `x1, y1, x2, y2` are finite values.
- `f(q)` is polynomial, so value/gradient/Hessian are well-defined for all finite inputs.

## Function

Inline:
`f(q) = (x2 - x1)^2 + (y2 - y1)^2`

$$
f(q) = (x2 - x1)^2 + (y2 - y1)^2
$$

## First-order Derivative

Let `\Delta x = x2 - x1`, `\Delta y = y2 - y1`.

$$
\frac{\partial f}{\partial x1} = -2\Delta x, \quad
\frac{\partial f}{\partial y1} = -2\Delta y
$$

$$
\frac{\partial f}{\partial x2} = 2\Delta x, \quad
\frac{\partial f}{\partial y2} = 2\Delta y
$$

Gradient form:

$$
\nabla f(q)=
\left[
 -2\Delta x,\,
 -2\Delta y,\,
 2\Delta x,\,
 2\Delta y
\right]
$$

## Second-order

Hessian is constant:

$$
\nabla^2 f(q)=
\begin{bmatrix}
2 & 0 & -2 & 0 \\
0 & 2 & 0 & -2 \\
-2 & 0 & 2 & 0 \\
0 & -2 & 0 & 2
\end{bmatrix}
$$

- `hvp`: implemented analytically as `hess(q) @ v`

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: implemented
- `hvp`: implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard Euclidean geometry
