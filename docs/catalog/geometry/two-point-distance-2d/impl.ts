/**
 * Responsibility:
 * Provide analytical derivatives for:
 * 1) 2D two-point distance d(x1, y1, x2, y2)
 * 2) natural-length residual r(x1, y1, x2, y2, l) = d - l
 */

export type DistanceInput = [number, number, number, number];
export type ResidualInput = [number, number, number, number, number];
export type ResidualGradient = [number, number, number, number, number];
export type DistanceHessian = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
];
export type ResidualHessian = [
  [number, number, number, number, number],
  [number, number, number, number, number],
  [number, number, number, number, number],
  [number, number, number, number, number],
  [number, number, number, number, number],
];
export type Vector = number[];

const X1_INDEX = 0;
const Y1_INDEX = 1;
const X2_INDEX = 2;
const Y2_INDEX = 3;
const NATURAL_LENGTH_INDEX = 4;
const NATURAL_LENGTH_GRADIENT_VALUE = -1.0;
const MINIMUM_DISTANCE_THRESHOLD = 1e-12;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const DEFAULT_MINIMUM_POINT_SEPARATION = 0.1;

function assertFiniteValues(inputVector: Vector, inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite inputs are required for a valid derivative.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function decomposeDistanceInput(distanceInput: DistanceInput): {
  pointDifferenceX: number;
  pointDifferenceY: number;
  distanceValue: number;
} {
  const pointDifferenceX = distanceInput[X2_INDEX] - distanceInput[X1_INDEX];
  const pointDifferenceY = distanceInput[Y2_INDEX] - distanceInput[Y1_INDEX];
  const distanceValue = Math.hypot(pointDifferenceX, pointDifferenceY);
  return { pointDifferenceX, pointDifferenceY, distanceValue };
}

function assertDistanceDifferentiability(distanceValue: number): void {
  // Guard: derivative of norm direction is undefined at zero distance.
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
}

function extractDistanceInput(residualInput: ResidualInput): DistanceInput {
  return [
    residualInput[X1_INDEX],
    residualInput[Y1_INDEX],
    residualInput[X2_INDEX],
    residualInput[Y2_INDEX],
  ];
}

function multiplyResidualHessianAndVector(
  residualHessian: ResidualHessian,
  directionVector: ResidualGradient,
): ResidualGradient {
  const productVector: ResidualGradient = [0.0, 0.0, 0.0, 0.0, 0.0];
  for (let rowIndex = 0; rowIndex < residualHessian.length; rowIndex += 1) {
    let accumulatedValue = 0.0;
    for (let columnIndex = 0; columnIndex < directionVector.length; columnIndex += 1) {
      accumulatedValue += residualHessian[rowIndex][columnIndex] * directionVector[columnIndex];
    }
    productVector[rowIndex] = accumulatedValue;
  }
  return productVector;
}

export function distanceValue(distanceInput: DistanceInput): number {
  assertFiniteValues(distanceInput, "distanceInput");
  const { distanceValue: computedDistanceValue } =
    decomposeDistanceInput(distanceInput);
  return computedDistanceValue;
}

export function distanceGradient(distanceInput: DistanceInput): DistanceInput {
  assertFiniteValues(distanceInput, "distanceInput");
  const { pointDifferenceX, pointDifferenceY, distanceValue: computedDistance } =
    decomposeDistanceInput(distanceInput);
  assertDistanceDifferentiability(computedDistance);

  const inverseDistance = 1.0 / computedDistance;
  return [
    -pointDifferenceX * inverseDistance,
    -pointDifferenceY * inverseDistance,
    pointDifferenceX * inverseDistance,
    pointDifferenceY * inverseDistance,
  ];
}

export function value(residualInput: ResidualInput): number {
  assertFiniteValues(residualInput, "residualInput");
  const distanceInput = extractDistanceInput(residualInput);
  const computedDistance = distanceValue(distanceInput);
  return computedDistance - residualInput[NATURAL_LENGTH_INDEX];
}

export function grad(residualInput: ResidualInput): ResidualGradient {
  assertFiniteValues(residualInput, "residualInput");
  const distanceInput = extractDistanceInput(residualInput);
  const distancePartGradient = distanceGradient(distanceInput);
  return [
    distancePartGradient[X1_INDEX],
    distancePartGradient[Y1_INDEX],
    distancePartGradient[X2_INDEX],
    distancePartGradient[Y2_INDEX],
    NATURAL_LENGTH_GRADIENT_VALUE,
  ];
}

export function distanceHessian(distanceInput: DistanceInput): DistanceHessian {
  assertFiniteValues(distanceInput, "distanceInput");
  const { pointDifferenceX, pointDifferenceY, distanceValue: computedDistance } =
    decomposeDistanceInput(distanceInput);
  assertDistanceDifferentiability(computedDistance);

  const distanceCubed = computedDistance * computedDistance * computedDistance;
  const diagonalX = (pointDifferenceY * pointDifferenceY) / distanceCubed;
  const diagonalY = (pointDifferenceX * pointDifferenceX) / distanceCubed;
  const offDiagonal = (-pointDifferenceX * pointDifferenceY) / distanceCubed;

  return [
    [diagonalX, offDiagonal, -diagonalX, -offDiagonal],
    [offDiagonal, diagonalY, -offDiagonal, -diagonalY],
    [-diagonalX, -offDiagonal, diagonalX, offDiagonal],
    [-offDiagonal, -diagonalY, offDiagonal, diagonalY],
  ];
}

export function hess(residualInput: ResidualInput): ResidualHessian {
  assertFiniteValues(residualInput, "residualInput");
  const distanceInput = extractDistanceInput(residualInput);
  const fourByFourDistanceHessian = distanceHessian(distanceInput);

  return [
    [
      fourByFourDistanceHessian[0][0],
      fourByFourDistanceHessian[0][1],
      fourByFourDistanceHessian[0][2],
      fourByFourDistanceHessian[0][3],
      0.0,
    ],
    [
      fourByFourDistanceHessian[1][0],
      fourByFourDistanceHessian[1][1],
      fourByFourDistanceHessian[1][2],
      fourByFourDistanceHessian[1][3],
      0.0,
    ],
    [
      fourByFourDistanceHessian[2][0],
      fourByFourDistanceHessian[2][1],
      fourByFourDistanceHessian[2][2],
      fourByFourDistanceHessian[2][3],
      0.0,
    ],
    [
      fourByFourDistanceHessian[3][0],
      fourByFourDistanceHessian[3][1],
      fourByFourDistanceHessian[3][2],
      fourByFourDistanceHessian[3][3],
      0.0,
    ],
    [0.0, 0.0, 0.0, 0.0, 0.0],
  ];
}

export function hvp(
  residualInput: ResidualInput,
  directionVector: ResidualGradient,
): ResidualGradient {
  assertFiniteValues(residualInput, "residualInput");
  assertFiniteValues(directionVector, "directionVector");
  const residualHessian = hess(residualInput);
  return multiplyResidualHessianAndVector(residualHessian, directionVector);
}

export const domain = {
  sample(seed: number, sampleCount: number): ResidualInput[] {
    // Guard: sampleCount must be non-negative.
    if (sampleCount < 0) {
      throw new Error("sampleCount must be greater than or equal to zero.");
    }

    const sampledInputs: ResidualInput[] = [];
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
      const x1 = sampleUniformValue();
      const y1 = sampleUniformValue();

      let x2 = sampleUniformValue();
      let y2 = sampleUniformValue();
      const sampledDistance = Math.hypot(x2 - x1, y2 - y1);
      // Guard: enforce non-zero distance neighborhood for stable derivatives.
      if (sampledDistance <= DEFAULT_MINIMUM_POINT_SEPARATION) {
        x2 = x1 + DEFAULT_MINIMUM_POINT_SEPARATION;
        y2 = y1;
      }

      const naturalLength = Math.hypot(x2 - x1, y2 - y1) * 0.8;
      sampledInputs.push([x1, y1, x2, y2, naturalLength]);
    }

    return sampledInputs;
  },
};
