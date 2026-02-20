# Segment-Segment Distance in 2D

## Definition

- Input: `x = [a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y]`
- Output: `d(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Segment A endpoints: `a0, a1`
  - Segment B endpoints: `b0, b1`

## Domain / Assumptions

- All inputs are finite values.
- Both segments are non-degenerate.
- For gradient:
  - segments are non-intersecting
  - active minimum candidate branch is unique
  - projection branch boundaries on point-segment subproblems are excluded

## Function

Distance uses the minimum of four endpoint-to-segment candidates:

$$
d(x) = \min\big(
d_{seg}(a0, \overline{b0b1}),
d_{seg}(a1, \overline{b0b1}),
d_{seg}(b0, \overline{a0a1}),
d_{seg}(b1, \overline{a0a1})
\big)
$$

If segments strictly intersect, value is:

$$
d(x)=0
$$

## First-order Derivative

Gradient is piecewise:

- For non-intersecting and unique active candidate, `\nabla d` equals that candidate gradient.
- Each candidate gradient is taken from the corresponding point-segment distance derivative and mapped back to global coordinates.

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Guards:
  - minimum segment norm threshold
  - minimum distance threshold
  - projection branch margin (`t` near 0 or 1)
  - candidate tie margin for branch uniqueness
- Intersecting case is handled in `value`, but `grad` is rejected as non-unique.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Piecewise segment distance construction from point-segment primitives
