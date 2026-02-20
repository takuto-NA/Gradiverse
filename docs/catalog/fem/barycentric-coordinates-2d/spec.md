# Barycentric Coordinates in 2D

## Definition

- Input: `x = [px, py]`
- Parameters:
  - `a=(ax,ay), b=(bx,by), c=(cx,cy)` (fixed triangle)
- Output: `w(x) = [w0, w1, w2]`
- Constraints: `w0 + w1 + w2 = 1`

## Domain / Assumptions

- `px, py` and triangle coordinates are finite values.
- Triangle is non-degenerate:

$$
|(b-a)\times(c-a)| > 0
$$

## Function

Let:

$$
D=(b-a)\times(c-a)
$$

Then:

$$
w0 = \frac{(b-p)\times(c-p)}{D},\quad
w1 = \frac{(c-p)\times(a-p)}{D},\quad
w2 = 1 - w0 - w1
$$

where 2D cross product is scalar `u_x v_y - u_y v_x`.

## First-order Derivative

Jacobian `J = \partial w / \partial [px,py]`:

$$
\frac{\partial w0}{\partial px} = \frac{b_y-c_y}{D},\quad
\frac{\partial w0}{\partial py} = \frac{c_x-b_x}{D}
$$

$$
\frac{\partial w1}{\partial px} = \frac{c_y-a_y}{D},\quad
\frac{\partial w1}{\partial py} = \frac{a_x-c_x}{D}
$$

$$
\frac{\partial w2}{\partial px} = -\frac{\partial w0}{\partial px}-\frac{\partial w1}{\partial px},\quad
\frac{\partial w2}{\partial py} = -\frac{\partial w0}{\partial py}-\frac{\partial w1}{\partial py}
$$

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Triangle area denominator is guarded by `minimumTriangleAreaAbsolute`.

## API Availability

- `value`: implemented
- `grad`: implemented (Jacobian wrt point coordinates)
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard finite element barycentric interpolation formulas
