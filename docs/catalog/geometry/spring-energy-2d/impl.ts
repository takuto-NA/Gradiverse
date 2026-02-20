/**
 * Responsibility:
 * Provide analytical derivatives for 2D spring energy:
 * E = 0.5 * k * (||p2 - p1|| - l)^2.
 */

export type InputVector = [number, number, number, number, number, number];
export type GradientVector = [number, number, number, number, number, number];
export type HessianMatrix = [
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
];

const X1_INDEX = 0;
const Y1_INDEX = 1;
const X2_INDEX = 2;
const Y2_INDEX = 3;
const NATURAL_LENGTH_INDEX = 4;
const STIFFNESS_INDEX = 5;

const MINIMUM_DISTANCE_THRESHOLD = 1e-10;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const DOMAIN_MINIMUM_POINT_SEPARATION = 0.2;
const DOMAIN_MINIMUM_STIFFNESS = 0.1;
const DOMAIN_MAXIMUM_STIFFNESS = 5.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

type DistanceDecomposition = {
  differenceX: number;
  differenceY: number;
  distanceValue: number;
};

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for valid derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function decomposeDistance(inputVector: InputVector): DistanceDecomposition {
  const differenceX = inputVector[X2_INDEX] - inputVector[X1_INDEX];
  const differenceY = inputVector[Y2_INDEX] - inputVector[Y1_INDEX];
  const distanceValue = Math.hypot(differenceX, differenceY);
  return { differenceX, differenceY, distanceValue };
}

function assertDistanceDifferentiability(distanceValue: number): void {
  // Guard: spring derivatives with normalized direction require non-zero distance.
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
}

function distanceGradient(inputVector: InputVector): [number, number, number, number] {
  const { differenceX, differenceY, distanceValue } = decomposeDistance(inputVector);
  assertDistanceDifferentiability(distanceValue);
  const inverseDistance = 1.0 / distanceValue;
  return [
    -differenceX * inverseDistance,
    -differenceY * inverseDistance,
    differenceX * inverseDistance,
    differenceY * inverseDistance,
  ];
}

function distanceHessian(inputVector: InputVector): [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
] {
  const { differenceX, differenceY, distanceValue } = decomposeDistance(inputVector);
  assertDistanceDifferentiability(distanceValue);
  const distanceCubed = distanceValue * distanceValue * distanceValue;
  const diagonalX = (differenceY * differenceY) / distanceCubed;
  const diagonalY = (differenceX * differenceX) / distanceCubed;
  const offDiagonal = (-differenceX * differenceY) / distanceCubed;
  return [
    [diagonalX, offDiagonal, -diagonalX, -offDiagonal],
    [offDiagonal, diagonalY, -offDiagonal, -diagonalY],
    [-diagonalX, -offDiagonal, diagonalX, offDiagonal],
    [-offDiagonal, -diagonalY, offDiagonal, diagonalY],
  ];
}

function multiplyHessianAndDirection(
  hessianMatrix: HessianMatrix,
  directionVector: GradientVector,
): GradientVector {
  const productVector: GradientVector = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
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
  const { distanceValue: currentDistance } = decomposeDistance(inputVector);
  const naturalLength = inputVector[NATURAL_LENGTH_INDEX];
  const stiffness = inputVector[STIFFNESS_INDEX];
  const residual = currentDistance - naturalLength;
  return 0.5 * stiffness * residual * residual;
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const springStiffness = inputVector[STIFFNESS_INDEX];
  const naturalLength = inputVector[NATURAL_LENGTH_INDEX];
  const { distanceValue: currentDistance } = decomposeDistance(inputVector);
  assertDistanceDifferentiability(currentDistance);

  const residual = currentDistance - naturalLength;
  const distanceDirection = distanceGradient(inputVector);
  return [
    springStiffness * residual * distanceDirection[0],
    springStiffness * residual * distanceDirection[1],
    springStiffness * residual * distanceDirection[2],
    springStiffness * residual * distanceDirection[3],
    -springStiffness * residual,
    0.5 * residual * residual,
  ];
}

export function hess(inputVector: InputVector): HessianMatrix {
  assertFiniteValues(inputVector, "inputVector");
  const springStiffness = inputVector[STIFFNESS_INDEX];
  const naturalLength = inputVector[NATURAL_LENGTH_INDEX];
  const { distanceValue: currentDistance } = decomposeDistance(inputVector);
  assertDistanceDifferentiability(currentDistance);

  const residual = currentDistance - naturalLength;
  const distanceDirection = distanceGradient(inputVector);
  const distanceCurvature = distanceHessian(inputVector);

  const hessianMatrix: HessianMatrix = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ];

  for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < 4; columnIndex += 1) {
      hessianMatrix[rowIndex][columnIndex] =
        springStiffness *
        (distanceDirection[rowIndex] * distanceDirection[columnIndex] +
          residual * distanceCurvature[rowIndex][columnIndex]);
    }
    hessianMatrix[rowIndex][NATURAL_LENGTH_INDEX] =
      -springStiffness * distanceDirection[rowIndex];
    hessianMatrix[NATURAL_LENGTH_INDEX][rowIndex] =
      hessianMatrix[rowIndex][NATURAL_LENGTH_INDEX];
    hessianMatrix[rowIndex][STIFFNESS_INDEX] = residual * distanceDirection[rowIndex];
    hessianMatrix[STIFFNESS_INDEX][rowIndex] =
      hessianMatrix[rowIndex][STIFFNESS_INDEX];
  }

  hessianMatrix[NATURAL_LENGTH_INDEX][NATURAL_LENGTH_INDEX] = springStiffness;
  hessianMatrix[NATURAL_LENGTH_INDEX][STIFFNESS_INDEX] = -residual;
  hessianMatrix[STIFFNESS_INDEX][NATURAL_LENGTH_INDEX] = -residual;
  hessianMatrix[STIFFNESS_INDEX][STIFFNESS_INDEX] = 0.0;

  return hessianMatrix;
}

export function hvp(
  inputVector: InputVector,
  directionVector: GradientVector,
): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  assertFiniteValues(directionVector, "directionVector");
  return multiplyHessianAndDirection(hess(inputVector), directionVector);
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

    function sampleStiffness(): number {
      currentSeed =
        (LINEAR_CONGRUENTIAL_MULTIPLIER * currentSeed +
          LINEAR_CONGRUENTIAL_INCREMENT) %
        LINEAR_CONGRUENTIAL_MODULUS;
      const randomUnitValue = currentSeed / LINEAR_CONGRUENTIAL_MODULUS;
      return (
        DOMAIN_MINIMUM_STIFFNESS +
        (DOMAIN_MAXIMUM_STIFFNESS - DOMAIN_MINIMUM_STIFFNESS) * randomUnitValue
      );
    }

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const x1 = sampleUniformValue();
      const y1 = sampleUniformValue();
      let x2 = sampleUniformValue();
      let y2 = sampleUniformValue();

      const sampledDistance = Math.hypot(x2 - x1, y2 - y1);
      // Guard: avoid near-zero distance where normalized derivatives are unstable.
      if (sampledDistance <= DOMAIN_MINIMUM_POINT_SEPARATION) {
        x2 = x1 + DOMAIN_MINIMUM_POINT_SEPARATION;
        y2 = y1;
      }

      const currentDistance = Math.hypot(x2 - x1, y2 - y1);
      const naturalLength = 0.8 * currentDistance;
      const stiffness = sampleStiffness();
      sampledInputs.push([x1, y1, x2, y2, naturalLength, stiffness]);
    }

    return sampledInputs;
  },
};
