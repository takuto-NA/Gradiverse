# Signed Point-Line Distance in 2D

## Definition

- Input: `x = [px, py, ax, ay, bx, by]`
- Output: `d_s(x) \in \mathbb{R}`
- Symbols:
  - Query point: `p = (px, py)`
  - Line anchor A: `a = (ax, ay)`
  - Line anchor B: `b = (bx, by)`
  - Direction: `u = b - a`

## Domain / Assumptions

- `px, py, ax, ay, bx, by` are finite values.
- Line direction is non-degenerate: `\|u\|_2^2 > 0`.

## Function

Let:

$$
w = p-a,\quad
\operatorname{cross}(u,w)=u_x w_y-u_y w_x
$$

Signed distance:

$$
d_s(x) = \frac{\operatorname{cross}(u,w)}{\|u\|_2}
$$

## First-order Derivative

Define:

$$
N=\operatorname{cross}(u,w),\quad V=u^\top u
$$

Then:

$$
d_s = N V^{-1/2},\quad
\nabla d_s = V^{-1/2}\nabla N - \frac{1}{2}N V^{-3/2}\nabla V
$$

For `x=[px,py,ax,ay,bx,by]`:

$$
\nabla N=
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
\nabla V=
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

- Line degeneracy is guarded via `minimumLineDirectionNormSquared`.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard oriented-distance identities in 2D geometry
