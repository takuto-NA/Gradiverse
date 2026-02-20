/**
 * Responsibility:
 * Numerically verify analytical gradient for total 2D Tangent Point Energy.
 */

import { domain, grad, value, type GradientVector, type Parameters, type StateVector } from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const TEST_RANDOM_SEED = 53;
const TEST_SAMPLE_COUNT_PER_POINT_COUNT = 2;
const TEST_POINT_COUNTS = [10, 20];
const CENTRAL_DIFFERENCE_EPSILON = 1e-7;
const DEFAULT_TOLERANCE: Tolerance = {
  absoluteTolerance: 5e-3,
  relativeTolerance: 1e-4,
};
const TEST_PARAMETERS: Parameters = {
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
  stateVector: StateVector,
  parameters: Parameters,
): GradientVector {
  const estimatedGradientValues: number[] = [];

  for (let componentIndex = 0; componentIndex < stateVector.length; componentIndex += 1) {
    const positiveState: StateVector = [...stateVector];
    positiveState[componentIndex] += CENTRAL_DIFFERENCE_EPSILON;

    const negativeState: StateVector = [...stateVector];
    negativeState[componentIndex] -= CENTRAL_DIFFERENCE_EPSILON;

    const positiveValue = value(positiveState, parameters);
    const negativeValue = value(negativeState, parameters);
    estimatedGradientValues.push(
      (positiveValue - negativeValue) / (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
  }

  return estimatedGradientValues;
}

export function check(): void {
  let runningSeed = TEST_RANDOM_SEED;

  for (const pointCount of TEST_POINT_COUNTS) {
    const sampledStates = domain.sample(
      runningSeed,
      TEST_SAMPLE_COUNT_PER_POINT_COUNT,
      pointCount,
    );
    runningSeed += 1;

    for (const sampledState of sampledStates) {
      const analyticalGradient = grad(sampledState, TEST_PARAMETERS);
      const numericalGradient = estimateGradientByCentralDifference(
        sampledState,
        TEST_PARAMETERS,
      );
      assertVectorApproximatelyEqual(analyticalGradient, numericalGradient);
    }
  }
}
