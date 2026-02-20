/**
 * Responsibility:
 * Provide smooth softplus penalty derivatives for scalar constraint values.
 */

export type InputVector = [number, number, number];
export type GradientVector = [number, number, number];
export type HessianMatrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

const CONSTRAINT_VALUE_INDEX = 0;
const SHARPNESS_BETA_INDEX = 1;
const PENALTY_WEIGHT_INDEX = 2;

const MINIMUM_SHARPNESS_BETA = 1e-8;
const MINIMUM_PENALTY_WEIGHT = 0.0;
const DOMAIN_CONSTRAINT_LOWER_BOUND = -2.0;
const DOMAIN_CONSTRAINT_UPPER_BOUND = 2.0;
const DOMAIN_BETA_LOWER_BOUND = 0.5;
const DOMAIN_BETA_UPPER_BOUND = 8.0;
const DOMAIN_WEIGHT_LOWER_BOUND = 0.1;
const DOMAIN_WEIGHT_UPPER_BOUND = 4.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for stable softplus evaluation.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertParameterDomain(
  sharpnessBeta: number,
  penaltyWeight: number,
): void {
  // Guard: softplus smoothing requires positive beta.
  if (sharpnessBeta <= MINIMUM_SHARPNESS_BETA) {
    throw new Error(`beta must be greater than ${MINIMUM_SHARPNESS_BETA}.`);
  }
  // Guard: penalty weight must be non-negative.
  if (penaltyWeight < MINIMUM_PENALTY_WEIGHT) {
    throw new Error("penalty weight must be greater than or equal to zero.");
  }
}

function stableSoftplusLogTerm(betaTimesConstraint: number): number {
  if (betaTimesConstraint > 0.0) {
    return betaTimesConstraint + Math.log1p(Math.exp(-betaTimesConstraint));
  }
  return Math.log1p(Math.exp(betaTimesConstraint));
}

function sigmoid(value: number): number {
  if (value >= 0.0) {
    const negativeExponential = Math.exp(-value);
    return 1.0 / (1.0 + negativeExponential);
  }
  const positiveExponential = Math.exp(value);
  return positiveExponential / (1.0 + positiveExponential);
}

function multiplyHessianAndDirection(
  hessianMatrix: HessianMatrix,
  directionVector: GradientVector,
): GradientVector {
  const productVector: GradientVector = [0.0, 0.0, 0.0];
  for (let rowIndex = 0; rowIndex < hessianMatrix.length; rowIndex += 1) {
    let rowSum = 0.0;
    for (let columnIndex = 0; columnIndex < directionVector.length; columnIndex += 1) {
      rowSum += hessianMatrix[rowIndex][columnIndex] * directionVector[columnIndex];
    }
    productVector[rowIndex] = rowSum;
  }
  return productVector;
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const constraintValue = inputVector[CONSTRAINT_VALUE_INDEX];
  const sharpnessBeta = inputVector[SHARPNESS_BETA_INDEX];
  const penaltyWeight = inputVector[PENALTY_WEIGHT_INDEX];
  assertParameterDomain(sharpnessBeta, penaltyWeight);

  const betaTimesConstraint = sharpnessBeta * constraintValue;
  return (
    (penaltyWeight / sharpnessBeta) * stableSoftplusLogTerm(betaTimesConstraint)
  );
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const constraintValue = inputVector[CONSTRAINT_VALUE_INDEX];
  const sharpnessBeta = inputVector[SHARPNESS_BETA_INDEX];
  const penaltyWeight = inputVector[PENALTY_WEIGHT_INDEX];
  assertParameterDomain(sharpnessBeta, penaltyWeight);

  const betaTimesConstraint = sharpnessBeta * constraintValue;
  const sigmoidValue = sigmoid(betaTimesConstraint);
  const softplusLogTerm = stableSoftplusLogTerm(betaTimesConstraint);

  const derivativeConstraint = penaltyWeight * sigmoidValue;
  const derivativeBeta =
    penaltyWeight *
    ((constraintValue * sigmoidValue) / sharpnessBeta -
      softplusLogTerm / (sharpnessBeta * sharpnessBeta));
  const derivativeWeight = softplusLogTerm / sharpnessBeta;
  return [derivativeConstraint, derivativeBeta, derivativeWeight];
}

export function hess(inputVector: InputVector): HessianMatrix {
  assertFiniteValues(inputVector, "inputVector");
  const constraintValue = inputVector[CONSTRAINT_VALUE_INDEX];
  const sharpnessBeta = inputVector[SHARPNESS_BETA_INDEX];
  const penaltyWeight = inputVector[PENALTY_WEIGHT_INDEX];
  assertParameterDomain(sharpnessBeta, penaltyWeight);

  const betaTimesConstraint = sharpnessBeta * constraintValue;
  const sigmoidValue = sigmoid(betaTimesConstraint);
  const sigmoidDerivative = sigmoidValue * (1.0 - sigmoidValue);
  const softplusLogTerm = stableSoftplusLogTerm(betaTimesConstraint);

  const d2ConstraintConstraint =
    penaltyWeight * sharpnessBeta * sigmoidDerivative;
  const d2ConstraintBeta =
    penaltyWeight * constraintValue * sigmoidDerivative;
  const d2ConstraintWeight = sigmoidValue;
  const d2BetaBeta =
    penaltyWeight *
    (constraintValue * constraintValue * sigmoidDerivative / sharpnessBeta -
      (2.0 * constraintValue * sigmoidValue) / (sharpnessBeta * sharpnessBeta) +
      (2.0 * softplusLogTerm) /
        (sharpnessBeta * sharpnessBeta * sharpnessBeta));
  const d2BetaWeight =
    (constraintValue * sigmoidValue) / sharpnessBeta -
    softplusLogTerm / (sharpnessBeta * sharpnessBeta);
  const d2WeightWeight = 0.0;

  return [
    [d2ConstraintConstraint, d2ConstraintBeta, d2ConstraintWeight],
    [d2ConstraintBeta, d2BetaBeta, d2BetaWeight],
    [d2ConstraintWeight, d2BetaWeight, d2WeightWeight],
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
      const randomBeta = sampleUnitInterval();
      const randomWeight = sampleUnitInterval();
      const constraintValue =
        DOMAIN_CONSTRAINT_LOWER_BOUND +
        (DOMAIN_CONSTRAINT_UPPER_BOUND - DOMAIN_CONSTRAINT_LOWER_BOUND) *
          randomConstraint;
      const sharpnessBeta =
        DOMAIN_BETA_LOWER_BOUND +
        (DOMAIN_BETA_UPPER_BOUND - DOMAIN_BETA_LOWER_BOUND) * randomBeta;
      const penaltyWeight =
        DOMAIN_WEIGHT_LOWER_BOUND +
        (DOMAIN_WEIGHT_UPPER_BOUND - DOMAIN_WEIGHT_LOWER_BOUND) * randomWeight;
      sampledInputs.push([constraintValue, sharpnessBeta, penaltyWeight]);
    }
    return sampledInputs;
  },
};
