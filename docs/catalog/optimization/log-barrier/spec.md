# Log Barrier

## Definition

- Input: `x = [c, \mu]`
- Output: `f(x) \in \mathbb{R}`
- Symbols:
  - Constraint scalar: `c`
  - Barrier weight: `\mu`

## Domain / Assumptions

- Inputs are finite values.
- Strict positivity: `c > 0`.
- Non-negative weight: `\mu \ge 0`.

## Function

$$
f(c,\mu) = -\mu \log(c)
$$

## First-order Derivative

$$
\frac{\partial f}{\partial c} = -\frac{\mu}{c}
$$

$$
\frac{\partial f}{\partial \mu} = -\log(c)
$$

## Second-order

$$
\frac{\partial^2 f}{\partial c^2} = \frac{\mu}{c^2},\quad
\frac{\partial^2 f}{\partial c\partial\mu} = -\frac{1}{c},\quad
\frac{\partial^2 f}{\partial \mu^2}=0
$$

- `hess`: implemented
- `hvp`: implemented

## Numerical Stability Notes

- Domain guard enforces `c > minimumConstraintValue`.

## API Availability

- `value`: implemented
- `grad`: implemented
- `hess`: implemented
- `hvp`: implemented
- `domain.sample`: implemented
- `check`: implemented

## References

- Interior-point log barrier formulations
