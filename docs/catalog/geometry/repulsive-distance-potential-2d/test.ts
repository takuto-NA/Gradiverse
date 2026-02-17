/**
 * Responsibility:
 * Numerically verify analytical derivatives for:
 *   phi_1 = w / d
 *   phi_2 = w / d^2
 */

import {
  domain,
  inverseDistanceGradient,
  inverseDistanceHessian,
  inverseDistanceHvp,
  inverseDistanceValue,
  inverseSquaredDistanceGradient,
  inverseSquaredDistanceHessian,
  inverseSquaredDistanceHvp,
  inverseSquaredDistanceValue,
  type GradientVector,
  type HessianMatrix,
  type InputVector,
} from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const TEST_RANDOM_SEED = 17;
const TEST_SAMPLE_COUNT = 8;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const TEST_WEIGHT_PARAMETER = 1.3;
const TEST_DIRECTION_VECTOR: GradientVector = [0.4, -0.2, 0.6, 0.1];

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

function estimateGradientByCentralDifference(
  scalarFunction: (inputVector: InputVector, weightParameter: number) => number,
  inputVector: InputVector,
  weightParameter: number,
): GradientVector {
  const estimatedGradient: number[] = [];
  for (let componentIndex = 0; componentIndex < inputVector.length; componentIndex += 1) {
    const positiveInput: InputVector = [
      inputVector[0],
      inputVector[1],
      inputVector[2],
      inputVector[3],
    ];
    positiveInput[componentIndex] += CENTRAL_DIFFERENCE_EPSILON;

    const negativeInput: InputVector = [
      inputVector[0],
      inputVector[1],
      inputVector[2],
      inputVector[3],
    ];
    negativeInput[componentIndex] -= CENTRAL_DIFFERENCE_EPSILON;

    const positiveValue = scalarFunction(positiveInput, weightParameter);
    const negativeValue = scalarFunction(negativeInput, weightParameter);
    estimatedGradient.push(
      (positiveValue - negativeValue) / (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
  }

  return [
    estimatedGradient[0],
    estimatedGradient[1],
    estimatedGradient[2],
    estimatedGradient[3],
  ];
}

function estimateHessianByCentralDifference(
  gradientFunction: (inputVector: InputVector, weightParameter: number) => GradientVector,
  inputVector: InputVector,
  weightParameter: number,
): HessianMatrix {
  const hessianColumns: number[][] = [];
  for (let columnIndex = 0; columnIndex < inputVector.length; columnIndex += 1) {
    const positiveInput: InputVector = [
      inputVector[0],
      inputVector[1],
      inputVector[2],
      inputVector[3],
    ];
    positiveInput[columnIndex] += CENTRAL_DIFFERENCE_EPSILON;

    const negativeInput: InputVector = [
      inputVector[0],
      inputVector[1],
      inputVector[2],
      inputVector[3],
    ];
    negativeInput[columnIndex] -= CENTRAL_DIFFERENCE_EPSILON;

    const positiveGradient = gradientFunction(positiveInput, weightParameter);
    const negativeGradient = gradientFunction(negativeInput, weightParameter);
    const derivativeColumn = positiveGradient.map(
      (positiveValue, rowIndex) =>
        (positiveValue - negativeGradient[rowIndex]) /
        (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
    hessianColumns.push(derivativeColumn);
  }

  return [
    [
      hessianColumns[0][0],
      hessianColumns[1][0],
      hessianColumns[2][0],
      hessianColumns[3][0],
    ],
    [
      hessianColumns[0][1],
      hessianColumns[1][1],
      hessianColumns[2][1],
      hessianColumns[3][1],
    ],
    [
      hessianColumns[0][2],
      hessianColumns[1][2],
      hessianColumns[2][2],
      hessianColumns[3][2],
    ],
    [
      hessianColumns[0][3],
      hessianColumns[1][3],
      hessianColumns[2][3],
      hessianColumns[3][3],
    ],
  ];
}

function estimateHvpByGradientDifference(
  gradientFunction: (inputVector: InputVector, weightParameter: number) => GradientVector,
  inputVector: InputVector,
  directionVector: GradientVector,
  weightParameter: number,
): GradientVector {
  const shiftedInput: InputVector = [
    inputVector[0] + CENTRAL_DIFFERENCE_EPSILON * directionVector[0],
    inputVector[1] + CENTRAL_DIFFERENCE_EPSILON * directionVector[1],
    inputVector[2] + CENTRAL_DIFFERENCE_EPSILON * directionVector[2],
    inputVector[3] + CENTRAL_DIFFERENCE_EPSILON * directionVector[3],
  ];
  const shiftedGradient = gradientFunction(shiftedInput, weightParameter);
  const baseGradient = gradientFunction(inputVector, weightParameter);
  return [
    (shiftedGradient[0] - baseGradient[0]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[1] - baseGradient[1]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[2] - baseGradient[2]) / CENTRAL_DIFFERENCE_EPSILON,
    (shiftedGradient[3] - baseGradient[3]) / CENTRAL_DIFFERENCE_EPSILON,
  ];
}

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);

  for (const sampledInput of sampledInputs) {
    const inverseDistanceAnalyticalGradient = inverseDistanceGradient(
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    const inverseDistanceNumericalGradient = estimateGradientByCentralDifference(
      inverseDistanceValue,
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    assertVectorApproximatelyEqual(
      inverseDistanceAnalyticalGradient,
      inverseDistanceNumericalGradient,
    );

    const inverseSquaredAnalyticalGradient = inverseSquaredDistanceGradient(
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    const inverseSquaredNumericalGradient = estimateGradientByCentralDifference(
      inverseSquaredDistanceValue,
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    assertVectorApproximatelyEqual(
      inverseSquaredAnalyticalGradient,
      inverseSquaredNumericalGradient,
    );

    const inverseDistanceAnalyticalHessian = inverseDistanceHessian(
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    const inverseDistanceNumericalHessian = estimateHessianByCentralDifference(
      inverseDistanceGradient,
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    assertMatrixApproximatelyEqual(
      inverseDistanceAnalyticalHessian,
      inverseDistanceNumericalHessian,
    );

    const inverseSquaredAnalyticalHessian = inverseSquaredDistanceHessian(
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    const inverseSquaredNumericalHessian = estimateHessianByCentralDifference(
      inverseSquaredDistanceGradient,
      sampledInput,
      TEST_WEIGHT_PARAMETER,
    );
    assertMatrixApproximatelyEqual(
      inverseSquaredAnalyticalHessian,
      inverseSquaredNumericalHessian,
    );

    const inverseDistanceAnalyticalHvp = inverseDistanceHvp(
      sampledInput,
      TEST_DIRECTION_VECTOR,
      TEST_WEIGHT_PARAMETER,
    );
    const inverseDistanceNumericalHvp = estimateHvpByGradientDifference(
      inverseDistanceGradient,
      sampledInput,
      TEST_DIRECTION_VECTOR,
      TEST_WEIGHT_PARAMETER,
    );
    assertVectorApproximatelyEqual(
      inverseDistanceAnalyticalHvp,
      inverseDistanceNumericalHvp,
    );

    const inverseSquaredAnalyticalHvp = inverseSquaredDistanceHvp(
      sampledInput,
      TEST_DIRECTION_VECTOR,
      TEST_WEIGHT_PARAMETER,
    );
    const inverseSquaredNumericalHvp = estimateHvpByGradientDifference(
      inverseSquaredDistanceGradient,
      sampledInput,
      TEST_DIRECTION_VECTOR,
      TEST_WEIGHT_PARAMETER,
    );
    assertVectorApproximatelyEqual(
      inverseSquaredAnalyticalHvp,
      inverseSquaredNumericalHvp,
    );
  }
}
