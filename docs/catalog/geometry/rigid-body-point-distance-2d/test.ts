/**
 * Responsibility:
 * Numerically verify analytical derivatives for 2D rigid-body local-point distance.
 */

import {
  domain,
  grad,
  hess,
  hvp,
  value,
  type GradientVector,
  type HessianMatrix,
  type Parameters,
  type StateVector,
} from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const TEST_RANDOM_SEED = 29;
const TEST_SAMPLE_COUNT = 8;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const TEST_PARAMETERS: Parameters = {
  localPointA: [0.3, -0.2],
  localPointB: [-0.4, 0.5],
};
const TEST_DIRECTION_VECTOR: GradientVector = [0.2, -0.3, 0.4, -0.1, 0.6, -0.5];

const DEFAULT_TOLERANCE: Tolerance = {
  absoluteTolerance: 1e-5,
  relativeTolerance: 1e-5,
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
  // Guard: fail immediately if approximation constraint is violated.
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

function assertMatrixApproximatelyEqual(
  actualMatrix: number[][],
  expectedMatrix: number[][],
): void {
  if (actualMatrix.length !== expectedMatrix.length) {
    throw new Error("Matrix row counts must match.");
  }
  for (let rowIndex = 0; rowIndex < actualMatrix.length; rowIndex += 1) {
    assertVectorApproximatelyEqual(actualMatrix[rowIndex], expectedMatrix[rowIndex]);
  }
}

function addStateAndScaledDirection(
  stateVector: StateVector,
  directionVector: GradientVector,
  scaleValue: number,
): StateVector {
  return [
    stateVector[0] + scaleValue * directionVector[0],
    stateVector[1] + scaleValue * directionVector[1],
    stateVector[2] + scaleValue * directionVector[2],
    stateVector[3] + scaleValue * directionVector[3],
    stateVector[4] + scaleValue * directionVector[4],
    stateVector[5] + scaleValue * directionVector[5],
  ];
}

function estimateGradientByCentralDifference(
  stateVector: StateVector,
  parameters: Parameters,
): GradientVector {
  const estimatedGradient: number[] = [];
  for (let componentIndex = 0; componentIndex < stateVector.length; componentIndex += 1) {
    const positiveDirection: GradientVector = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    positiveDirection[componentIndex] = 1.0;
    const positiveState = addStateAndScaledDirection(
      stateVector,
      positiveDirection,
      CENTRAL_DIFFERENCE_EPSILON,
    );
    const negativeState = addStateAndScaledDirection(
      stateVector,
      positiveDirection,
      -CENTRAL_DIFFERENCE_EPSILON,
    );
    const positiveValue = value(positiveState, parameters);
    const negativeValue = value(negativeState, parameters);
    estimatedGradient.push(
      (positiveValue - negativeValue) / (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
  }

  return [
    estimatedGradient[0],
    estimatedGradient[1],
    estimatedGradient[2],
    estimatedGradient[3],
    estimatedGradient[4],
    estimatedGradient[5],
  ];
}

function estimateHessianByCentralDifference(
  stateVector: StateVector,
  parameters: Parameters,
): HessianMatrix {
  const derivativeColumns: number[][] = [];
  for (let columnIndex = 0; columnIndex < stateVector.length; columnIndex += 1) {
    const basisDirection: GradientVector = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    basisDirection[columnIndex] = 1.0;
    const positiveState = addStateAndScaledDirection(
      stateVector,
      basisDirection,
      CENTRAL_DIFFERENCE_EPSILON,
    );
    const negativeState = addStateAndScaledDirection(
      stateVector,
      basisDirection,
      -CENTRAL_DIFFERENCE_EPSILON,
    );

    const positiveGradient = grad(positiveState, parameters);
    const negativeGradient = grad(negativeState, parameters);
    const derivativeColumn = positiveGradient.map(
      (positiveValue, rowIndex) =>
        (positiveValue - negativeGradient[rowIndex]) /
        (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
    derivativeColumns.push(derivativeColumn);
  }

  return [
    [
      derivativeColumns[0][0],
      derivativeColumns[1][0],
      derivativeColumns[2][0],
      derivativeColumns[3][0],
      derivativeColumns[4][0],
      derivativeColumns[5][0],
    ],
    [
      derivativeColumns[0][1],
      derivativeColumns[1][1],
      derivativeColumns[2][1],
      derivativeColumns[3][1],
      derivativeColumns[4][1],
      derivativeColumns[5][1],
    ],
    [
      derivativeColumns[0][2],
      derivativeColumns[1][2],
      derivativeColumns[2][2],
      derivativeColumns[3][2],
      derivativeColumns[4][2],
      derivativeColumns[5][2],
    ],
    [
      derivativeColumns[0][3],
      derivativeColumns[1][3],
      derivativeColumns[2][3],
      derivativeColumns[3][3],
      derivativeColumns[4][3],
      derivativeColumns[5][3],
    ],
    [
      derivativeColumns[0][4],
      derivativeColumns[1][4],
      derivativeColumns[2][4],
      derivativeColumns[3][4],
      derivativeColumns[4][4],
      derivativeColumns[5][4],
    ],
    [
      derivativeColumns[0][5],
      derivativeColumns[1][5],
      derivativeColumns[2][5],
      derivativeColumns[3][5],
      derivativeColumns[4][5],
      derivativeColumns[5][5],
    ],
  ];
}

function estimateHvpByGradientDifference(
  stateVector: StateVector,
  directionVector: GradientVector,
  parameters: Parameters,
): GradientVector {
  const shiftedState = addStateAndScaledDirection(
    stateVector,
    directionVector,
    CENTRAL_DIFFERENCE_EPSILON,
  );
  const shiftedGradient = grad(shiftedState, parameters);
  const baseGradient = grad(stateVector, parameters);
  return [
    (shiftedGradient[0] - baseGradient[0]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[1] - baseGradient[1]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[2] - baseGradient[2]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[3] - baseGradient[3]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[4] - baseGradient[4]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[5] - baseGradient[5]) / CENTRAL_DIFFERENCE_EPSILON,
  ];
}

export function check(): void {
  const sampledStates = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);

  for (const sampledState of sampledStates) {
    const analyticalGradient = grad(sampledState, TEST_PARAMETERS);
    const numericalGradient = estimateGradientByCentralDifference(
      sampledState,
      TEST_PARAMETERS,
    );
    assertVectorApproximatelyEqual(analyticalGradient, numericalGradient);

    const analyticalHessian = hess(sampledState, TEST_PARAMETERS);
    const numericalHessian = estimateHessianByCentralDifference(
      sampledState,
      TEST_PARAMETERS,
    );
    assertMatrixApproximatelyEqual(analyticalHessian, numericalHessian);

    const analyticalHvp = hvp(
      sampledState,
      TEST_DIRECTION_VECTOR,
      TEST_PARAMETERS,
    );
    const numericalHvp = estimateHvpByGradientDifference(
      sampledState,
      TEST_DIRECTION_VECTOR,
      TEST_PARAMETERS,
    );
    assertVectorApproximatelyEqual(analyticalHvp, numericalHvp);
  }
}
