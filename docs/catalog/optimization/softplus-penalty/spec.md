# Softplus Penalty

## Definition

- Input: `x = [c, beta, w]`
- Output: `f(x) \in \mathbb{R}_{\ge 0}`
- Symbols:
  - Constraint scalar: `c`
  - Sharpness: `beta`
  - Penalty weight: `w`

## Domain / Assumptions

- Inputs are finite values.
- `beta > 0`.
- `w \ge 0`.

## Function

$$
f(c,\beta,w)=\frac{w}{\beta}\log\left(1+e^{\beta c}\right)
$$

This is a smooth approximation of a positive-part penalty.

## First-order Derivative

Let:

$$
\sigma(z)=\frac{1}{1+e^{-z}},\quad z=\beta c
$$

Then:

$$
\frac{\partial f}{\partial c}=w\,\sigma(z)
$$

$$
\frac{\partial f}{\partial \beta}
=w\left(
\frac{c\,\sigma(z)}{\beta}
-\frac{\log(1+e^z)}{\beta^2}
\right)
$$

$$
\frac{\partial f}{\partial w}
=\frac{1}{\beta}\log(1+e^z)
$$

## Second-order

- `hess`: implemented
- `hvp`: implemented

## Numerical Stability Notes

- `log(1+e^z)` is evaluated with a stable branch (`log1p` form).
- Sigmoid is evaluated with sign-aware stable branches.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: implemented
- `hvp`: implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Smooth penalty formulations in constrained optimization
