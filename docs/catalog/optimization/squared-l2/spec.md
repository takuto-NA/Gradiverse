# Squared L2 Norm Energy

## Definition

- Input: vector `x`
- Output: scalar `f(x)`
- Symbols: `x \in \mathbb{R}^n`
- Shape: `x: (n,)`, `\nabla f(x): (n,)`

## Domain / Assumptions

- `n >= 1`
- `x_i` is finite for all `i`

## Function

Inline form: \( f(x) = \frac{1}{2}\|x\|_2^2 \)

Block form:

$$
f(x) = \frac{1}{2} \sum_{i=1}^{n} x_i^2
$$

## First-order Derivative

$$
\nabla f(x) = x
$$

Component-wise:

$$
\frac{\partial f}{\partial x_i} = x_i
$$

## Second-order (Recommended)

Hessian:

$$
\nabla^2 f(x) = I
$$

Hessian-vector product:

$$
\mathrm{hvp}(x, v) = \nabla^2 f(x) v = v
$$

## Numerical Stability Notes

- This function is polynomial and numerically stable for finite values.
- Use explicit finite checks in implementation to avoid propagating invalid inputs.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: implemented
- `hvp`: implemented
- `domain.sample`: implemented
- `check`: implemented in `test.ts`

## References

- Nocedal, Wright, *Numerical Optimization*
