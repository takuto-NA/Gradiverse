# Repulsive Distance Potentials in 2D

## Definition

- Input: `q = [x1, y1, x2, y2]`
- Output: scalar repulsive cost
- Symbols:
  - `p1 = (x1, y1)`, `p2 = (x2, y2)`
  - `r = p2 - p1 = [dx, dy]`
  - `d = \|r\|_2 = \sqrt{dx^2 + dy^2}`
  - `w > 0`: weight parameter

## Domain / Assumptions

- `x1, y1, x2, y2, w` are finite values.
- `d > 0` is required.
- In implementation, `d` is guarded by `minimumDistanceThreshold`.

## Function

Inverse-distance potential:

$$
\phi_1(q) = \frac{w}{d}
$$

Inverse-squared-distance potential:

$$
\phi_2(q) = \frac{w}{d^2}
$$

## First-order Derivative

For `\phi_1`:

$$
\frac{\partial \phi_1}{\partial x1} = \frac{w\,dx}{d^3},\quad
\frac{\partial \phi_1}{\partial y1} = \frac{w\,dy}{d^3},\quad
\frac{\partial \phi_1}{\partial x2} = -\frac{w\,dx}{d^3},\quad
\frac{\partial \phi_1}{\partial y2} = -\frac{w\,dy}{d^3}
$$

For `\phi_2`:

$$
\frac{\partial \phi_2}{\partial x1} = \frac{2w\,dx}{d^4},\quad
\frac{\partial \phi_2}{\partial y1} = \frac{2w\,dy}{d^4},\quad
\frac{\partial \phi_2}{\partial x2} = -\frac{2w\,dx}{d^4},\quad
\frac{\partial \phi_2}{\partial y2} = -\frac{2w\,dy}{d^4}
$$

## Second-order Derivative (Hessian)

Define 2x2 blocks:

$$
H_1 = \frac{w}{d^5}\left(3rr^\top - d^2 I\right),\quad
H_2 = \frac{2w}{d^6}\left(4rr^\top - d^2 I\right)
$$

Then:

$$
\nabla^2 \phi_k(q) =
\begin{bmatrix}
H_k & -H_k \\
-H_k & H_k
\end{bmatrix},
\quad k\in\{1,2\}
$$

## Numerical Stability Notes

- As `d -> 0`, derivatives diverge quickly.
- Keep a positive minimum distance in sampling and simulation.
- Use consistent thresholds between runtime and tests.

## API Availability

- `inverseDistanceValue`, `inverseDistanceGradient`, `inverseDistanceHessian`
- `inverseSquaredDistanceValue`, `inverseSquaredDistanceGradient`, `inverseSquaredDistanceHessian`
- `inverseDistanceHvp`, `inverseSquaredDistanceHvp`
- `domain.sample`

## References

- Pairwise repulsive potentials used in collision avoidance and particle systems
