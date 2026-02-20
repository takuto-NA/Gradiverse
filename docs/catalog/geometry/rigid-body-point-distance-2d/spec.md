# Rigid-Body Local-Point Distance in 2D

## Purpose

This card computes the Euclidean distance between two local points attached to two 2D rigid bodies.

- Body A has global pose `(pAx, pAy, thetaA)` and local point `rA`.
- Body B has global pose `(pBx, pBy, thetaB)` and local point `rB`.
- The card transforms `rA` and `rB` into global coordinates, then returns their distance.

## State Vector Format

`StateVector = [pAx, pAy, thetaA, pBx, pBy, thetaB]`

- `pAx, pAy`: global position of body A
- `thetaA`: rotation angle of body A in radians (counterclockwise)
- `pBx, pBy`: global position of body B
- `thetaB`: rotation angle of body B in radians (counterclockwise)

## Parameters

`Parameters = { localPointA: [rAx, rAy], localPointB: [rBx, rBy] }`

- `localPointA`: point coordinates in body A local frame
- `localPointB`: point coordinates in body B local frame

## Definition and Notation

- State input:
  - `x = [pAx, pAy, thetaA, pBx, pBy, thetaB]`
- Parameter input:
  - `rA = [rAx, rAy]` (local point on body A)
  - `rB = [rBx, rBy]` (local point on body B)
- Rotation matrix convention:
  - `R(theta)` is an active counterclockwise rotation in a right-handed 2D frame
  - `R(theta) = [[cos(theta), -sin(theta)], [sin(theta), cos(theta)]]`
- Global points:
  - `RA = pA + R(thetaA) rA`
  - `RB = pB + R(thetaB) rB`
- Relative vector:
  - `u = RB - RA`
- Cost:
  - `d = ||u||_2`
  - `s = d^2 = ||u||_2^2`

## Domain Constraints

- All state and parameter values must be finite.
- Distance-based derivatives (`grad`, `hess`, `hvp`) require:
  - `d > minimumDistanceThreshold`
  - Current threshold in implementation: `minimumDistanceThreshold = 1e-8`
- Squared-distance derivatives (`squaredGrad`, `squaredHess`, `squaredHvp`) do not divide by `d` and are better conditioned near zero distance.

## Function

$$
RA = pA + R(\theta_A) rA,\quad
RB = pB + R(\theta_B) rB
$$

$$
u = RB - RA,\quad
d(x; rA, rB) = \|u\|_2
$$

$$
s(x; rA, rB) = d^2 = u^\top u
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

## Squared Distance Derivative (Simpler Form)

For `s = u^\top u`:

$$
\frac{\partial s}{\partial x_i}
=
2u^\top \frac{\partial u}{\partial x_i}
$$

$$
\frac{\partial^2 s}{\partial x_i \partial x_j}
=
2\left(
\left(\frac{\partial u}{\partial x_i}\right)^\top
\left(\frac{\partial u}{\partial x_j}\right)
+
u^\top\frac{\partial^2 u}{\partial x_i \partial x_j}
\right)
$$

`s` does not require division by `d`, so it is algebraically simpler and numerically better conditioned near small distances.

## Numerical Stability Notes

- Near `d = 0`, derivatives become ill-conditioned.
- Sampling enforces minimum point separation.

## API Availability

### Geometry helpers

- `globalPointA(stateVector: StateVector, parameters: Parameters): Vector2`
- `globalPointB(stateVector: StateVector, parameters: Parameters): Vector2`

### Distance API

- `value(stateVector: StateVector, parameters: Parameters): number`
- `grad(stateVector: StateVector, parameters: Parameters): GradientVector`
- `hess(stateVector: StateVector, parameters: Parameters): HessianMatrix`
- `hvp(stateVector: StateVector, directionVector: GradientVector, parameters: Parameters): GradientVector`

### Squared-distance API

- `squaredValue(stateVector: StateVector, parameters: Parameters): number`
- `squaredGrad(stateVector: StateVector, parameters: Parameters): GradientVector`
- `squaredHess(stateVector: StateVector, parameters: Parameters): HessianMatrix`
- `squaredHvp(stateVector: StateVector, directionVector: GradientVector, parameters: Parameters): GradientVector`

### Domain sampler

- `domain.sample(seed: number, sampleCount: number): StateVector[]`

## File Structure

- `spec.md`: mathematical specification and constraints
- `impl.ts`: analytical implementation for value/derivatives
- `test.ts`: finite-difference numerical verification via `check()`
- `meta.yaml`: catalog metadata and API implementation status

## References

- Standard rigid-body kinematics and norm differentiation identities
