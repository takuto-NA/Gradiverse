# Point-Triangle Distance in 3D

## Definition

- Input: `x = [px, py, pz]`
- Parameters: triangle vertices `a, b, c \in \mathbb{R}^3`
- Output: `f(x) \in \mathbb{R}_{\ge 0}`

## Domain / Assumptions

- Input and triangle parameters are finite values.
- Triangle is non-degenerate.
- For gradient, active minimum branch is unique.

## Function

Distance is the minimum among:

1. interior projection distance to the triangle plane (when projection is inside triangle)
2. three edge-segment distances (`ab`, `bc`, `ca`)

So:

$$
f(p) = \min\left(d_{interior}(p,\triangle abc),\ d_{seg}(p,ab),\ d_{seg}(p,bc),\ d_{seg}(p,ca)\right)
$$

## First-order Derivative

Gradient is piecewise wrt point `p`:

- interior branch: normalized plane normal with sign of signed distance
- edge branch: normalized vector from closest point on active segment to `p`

At branch ties, gradient is non-unique and guarded.

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Guards:
  - minimum triangle normal norm
  - minimum distance threshold
  - minimum signed distance threshold in interior branch
  - branch tie margin for unique minimum

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Standard closest-point construction for triangle distance in 3D
