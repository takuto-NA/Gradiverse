# Rigid-Body Local-Point Distance in 2D

## Definition

- State input:
  - `x = [pAx, pAy, thetaA, pBx, pBy, thetaB]`
- Parameter input:
  - `rA = [rAx, rAy]` (local point on rigid body A)
  - `rB = [rBx, rBy]` (local point on rigid body B)
- Rotation:
  - `R(theta) = [[cos(theta), -sin(theta)], [sin(theta), cos(theta)]]`
- Global points:
  - `RA = pA + R(thetaA) rA`
  - `RB = pB + R(thetaB) rB`
- Relative vector:
  - `u = RB - RA`
- Cost:
  - `d = ||u||_2`

## Domain / Assumptions

- All values are finite.
- `d > 0` is required for differentiability of `d`.
- Implementation guards with `minimumDistanceThreshold`.

## Function

$$
RA = pA + R(\theta_A) rA,\quad
RB = pB + R(\theta_B) rB
$$

$$
u = RB - RA,\quad
d(x; rA, rB) = \|u\|_2
$$

## First-order Derivative

Let:

$$
n = \frac{u}{d},\quad
S=\begin{bmatrix}0&-1\\1&0\end{bmatrix}
$$

Then:

$$
\frac{\partial u}{\partial pA}=-I,\quad
\frac{\partial u}{\partial pB}=I,\quad
\frac{\partial u}{\partial \theta_A}=-R(\theta_A)SrA,\quad
\frac{\partial u}{\partial \theta_B}=R(\theta_B)SrB
$$

Gradient components:

$$
\frac{\partial d}{\partial pA}=-n,\quad
\frac{\partial d}{\partial pB}=n
$$

$$
\frac{\partial d}{\partial \theta_A}=n^\top\!\left(-R(\theta_A)SrA\right),\quad
\frac{\partial d}{\partial \theta_B}=n^\top\!\left(R(\theta_B)SrB\right)
$$

## Second-order Derivative

For state components `x_i, x_j`:

$$
\frac{\partial^2 d}{\partial x_i \partial x_j}
=
\frac{1}{d}
\left(\frac{\partial u}{\partial x_i}\right)^\top
\left(I-nn^\top\right)
\left(\frac{\partial u}{\partial x_j}\right)
+
n^\top
\frac{\partial^2 u}{\partial x_i \partial x_j}
$$

Non-zero second derivatives of `u`:

$$
\frac{\partial^2 u}{\partial \theta_A^2}=R(\theta_A)rA,\quad
\frac{\partial^2 u}{\partial \theta_B^2}=-R(\theta_B)rB
$$

All mixed second derivatives of `u` are zero.

## Numerical Stability Notes

- Near `d = 0`, derivatives become ill-conditioned.
- Sampling enforces minimum point separation.

## API Availability

- `globalPointA`, `globalPointB`
- `value`, `grad`, `hess`, `hvp`
- `domain.sample`

## References

- Standard rigid-body kinematics and norm differentiation identities
