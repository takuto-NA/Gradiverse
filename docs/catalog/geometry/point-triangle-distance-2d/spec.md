# Point-Triangle Distance in 2D

## Definition

- Input: `x = [px, py, ax, ay, bx, by, cx, cy]`
- Output: `d(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Query point: `p = (px, py)`
  - Triangle vertices: `a=(ax,ay), b=(bx,by), c=(cx,cy)`

## Domain / Assumptions

- All inputs are finite values.
- Triangle edges `ab`, `bc`, `ca` are non-degenerate.
- For gradient:
  - `d(x) > 0`
  - active minimum edge branch must be unique
  - projection branch boundaries on each edge (`t=0,1`) are excluded

## Function

Distance to triangle boundary is the minimum of edge-segment distances:

$$
d(x)=\min\left(d_{seg}(p,ab),\;d_{seg}(p,bc),\;d_{seg}(p,ca)\right)
$$

where `d_seg` is standard 2D point-segment distance.

## First-order Derivative

The gradient is piecewise:

- On a unique active edge branch, `\nabla d` equals that edge distance gradient.
- If multiple edge candidates share the minimum, gradient is non-unique (guarded).

For each active edge distance:
- endpoint branch uses normalized point-to-endpoint vector derivatives
- interior branch uses point-line distance derivatives on that edge

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Guards:
  - minimum segment norm threshold
  - minimum distance threshold
  - projection boundary margin (`t` near 0 or 1)
  - candidate tie margin for branch uniqueness

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Piecewise point-segment distance differentiation
