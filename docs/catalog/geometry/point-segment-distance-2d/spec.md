# Point-Segment Distance in 2D

## Definition

- Input: `x = [px, py, ax, ay, bx, by]`
- Output: `d(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Query point: `p = (px, py)`
  - Segment endpoints: `a = (ax, ay)`, `b = (bx, by)`
  - Segment direction: `u = b - a`

## Domain / Assumptions

- `px, py, ax, ay, bx, by` are finite values.
- Segment must be non-degenerate: `\|u\|_2^2 > 0`.
- For gradient:
  - `d(x) > 0` is required.
  - Branch switching boundaries are excluded:
    - projection ratio `t` must stay away from `0` and `1`.

## Function

Define projection parameter:

$$
t = \frac{(p-a)^\top (b-a)}{\|b-a\|_2^2}
$$

Point-segment distance:

$$
d(x)=
\begin{cases}
\|p-a\|_2 & (t \le 0) \\
\|p-b\|_2 & (t \ge 1) \\
\frac{|\operatorname{cross}(b-a,\;p-a)|}{\|b-a\|_2} & (0 < t < 1)
\end{cases}
$$

where `cross([ux,uy],[vx,vy]) = ux vy - uy vx`.

## First-order Derivative

Gradient is piecewise:

- Endpoint A branch (`t < 0`):

$$
\nabla d =
\left[
\frac{p_x-a_x}{\|p-a\|},
\frac{p_y-a_y}{\|p-a\|},
-\frac{p_x-a_x}{\|p-a\|},
-\frac{p_y-a_y}{\|p-a\|},
0,0
\right]
$$

- Endpoint B branch (`t > 1`):

$$
\nabla d =
\left[
\frac{p_x-b_x}{\|p-b\|},
\frac{p_y-b_y}{\|p-b\|},
0,0,
-\frac{p_x-b_x}{\|p-b\|},
-\frac{p_y-b_y}{\|p-b\|}
\right]
$$

- Interior branch (`0 < t < 1`):
  - Same as point-to-infinite-line distance gradient for line `(a,b)`.

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Segment degeneracy is guarded via `minimumSegmentNormSquared`.
- Distance-zero neighborhood is guarded via `minimumDistanceThreshold`.
- Piecewise boundaries (`t=0`, `t=1`) are guarded using a small `branchMargin`.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard projection-based point-segment distance formulas
