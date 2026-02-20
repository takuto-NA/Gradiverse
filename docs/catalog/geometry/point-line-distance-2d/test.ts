/**
 * Responsibility:
 * Verify analytical gradient for 2D point-to-line distance.
 */

import { domain, grad, value, type GradientVector, type InputVector } from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const TEST_RANDOM_SEED = 23;
const TEST_SAMPLE_COUNT = 10;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const DEFAULT_TOLERANCE: Tolerance = {
  absoluteTolerance: 1e-6,
  relativeTolerance: 1e-6,
};

function assertApproximatelyEqual(
  actualValue: number,
  expectedValue: number,
  tolerance: Tolerance = DEFAULT_TOLERANCE,
): void {
  const absoluteError = Math.abs(actualValue - expectedValue);
  const scale = Math.max(Math.abs(expectedValue), 1.0);
  const allowedError =
    tolerance.absoluteTolerance + tolerance.relativeTolerance * scale;
  // Guard: fail immediately when approximation constraint is violated.
  if (absoluteError > allowedError) {
    throw new Error(
      `Approximation failed. actual=${actualValue}, expected=${expectedValue}, allowed=${allowedError}`,
    );
  }
}

function assertVectorApproximatelyEqual(
  actualVector: number[],
  expectedVector: number[],
): void {
  if (actualVector.length !== expectedVector.length) {
    throw new Error("Vector dimensions must match.");
  }
  for (let componentIndex = 0; componentIndex < actualVector.length; componentIndex += 1) {
    assertApproximatelyEqual(actualVector[componentIndex], expectedVector[componentIndex]);
  }
}

function estimateGradientByCentralDifference(inputVector: InputVector): GradientVector {
  const gradientComponents: number[] = [];
  for (let componentIndex = 0; componentIndex < inputVector.length; componentIndex += 1) {
    const positiveInput: InputVector = [...inputVector];
    positiveInput[componentIndex] += CENTRAL_DIFFERENCE_EPSILON;
    const negativeInput: InputVector = [...inputVector];
    negativeInput[componentIndex] -= CENTRAL_DIFFERENCE_EPSILON;
    const positiveValue = value(positiveInput);
    const negativeValue = value(negativeInput);
    gradientComponents.push((positiveValue - negativeValue) / (2.0 * CENTRAL_DIFFERENCE_EPSILON));
  }
  return gradientComponents as GradientVector;
}

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);
  for (const sampledInput of sampledInputs) {
    const analyticalGradient = grad(sampledInput);
    const numericalGradient = estimateGradientByCentralDifference(sampledInput);
    assertVectorApproximatelyEqual(analyticalGradient, numericalGradient);
  }
}
