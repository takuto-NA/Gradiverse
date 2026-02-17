/**
 * Responsibility:
 * Provide a language-agnostic derivative card implementation template
 * with value, gradient, optional Hessian-vector product, and domain sampling.
 */

export type Vector = number[];

export type CardParameters = {
  scaleParameter: number;
};

export type DomainSampler = (seed: number, sampleCount: number) => Vector[];

const DEFAULT_SCALE_PARAMETER = 1.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;
const DOMAIN_LOWER_BOUND = -1.0;
const DOMAIN_UPPER_BOUND = 1.0;

export const domain: { sample: DomainSampler } = {
  sample(seed: number, sampleCount: number): Vector[] {
    // Guard: sampleCount must be non-negative for deterministic sampling.
    if (sampleCount < 0) {
      throw new Error("sampleCount must be greater than or equal to zero.");
    }

    const sampledVectors: Vector[] = [];
    let currentSeed = seed >>> 0;

    for (let index = 0; index < sampleCount; index += 1) {
      currentSeed =
        (LINEAR_CONGRUENTIAL_MULTIPLIER * currentSeed +
          LINEAR_CONGRUENTIAL_INCREMENT) %
        LINEAR_CONGRUENTIAL_MODULUS;
      const randomUnitValue = currentSeed / LINEAR_CONGRUENTIAL_MODULUS;
      const sampledValue =
        DOMAIN_LOWER_BOUND +
        (DOMAIN_UPPER_BOUND - DOMAIN_LOWER_BOUND) * randomUnitValue;
      sampledVectors.push([sampledValue]);
    }

    return sampledVectors;
  },
};

export function value(
  inputVector: Vector,
  parameters: CardParameters = { scaleParameter: DEFAULT_SCALE_PARAMETER },
): number {
  const [x0] = inputVector;
  return parameters.scaleParameter * x0 * x0;
}

export function grad(
  inputVector: Vector,
  parameters: CardParameters = { scaleParameter: DEFAULT_SCALE_PARAMETER },
): Vector {
  const [x0] = inputVector;
  return [2.0 * parameters.scaleParameter * x0];
}

export function hvp(
  inputVector: Vector,
  directionVector: Vector,
  parameters: CardParameters = { scaleParameter: DEFAULT_SCALE_PARAMETER },
): Vector {
  // Guard: input and direction must have identical dimensionality.
  if (inputVector.length !== directionVector.length) {
    throw new Error("inputVector and directionVector must have identical sizes.");
  }

  return [2.0 * parameters.scaleParameter * directionVector[0]];
}

export function hess(): never {
  throw new Error("hess is not implemented. Use hvp instead.");
}
