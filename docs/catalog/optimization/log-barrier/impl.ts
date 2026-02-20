/**
 * Responsibility:
 * Provide analytical derivatives for scalar log barrier.
 */

export type InputVector = [number, number];
export type GradientVector = [number, number];
export type HessianMatrix = [[number, number], [number, number]];

const CONSTRAINT_VALUE_INDEX = 0;
const BARRIER_WEIGHT_INDEX = 1;

const MINIMUM_CONSTRAINT_VALUE = 1e-10;
const MINIMUM_BARRIER_WEIGHT = 0.0;
const DOMAIN_CONSTRAINT_LOWER_BOUND = 0.1;
const DOMAIN_CONSTRAINT_UPPER_BOUND = 2.0;
const DOMAIN_WEIGHT_LOWER_BOUND = 0.1;
const DOMAIN_WEIGHT_UPPER_BOUND = 4.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for barrier derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertDomain(constraintValue: number, barrierWeight: number): void {
  // Guard: logarithm barrier requires strictly positive domain.
  if (constraintValue <= MINIMUM_CONSTRAINT_VALUE) {
    throw new Error(
      `constraint value must be greater than ${MINIMUM_CONSTRAINT_VALUE}.`,
    );
  }
  // Guard: barrier weight must be non-negative.
  if (barrierWeight < MINIMUM_BARRIER_WEIGHT) {
    throw new Error("barrier weight must be greater than or equal to zero.");
  }
}

function multiplyHessianAndDirection(
  hessianMatrix: HessianMatrix,
  directionVector: GradientVector,
): GradientVector {
  return [
    hessianMatrix[0][0] * directionVector[0] +
      hessianMatrix[0][1] * directionVector[1],
    hessianMatrix[1][0] * directionVector[0] +
      hessianMatrix[1][1] * directionVector[1],
  ];
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const constraintValue = inputVector[CONSTRAINT_VALUE_INDEX];
  const barrierWeight = inputVector[BARRIER_WEIGHT_INDEX];
  assertDomain(constraintValue, barrierWeight);
  return -barrierWeight * Math.log(constraintValue);
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const constraintValue = inputVector[CONSTRAINT_VALUE_INDEX];
  const barrierWeight = inputVector[BARRIER_WEIGHT_INDEX];
  assertDomain(constraintValue, barrierWeight);
  return [-barrierWeight / constraintValue, -Math.log(constraintValue)];
}

export function hess(inputVector: InputVector): HessianMatrix {
  assertFiniteValues(inputVector, "inputVector");
  const constraintValue = inputVector[CONSTRAINT_VALUE_INDEX];
  const barrierWeight = inputVector[BARRIER_WEIGHT_INDEX];
  assertDomain(constraintValue, barrierWeight);
  return [
    [
      barrierWeight / (constraintValue * constraintValue),
      -1.0 / constraintValue,
    ],
    [-1.0 / constraintValue, 0.0],
  ];
}

export function hvp(
  inputVector: InputVector,
  directionVector: GradientVector,
): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  assertFiniteValues(directionVector, "directionVector");
  return multiplyHessianAndDirection(hess(inputVector), directionVector);
}

export const domain = {
  sample(seed: number, sampleCount: number): InputVector[] {
    // Guard: sampleCount must be non-negative.
    if (sampleCount < 0) {
      throw new Error("sampleCount must be greater than or equal to zero.");
    }
    const sampledInputs: InputVector[] = [];
    let currentSeed = seed >>> 0;

    function sampleUnitInterval(): number {
      currentSeed =
        (LINEAR_CONGRUENTIAL_MULTIPLIER * currentSeed +
          LINEAR_CONGRUENTIAL_INCREMENT) %
        LINEAR_CONGRUENTIAL_MODULUS;
      return currentSeed / LINEAR_CONGRUENTIAL_MODULUS;
    }

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const randomConstraint = sampleUnitInterval();
      const randomWeight = sampleUnitInterval();
      const constraintValue =
        DOMAIN_CONSTRAINT_LOWER_BOUND +
        (DOMAIN_CONSTRAINT_UPPER_BOUND - DOMAIN_CONSTRAINT_LOWER_BOUND) *
          randomConstraint;
      const barrierWeight =
        DOMAIN_WEIGHT_LOWER_BOUND +
        (DOMAIN_WEIGHT_UPPER_BOUND - DOMAIN_WEIGHT_LOWER_BOUND) * randomWeight;
      sampledInputs.push([constraintValue, barrierWeight]);
    }
    return sampledInputs;
  },
};
