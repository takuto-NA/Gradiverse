/**
 * Responsibility:
 * Verify analytical derivatives of 2D two-point squared distance.
 */

import {
  domain,
  grad,
  hess,
  hvp,
  value,
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
const DIRECTION_VECTOR: GradientVector = [0.4, -0.2, 0.5, 0.1];
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

  // Guard: fail immediately when tolerance is violated.
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

function estimateHessianByCentralDifference(inputVector: InputVector): HessianMatrix {
  const hessianRows: number[][] = [];
  for (let columnIndex = 0; columnIndex < inputVector.length; columnIndex += 1) {
    const positiveInput: InputVector = [...inputVector];
    positiveInput[columnIndex] += CENTRAL_DIFFERENCE_EPSILON;

    const negativeInput: InputVector = [...inputVector];
    negativeInput[columnIndex] -= CENTRAL_DIFFERENCE_EPSILON;

    const positiveGradient = grad(positiveInput);
    const negativeGradient = grad(negativeInput);
    const derivativeColumn = positiveGradient.map(
      (positiveValue, rowIndex) =>
        (positiveValue - negativeGradient[rowIndex]) /
        (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
    hessianRows.push(derivativeColumn);
  }

  return [
    [hessianRows[0][0], hessianRows[1][0], hessianRows[2][0], hessianRows[3][0]],
    [hessianRows[0][1], hessianRows[1][1], hessianRows[2][1], hessianRows[3][1]],
    [hessianRows[0][2], hessianRows[1][2], hessianRows[2][2], hessianRows[3][2]],
    [hessianRows[0][3], hessianRows[1][3], hessianRows[2][3], hessianRows[3][3]],
  ];
}

function estimateDirectionalDerivativeFromGradientDifference(
  inputVector: InputVector,
  directionVector: GradientVector,
): GradientVector {
  const shiftedInput: InputVector = inputVector.map(
    (inputValue, componentIndex) =>
      inputValue + CENTRAL_DIFFERENCE_EPSILON * directionVector[componentIndex],
  ) as InputVector;
  const shiftedGradient = grad(shiftedInput);
  const baseGradient = grad(inputVector);
  return shiftedGradient.map(
    (shiftedGradientValue, componentIndex) =>
      (shiftedGradientValue - baseGradient[componentIndex]) /
      CENTRAL_DIFFERENCE_EPSILON,
  ) as GradientVector;
}

function buildExpectedConstantHessian(): HessianMatrix {
  return [
    [2.0, 0.0, -2.0, 0.0],
    [0.0, 2.0, 0.0, -2.0],
    [-2.0, 0.0, 2.0, 0.0],
    [0.0, -2.0, 0.0, 2.0],
  ];
}

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);
  const expectedConstantHessian = buildExpectedConstantHessian();

  for (const sampledInput of sampledInputs) {
    const analyticalGradient = grad(sampledInput);
    const numericalGradient = estimateGradientByCentralDifference(sampledInput);
    assertVectorApproximatelyEqual(analyticalGradient, numericalGradient);

    const analyticalHessian = hess(sampledInput);
    assertMatrixApproximatelyEqual(analyticalHessian, expectedConstantHessian);

    const numericalHessian = estimateHessianByCentralDifference(sampledInput);
    assertMatrixApproximatelyEqual(analyticalHessian, numericalHessian);

    const directHvp = hvp(sampledInput, DIRECTION_VECTOR);
    const numericalHvp = estimateDirectionalDerivativeFromGradientDifference(
      sampledInput,
      DIRECTION_VECTOR,
    );
    assertVectorApproximatelyEqual(directHvp, numericalHvp);
  }
}
