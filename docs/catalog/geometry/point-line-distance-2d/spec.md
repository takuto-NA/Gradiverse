# Point-Line Distance in 2D

## Definition

- Input: `x = [px, py, ax, ay, bx, by]`
- Output: `d(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Point: `p = (px, py)`
  - Line anchor A: `a = (ax, ay)`
  - Line anchor B: `b = (bx, by)`
  - Line direction: `u = b - a`

## Domain / Assumptions

- `px, py, ax, ay, bx, by` are finite values.
- Line direction must be non-degenerate: `\|u\|_2^2 > 0`.
- For gradient of unsigned distance, `d(x) > 0` is required.
  - At `d = 0`, unsigned distance has a non-unique first derivative.

## Function

Let:

$$
u = b-a,\quad w = p-a
$$

Using 2D scalar cross product:

$$
\operatorname{cross}(u,w)=u_x w_y-u_y w_x
$$

Distance to the infinite line through `a,b`:

$$
d(x) = \frac{|\operatorname{cross}(u,w)|}{\|u\|_2}
$$

Equivalent smooth form away from `d=0`:

$$
d(x) = \sqrt{\frac{\operatorname{cross}(u,w)^2}{u^\top u}}
$$

## First-order Derivative

Let:

$$
N=\operatorname{cross}(u,w),\quad V=u^\top u,\quad g=\frac{N^2}{V},\quad d=\sqrt{g}
$$

Then:

$$
\nabla d = \frac{1}{2d}\nabla g
$$

$$
\nabla g = \frac{2N(\nabla N)V - N^2(\nabla V)}{V^2}
$$

For `x = [px, py, ax, ay, bx, by]`:

$$
\nabla N =
\left[
-u_y,\;
u_x,\;
b_y-p_y,\;
p_x-b_x,\;
p_y-a_y,\;
a_x-p_x
\right]
$$

$$
\nabla V =
\left[
0,\;
0,\;
-2u_x,\;
-2u_y,\;
2u_x,\;
2u_y
\right]
$$

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Degenerate lines are guarded with `minimumLineDirectionNormSquared`.
- Gradient is guarded near `d = 0` with `minimumDistanceThreshold`.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard Euclidean geometry (point-to-line distance identities)
