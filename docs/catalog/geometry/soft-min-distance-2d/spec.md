# Soft-Min Distance in 2D

## Definition

- Input: `x = [px, py, ax, ay, bx, by, beta]`
- Output: `f(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Query point: `p=(px,py)`
  - Anchor points: `a=(ax,ay), b=(bx,by)`
  - Distances: `d_a=\|p-a\|_2,\; d_b=\|p-b\|_2`
  - Sharpness: `beta > 0`

## Domain / Assumptions

- All inputs are finite values.
- `beta > 0`.
- For gradient, `d_a > 0` and `d_b > 0`.

## Function

Smooth minimum:

$$
f(x) = -\frac{1}{\beta}\log\left(e^{-\beta d_a}+e^{-\beta d_b}\right)
$$

As `beta \to \infty`, `f` approaches `\min(d_a,d_b)`.

## First-order Derivative

Define soft weights:

$$
w_a=\frac{e^{-\beta d_a}}{e^{-\beta d_a}+e^{-\beta d_b}},\quad
w_b=1-w_a
$$

Then for spatial coordinates:

$$
\nabla_{spatial} f = w_a \nabla d_a + w_b \nabla d_b
$$

with:

$$
\nabla d_a = \left[\frac{p_x-a_x}{d_a},\frac{p_y-a_y}{d_a},-\frac{p_x-a_x}{d_a},-\frac{p_y-a_y}{d_a},0,0\right]
$$

$$
\nabla d_b = \left[\frac{p_x-b_x}{d_b},\frac{p_y-b_y}{d_b},0,0,-\frac{p_x-b_x}{d_b},-\frac{p_y-b_y}{d_b}\right]
$$

Beta derivative:

$$
\frac{\partial f}{\partial \beta}
=\frac{\mathbb{E}_w[d]-f}{\beta},
\quad
\mathbb{E}_w[d]=w_a d_a + w_b d_b
$$

## Second-order

- `hess`: not implemented
- `hvp`: not implemented

## Numerical Stability Notes

- Uses stable log-sum-exp evaluation with max-shift.
- Guards:
  - minimum distance threshold
  - minimum positive beta

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: not implemented
- `hvp`: not implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Log-sum-exp smoothing for minimum functions
