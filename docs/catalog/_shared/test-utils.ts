/**
 * Responsibility:
 * Provide reusable finite-difference and approximation assertions for card tests.
 */

export type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

export const DEFAULT_TOLERANCE: Tolerance = {
  absoluteTolerance: 1e-6,
  relativeTolerance: 1e-6,
};

export function assertApproximatelyEqual(
  actualValue: number,
  expectedValue: number,
  tolerance: Tolerance = DEFAULT_TOLERANCE,
): void {
  const absoluteError = Math.abs(actualValue - expectedValue);
  const valueScale = Math.max(Math.abs(expectedValue), 1.0);
  const allowedError =
    tolerance.absoluteTolerance + tolerance.relativeTolerance * valueScale;
  // Guard: fail immediately when approximation is outside tolerance.
  if (absoluteError > allowedError) {
    throw new Error(
      `Approximation failed. actual=${actualValue}, expected=${expectedValue}, allowed=${allowedError}`,
    );
  }
}

export function assertVectorApproximatelyEqual(
  actualVector: number[],
  expectedVector: number[],
  tolerance: Tolerance = DEFAULT_TOLERANCE,
): void {
  if (actualVector.length !== expectedVector.length) {
    throw new Error("Vector dimensions must match.");
  }
  for (let componentIndex = 0; componentIndex < actualVector.length; componentIndex += 1) {
    assertApproximatelyEqual(
      actualVector[componentIndex],
      expectedVector[componentIndex],
      tolerance,
    );
  }
}

export function assertMatrixApproximatelyEqual(
  actualMatrix: number[][],
  expectedMatrix: number[][],
  tolerance: Tolerance = DEFAULT_TOLERANCE,
): void {
  if (actualMatrix.length !== expectedMatrix.length) {
    throw new Error("Matrix row counts must match.");
  }
  for (let rowIndex = 0; rowIndex < actualMatrix.length; rowIndex += 1) {
    assertVectorApproximatelyEqual(
      actualMatrix[rowIndex],
      expectedMatrix[rowIndex],
      tolerance,
    );
  }
}

export function estimateGradientByCentralDifference(
  scalarFunction: (inputVector: number[]) => number,
  inputVector: number[],
  centralDifferenceEpsilon: number,
): number[] {
  return inputVector.map((_, componentIndex) => {
    const positiveInput = [...inputVector];
    positiveInput[componentIndex] += centralDifferenceEpsilon;
    const negativeInput = [...inputVector];
    negativeInput[componentIndex] -= centralDifferenceEpsilon;
    return (
      (scalarFunction(positiveInput) - scalarFunction(negativeInput)) /
      (2.0 * centralDifferenceEpsilon)
    );
  });
}

export function estimateHessianByCentralDifference(
  gradientFunction: (inputVector: number[]) => number[],
  inputVector: number[],
  centralDifferenceEpsilon: number,
): number[][] {
  const hessianColumns: number[][] = [];
  for (let columnIndex = 0; columnIndex < inputVector.length; columnIndex += 1) {
    const positiveInput = [...inputVector];
    positiveInput[columnIndex] += centralDifferenceEpsilon;
    const negativeInput = [...inputVector];
    negativeInput[columnIndex] -= centralDifferenceEpsilon;
    const positiveGradient = gradientFunction(positiveInput);
    const negativeGradient = gradientFunction(negativeInput);
    hessianColumns.push(
      positiveGradient.map(
        (positiveValue, rowIndex) =>
          (positiveValue - negativeGradient[rowIndex]) /
          (2.0 * centralDifferenceEpsilon),
      ),
    );
  }
  const hessianRows: number[][] = [];
  for (let rowIndex = 0; rowIndex < inputVector.length; rowIndex += 1) {
    hessianRows.push(hessianColumns.map((columnVector) => columnVector[rowIndex]));
  }
  return hessianRows;
}

export function estimateDirectionalDerivativeFromGradientDifference(
  gradientFunction: (inputVector: number[]) => number[],
  inputVector: number[],
  directionVector: number[],
  directionalEpsilon: number,
): number[] {
  const shiftedInput = inputVector.map(
    (inputValue, componentIndex) =>
      inputValue + directionalEpsilon * directionVector[componentIndex],
  );
  const shiftedGradient = gradientFunction(shiftedInput);
  const baseGradient = gradientFunction(inputVector);
  return shiftedGradient.map(
    (shiftedGradientValue, componentIndex) =>
      (shiftedGradientValue - baseGradient[componentIndex]) / directionalEpsilon,
  );
}
