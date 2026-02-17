/**
 * Responsibility:
 * Verify analytical derivatives of squared L2 norm using finite differences.
 */

import { domain, grad, hess, hvp, type Matrix, type Vector } from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const HVP_DIFFERENCE_EPSILON = 1e-6;
const TEST_RANDOM_SEED = 7;
const TEST_SAMPLE_COUNT = 5;
const TEST_VECTOR_DIMENSION = 4;

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
  const expectedScale = Math.max(Math.abs(expectedValue), 1.0);
  const allowedError =
    tolerance.absoluteTolerance + tolerance.relativeTolerance * expectedScale;
  // Guard: fail immediately when difference exceeds tolerance.
  if (absoluteError > allowedError) {
    throw new Error(
      `Mismatch detected. actual=${actualValue}, expected=${expectedValue}, allowed=${allowedError}`,
    );
  }
}

function assertVectorsApproximatelyEqual(
  actualVector: Vector,
  expectedVector: Vector,
): void {
  if (actualVector.length !== expectedVector.length) {
    throw new Error("Vector dimensions do not match.");
  }
  for (let componentIndex = 0; componentIndex < actualVector.length; componentIndex += 1) {
    assertApproximatelyEqual(actualVector[componentIndex], expectedVector[componentIndex]);
  }
}

function addScaledBasis(
  inputVector: Vector,
  targetComponentIndex: number,
  scalarValue: number,
): Vector {
  return inputVector.map((valueAtIndex, componentIndex) =>
    componentIndex === targetComponentIndex
      ? valueAtIndex + scalarValue
      : valueAtIndex,
  );
}

function estimateGradientByCentralDifference(inputVector: Vector): Vector {
  const estimatedGradient: Vector = [];
  for (let componentIndex = 0; componentIndex < inputVector.length; componentIndex += 1) {
    const positivePoint = addScaledBasis(
      inputVector,
      componentIndex,
      CENTRAL_DIFFERENCE_EPSILON,
    );
    const negativePoint = addScaledBasis(
      inputVector,
      componentIndex,
      -CENTRAL_DIFFERENCE_EPSILON,
    );
    const positiveGradient = grad(positivePoint);
    const negativeGradient = grad(negativePoint);
    estimatedGradient.push(
      (positiveGradient[componentIndex] - negativeGradient[componentIndex]) /
        (2.0 * CENTRAL_DIFFERENCE_EPSILON),
    );
  }
  return estimatedGradient;
}

function multiplyMatrixAndVector(inputMatrix: Matrix, inputVector: Vector): Vector {
  return inputMatrix.map((rowValues) =>
    rowValues.reduce(
      (accumulatedValue, matrixValue, componentIndex) =>
        accumulatedValue + matrixValue * inputVector[componentIndex],
      0.0,
    ),
  );
}

function estimateHvpByGradientDifference(
  inputVector: Vector,
  directionVector: Vector,
): Vector {
  const shiftedPoint = inputVector.map(
    (valueAtIndex, componentIndex) =>
      valueAtIndex + HVP_DIFFERENCE_EPSILON * directionVector[componentIndex],
  );
  const shiftedGradient = grad(shiftedPoint);
  const baseGradient = grad(inputVector);
  return shiftedGradient.map(
    (shiftedComponentValue, componentIndex) =>
      (shiftedComponentValue - baseGradient[componentIndex]) /
      HVP_DIFFERENCE_EPSILON,
  );
}

export function check(): void {
  const sampledTestPoints = domain.sample(
    TEST_RANDOM_SEED,
    TEST_SAMPLE_COUNT,
    TEST_VECTOR_DIMENSION,
  );

  for (const sampledPoint of sampledTestPoints) {
    const analyticalGradient = grad(sampledPoint);
    const expectedGradient = sampledPoint;
    assertVectorsApproximatelyEqual(analyticalGradient, expectedGradient);

    const analyticalHessian = hess(sampledPoint);
    const testDirectionVector = sampledPoint.map((valueAtIndex) =>
      valueAtIndex === 0.0 ? 1.0 : valueAtIndex,
    );
    const hessianDirectionProduct = multiplyMatrixAndVector(
      analyticalHessian,
      testDirectionVector,
    );
    const analyticalHvp = hvp(sampledPoint, testDirectionVector);
    assertVectorsApproximatelyEqual(analyticalHvp, hessianDirectionProduct);

    const finiteDifferenceHvp = estimateHvpByGradientDifference(
      sampledPoint,
      testDirectionVector,
    );
    assertVectorsApproximatelyEqual(analyticalHvp, finiteDifferenceHvp);

    const estimatedHessianDiagonal = estimateGradientByCentralDifference(
      sampledPoint,
    );
    const expectedHessianDiagonal = new Array<number>(sampledPoint.length).fill(1.0);
    assertVectorsApproximatelyEqual(
      estimatedHessianDiagonal,
      expectedHessianDiagonal,
    );
  }
}
