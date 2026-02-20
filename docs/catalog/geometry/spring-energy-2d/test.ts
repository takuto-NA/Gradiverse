/**
 * Responsibility:
 * Verify analytical derivatives of 2D spring energy.
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

const TEST_RANDOM_SEED = 31;
const TEST_SAMPLE_COUNT = 8;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const DIRECTION_VECTOR: GradientVector = [0.4, -0.2, 0.5, 0.1, -0.3, 0.2];
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
    assertApproximatelyEqual(actualVector[componentIndex], expectedVector[componentIndex]);
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
  const hessianColumns: number[][] = [];
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
    hessianColumns.push(derivativeColumn);
  }

  const matrixRows: number[][] = [];
  for (let rowIndex = 0; rowIndex < inputVector.length; rowIndex += 1) {
    matrixRows.push(hessianColumns.map((columnVector) => columnVector[rowIndex]));
  }
  return matrixRows as HessianMatrix;
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

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);
  for (const sampledInput of sampledInputs) {
    const analyticalGradient = grad(sampledInput);
    const numericalGradient = estimateGradientByCentralDifference(sampledInput);
    assertVectorApproximatelyEqual(analyticalGradient, numericalGradient);

    const analyticalHessian = hess(sampledInput);
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
