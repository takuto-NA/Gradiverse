# Tangent-Point Pair Energy in 2D

## Purpose

This card defines one pair contribution of Tangent Point Energy (TPE):

- point `p_i` with normal `n_i`
- point `p_j`
- scalar pair energy `E_ij`

It is the base term used by total TPE over all point pairs.

## Definition

- Input:
  - `x = [pIx, pIy, pJx, pJy]`
- Parameters:
  - `n_i = [nix, niy]` (normal vector at `p_i`)
  - `alpha > 0` (exponent)
- Symbols:
  - `r = p_j - p_i`
  - `d^2 = |r|^2`
  - `a = n_i · r`

Pair energy:

$$
E_{ij} = \left(\frac{2|a|}{d^2}\right)^\alpha
$$

## Domain / Assumptions

- All values are finite.
- `alpha > 0`.
- `d > 0` and `|a| > 0` are required for differentiability.
- Implementation guards:
  - `d > 1e-8`
  - `|a| > 1e-10`

## First-order Derivative

For `r = p_j - p_i` and `a = n_i · r`:

$$
\frac{\partial E_{ij}}{\partial p_j}
=
\alpha E_{ij}
\left(
\frac{n_i}{a}
-
\frac{2r}{|r|^2}
\right)
$$

$$
\frac{\partial E_{ij}}{\partial p_i}
=
-
\frac{\partial E_{ij}}{\partial p_j}
$$

## Numerical Verification

- `test.ts` compares analytical `grad` with central-difference gradient.
- Fixed seed, epsilon, and tolerances are used for reproducibility.

## API Availability

- `value(inputVector, parameters) -> number`
- `grad(inputVector, parameters) -> GradientVector`
- `domain.sample(seed, sampleCount) -> InputVector[]`
- `check() -> void`

## File Structure

- `spec.md`: mathematical definition and derivatives
- `impl.ts`: analytical implementation
- `test.ts`: finite-difference verification
- `meta.yaml`: catalog metadata

## References

- Tangent Point Energy formulations for self-avoiding curves
