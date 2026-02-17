/**
 * Responsibility:
 * Verify analytical derivatives of 2D distance and natural-length residual.
 */

import {
  distanceGradient,
  distanceHessian,
  distanceValue,
  domain,
  grad,
  hess,
  hvp,
  type DistanceInput,
  type DistanceHessian,
  type ResidualHessian,
  type ResidualGradient,
  type ResidualInput,
} from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const TEST_RANDOM_SEED = 11;
const TEST_SAMPLE_COUNT = 8;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const DIRECTION_VECTOR: ResidualGradient = [0.7, -0.2, 0.3, 0.5, -0.4];

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

function estimateGradientByCentralDifference(
  scalarFunction: (inputVector: number[]) => number,
  inputVector: number[],
): number[] {
  return inputVector.map((_, targetComponentIndex) => {
    const positiveInput = [...inputVector];
    positiveInput[targetComponentIndex] += CENTRAL_DIFFERENCE_EPSILON;

    const negativeInput = [...inputVector];
    negativeInput[targetComponentIndex] -= CENTRAL_DIFFERENCE_EPSILON;

    const positiveValue = scalarFunction(positiveInput);
    const negativeValue = scalarFunction(negativeInput);
    return (positiveValue - negativeValue) / (2.0 * CENTRAL_DIFFERENCE_EPSILON);
  });
}

function estimateDirectionalDerivativeFromGradientDifference(
  gradientFunction: (inputVector: number[]) => number[],
  inputVector: number[],
  directionVector: number[],
): number[] {
  const shiftedInput = inputVector.map(
    (inputValue, componentIndex) =>
      inputValue + CENTRAL_DIFFERENCE_EPSILON * directionVector[componentIndex],
  );
  const shiftedGradient = gradientFunction(shiftedInput);
  const baseGradient = gradientFunction(inputVector);
  return shiftedGradient.map(
    (shiftedGradientValue, componentIndex) =>
      (shiftedGradientValue - baseGradient[componentIndex]) /
      CENTRAL_DIFFERENCE_EPSILON,
  );
}

function estimateDistanceHessianByCentralDifference(
  distanceInput: DistanceInput,
): DistanceHessian {
  const hessianRows: number[][] = [];
  for (let columnIndex = 0; columnIndex < distanceInput.length; columnIndex += 1) {
    const positiveInput: DistanceInput = [
      distanceInput[0],
      distanceInput[1],
      distanceInput[2],
      distanceInput[3],
    ];
    positiveInput[columnIndex] += CENTRAL_DIFFERENCE_EPSILON;

    const negativeInput: DistanceInput = [
      distanceInput[0],
      distanceInput[1],
      distanceInput[2],
      distanceInput[3],
    ];
    negativeInput[columnIndex] -= CENTRAL_DIFFERENCE_EPSILON;

    const positiveGradient = distanceGradient(positiveInput);
    const negativeGradient = distanceGradient(negativeInput);
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

function embedDistanceHessianToResidualHessian(
  distanceHessianMatrix: DistanceHessian,
): ResidualHessian {
  return [
    [
      distanceHessianMatrix[0][0],
      distanceHessianMatrix[0][1],
      distanceHessianMatrix[0][2],
      distanceHessianMatrix[0][3],
      0.0,
    ],
    [
      distanceHessianMatrix[1][0],
      distanceHessianMatrix[1][1],
      distanceHessianMatrix[1][2],
      distanceHessianMatrix[1][3],
      0.0,
    ],
    [
      distanceHessianMatrix[2][0],
      distanceHessianMatrix[2][1],
      distanceHessianMatrix[2][2],
      distanceHessianMatrix[2][3],
      0.0,
    ],
    [
      distanceHessianMatrix[3][0],
      distanceHessianMatrix[3][1],
      distanceHessianMatrix[3][2],
      distanceHessianMatrix[3][3],
      0.0,
    ],
    [0.0, 0.0, 0.0, 0.0, 0.0],
  ];
}

export function check(): void {
  const sampledResidualInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);

  for (const sampledResidualInput of sampledResidualInputs) {
    const distanceInput: DistanceInput = [
      sampledResidualInput[0],
      sampledResidualInput[1],
      sampledResidualInput[2],
      sampledResidualInput[3],
    ];

    const analyticalDistanceGradient = distanceGradient(distanceInput);
    const numericalDistanceGradient = estimateGradientByCentralDifference(
      (inputVector) => distanceValue(inputVector as DistanceInput),
      distanceInput,
    );
    assertVectorApproximatelyEqual(
      analyticalDistanceGradient,
      numericalDistanceGradient,
    );

    const analyticalResidualGradient = grad(sampledResidualInput);
    const numericalResidualGradient = estimateGradientByCentralDifference(
      (inputVector) => {
        const candidateInput = inputVector as ResidualInput;
        const candidateDistanceInput: DistanceInput = [
          candidateInput[0],
          candidateInput[1],
          candidateInput[2],
          candidateInput[3],
        ];
        return distanceValue(candidateDistanceInput) - candidateInput[4];
      },
      sampledResidualInput,
    );
    assertVectorApproximatelyEqual(
      analyticalResidualGradient,
      numericalResidualGradient,
    );

    const analyticalDistanceHessian = distanceHessian(distanceInput);
    const numericalDistanceHessian =
      estimateDistanceHessianByCentralDifference(distanceInput);
    assertMatrixApproximatelyEqual(
      analyticalDistanceHessian,
      numericalDistanceHessian,
    );

    const analyticalResidualHessian = hess(sampledResidualInput);
    const expectedResidualHessian = embedDistanceHessianToResidualHessian(
      analyticalDistanceHessian,
    );
    assertMatrixApproximatelyEqual(
      analyticalResidualHessian,
      expectedResidualHessian,
    );

    const numericalResidualHvp = estimateDirectionalDerivativeFromGradientDifference(
      (inputVector) => grad(inputVector as ResidualInput),
      sampledResidualInput,
      DIRECTION_VECTOR,
    );

    const directResidualHvp = hvp(sampledResidualInput, DIRECTION_VECTOR);
    assertVectorApproximatelyEqual(directResidualHvp, numericalResidualHvp);
  }
}
