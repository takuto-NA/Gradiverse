/**
 * Responsibility:
 * Provide analytical derivatives for 2D two-point squared distance:
 * f(x1, y1, x2, y2) = (x2 - x1)^2 + (y2 - y1)^2.
 */

export type InputVector = [number, number, number, number];
export type GradientVector = [number, number, number, number];
export type HessianMatrix = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
];

const X1_INDEX = 0;
const Y1_INDEX = 1;
const X2_INDEX = 2;
const Y2_INDEX = 3;
const HESSIAN_DIAGONAL_VALUE = 2.0;
const HESSIAN_OFF_BLOCK_VALUE = -2.0;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for deterministic derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function decomposeDifference(inputVector: InputVector): {
  pointDifferenceX: number;
  pointDifferenceY: number;
} {
  const pointDifferenceX = inputVector[X2_INDEX] - inputVector[X1_INDEX];
  const pointDifferenceY = inputVector[Y2_INDEX] - inputVector[Y1_INDEX];
  return { pointDifferenceX, pointDifferenceY };
}

function multiplyHessianAndDirection(
  hessianMatrix: HessianMatrix,
  directionVector: GradientVector,
): GradientVector {
  const productVector: GradientVector = [0.0, 0.0, 0.0, 0.0];
  for (let rowIndex = 0; rowIndex < hessianMatrix.length; rowIndex += 1) {
    let rowSum = 0.0;
    for (let columnIndex = 0; columnIndex < directionVector.length; columnIndex += 1) {
      rowSum += hessianMatrix[rowIndex][columnIndex] * directionVector[columnIndex];
    }
    productVector[rowIndex] = rowSum;
  }
  return productVector;
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const { pointDifferenceX, pointDifferenceY } = decomposeDifference(inputVector);
  return pointDifferenceX * pointDifferenceX + pointDifferenceY * pointDifferenceY;
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const { pointDifferenceX, pointDifferenceY } = decomposeDifference(inputVector);
  return [
    -HESSIAN_DIAGONAL_VALUE * pointDifferenceX,
    -HESSIAN_DIAGONAL_VALUE * pointDifferenceY,
    HESSIAN_DIAGONAL_VALUE * pointDifferenceX,
    HESSIAN_DIAGONAL_VALUE * pointDifferenceY,
  ];
}

export function hess(inputVector: InputVector): HessianMatrix {
  assertFiniteValues(inputVector, "inputVector");
  return [
    [HESSIAN_DIAGONAL_VALUE, 0.0, HESSIAN_OFF_BLOCK_VALUE, 0.0],
    [0.0, HESSIAN_DIAGONAL_VALUE, 0.0, HESSIAN_OFF_BLOCK_VALUE],
    [HESSIAN_OFF_BLOCK_VALUE, 0.0, HESSIAN_DIAGONAL_VALUE, 0.0],
    [0.0, HESSIAN_OFF_BLOCK_VALUE, 0.0, HESSIAN_DIAGONAL_VALUE],
  ];
}

export function hvp(inputVector: InputVector, directionVector: GradientVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  assertFiniteValues(directionVector, "directionVector");
  const hessianMatrix = hess(inputVector);
  return multiplyHessianAndDirection(hessianMatrix, directionVector);
}

export const domain = {
  sample(seed: number, sampleCount: number): InputVector[] {
    // Guard: sampleCount must be non-negative.
    if (sampleCount < 0) {
      throw new Error("sampleCount must be greater than or equal to zero.");
    }

    const sampledInputs: InputVector[] = [];
    let currentSeed = seed >>> 0;

    function sampleUniformValue(): number {
      currentSeed =
        (LINEAR_CONGRUENTIAL_MULTIPLIER * currentSeed +
          LINEAR_CONGRUENTIAL_INCREMENT) %
        LINEAR_CONGRUENTIAL_MODULUS;
      const randomUnitValue = currentSeed / LINEAR_CONGRUENTIAL_MODULUS;
      return DOMAIN_LOWER_BOUND + (DOMAIN_UPPER_BOUND - DOMAIN_LOWER_BOUND) * randomUnitValue;
    }

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      sampledInputs.push([
        sampleUniformValue(),
        sampleUniformValue(),
        sampleUniformValue(),
        sampleUniformValue(),
      ]);
    }

    return sampledInputs;
  },
};
