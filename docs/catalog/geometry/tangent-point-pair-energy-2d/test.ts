/**
 * Responsibility:
 * Numerically verify analytical gradient for 2D tangent-point pair energy.
 */

import { domain, grad, value, type GradientVector, type InputVector, type Parameters } from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const TEST_RANDOM_SEED = 41;
const TEST_SAMPLE_COUNT = 10;
const CENTRAL_DIFFERENCE_EPSILON = 1e-7;
const DEFAULT_TOLERANCE: Tolerance = {
  absoluteTolerance: 1e-5,
  relativeTolerance: 1e-5,
};
const TEST_PARAMETERS: Parameters = {
  normalVectorAtPointI: [0.6, 0.8],
  alphaExponent: 3.0,
};

function assertApproximatelyEqual(
  actualValue: number,
  expectedValue: number,
  tolerance: Tolerance = DEFAULT_TOLERANCE,
): void {
  const absoluteError = Math.abs(actualValue - expectedValue);
  const referenceScale = Math.max(Math.abs(expectedValue), 1.0);
  const allowedError =
    tolerance.absoluteTolerance + tolerance.relativeTolerance * referenceScale;

  // Guard: fail fast when tolerance is violated.
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
    assertApproximatelyEqual(
      actualVector[componentIndex],
      expectedVector[componentIndex],
    );
  }
}

function estimateGradientByCentralDifference(
  inputVector: InputVector,
  parameters: Parameters,
): GradientVector {
  const estimatedGradientValues: number[] = [];

  for (let componentIndex = 0; componentIndex < inputVector.length; componentIndex += 1) {
    const positiveInput: InputVector = [...inputVector];
    positiveInput[componentIndex] += CENTRAL_DIFFERENCE_EPSILON;

    const negativeInput: InputVector = [...inputVector];
    negativeInput[componentIndex] -= CENTRAL_DIFFERENCE_EPSILON;

    const positiveValue = value(positiveInput, parameters);
    const negativeValue = value(negativeInput, parameters);
    estimatedGradientValues.push(
      (positiveValue - negativeValue) / (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
  }

  return [
    estimatedGradientValues[0],
    estimatedGradientValues[1],
    estimatedGradientValues[2],
    estimatedGradientValues[3],
  ];
}

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);

  for (const sampledInput of sampledInputs) {
    const analyticalGradient = grad(sampledInput, TEST_PARAMETERS);
    const numericalGradient = estimateGradientByCentralDifference(
      sampledInput,
      TEST_PARAMETERS,
    );
    assertVectorApproximatelyEqual(analyticalGradient, numericalGradient);
  }
}
