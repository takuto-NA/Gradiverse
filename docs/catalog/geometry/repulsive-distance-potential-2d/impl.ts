/**
 * Responsibility:
 * Provide analytical value/gradient/Hessian/HVP for 2D pairwise
 * repulsive potentials based on distance d:
 *   phi_1 = w / d
 *   phi_2 = w / d^2
 */

export type InputVector = [number, number, number, number];
export type GradientVector = [number, number, number, number];
export type HessianMatrix = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
];
export type PositionDifferenceVector = [number, number];
export type Matrix2x2 = [[number, number], [number, number]];

const X1_INDEX = 0;
const Y1_INDEX = 1;
const X2_INDEX = 2;
const Y2_INDEX = 3;
const DEFAULT_WEIGHT = 1.0;
const MINIMUM_DISTANCE_THRESHOLD = 1e-8;
const DEFAULT_MINIMUM_SAMPLING_DISTANCE = 0.25;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for analytic derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertPositiveWeight(weightParameter: number): void {
  // Guard: repulsive coefficient must stay positive.
  if (weightParameter <= 0.0) {
    throw new Error("weightParameter must be greater than zero.");
  }
}

function extractDistanceTerms(inputVector: InputVector): {
  differenceVector: PositionDifferenceVector;
  distanceValue: number;
  distanceSquared: number;
} {
  const dx = inputVector[X2_INDEX] - inputVector[X1_INDEX];
  const dy = inputVector[Y2_INDEX] - inputVector[Y1_INDEX];
  const distanceSquared = dx * dx + dy * dy;
  const distanceValue = Math.sqrt(distanceSquared);
  return {
    differenceVector: [dx, dy],
    distanceValue,
    distanceSquared,
  };
}

function assertDifferentiableDistance(distanceValue: number): void {
  // Guard: d=0 is singular for 1/d and 1/d^2 derivatives.
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
}

function buildFourByFourFromTwoByTwo(baseBlock: Matrix2x2): HessianMatrix {
  const [h00, h01] = baseBlock[0];
  const [h10, h11] = baseBlock[1];
  return [
    [h00, h01, -h00, -h01],
    [h10, h11, -h10, -h11],
    [-h00, -h01, h00, h01],
    [-h10, -h11, h10, h11],
  ];
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

export function inverseDistanceValue(
  inputVector: InputVector,
  weightParameter: number = DEFAULT_WEIGHT,
): number {
  assertFiniteValues(inputVector, "inputVector");
  assertPositiveWeight(weightParameter);
  const { distanceValue } = extractDistanceTerms(inputVector);
  assertDifferentiableDistance(distanceValue);
  return weightParameter / distanceValue;
}

export function inverseDistanceGradient(
  inputVector: InputVector,
  weightParameter: number = DEFAULT_WEIGHT,
): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  assertPositiveWeight(weightParameter);
  const { differenceVector, distanceValue } = extractDistanceTerms(inputVector);
  assertDifferentiableDistance(distanceValue);

  const [dx, dy] = differenceVector;
  const inverseDistanceCubed = 1.0 / (distanceValue * distanceValue * distanceValue);
  const scale = weightParameter * inverseDistanceCubed;
  return [scale * dx, scale * dy, -scale * dx, -scale * dy];
}

export function inverseDistanceHessian(
  inputVector: InputVector,
  weightParameter: number = DEFAULT_WEIGHT,
): HessianMatrix {
  assertFiniteValues(inputVector, "inputVector");
  assertPositiveWeight(weightParameter);
  const { differenceVector, distanceValue, distanceSquared } =
    extractDistanceTerms(inputVector);
  assertDifferentiableDistance(distanceValue);

  const [dx, dy] = differenceVector;
  const distancePowerFive =
    distanceValue *
    distanceValue *
    distanceValue *
    distanceValue *
    distanceValue;
  const scale = weightParameter / distancePowerFive;
  const block: Matrix2x2 = [
    [scale * (3.0 * dx * dx - distanceSquared), scale * (3.0 * dx * dy)],
    [scale * (3.0 * dx * dy), scale * (3.0 * dy * dy - distanceSquared)],
  ];
  return buildFourByFourFromTwoByTwo(block);
}

export function inverseDistanceHvp(
  inputVector: InputVector,
  directionVector: GradientVector,
  weightParameter: number = DEFAULT_WEIGHT,
): GradientVector {
  assertFiniteValues(directionVector, "directionVector");
  const hessianMatrix = inverseDistanceHessian(inputVector, weightParameter);
  return multiplyHessianAndDirection(hessianMatrix, directionVector);
}

export function inverseSquaredDistanceValue(
  inputVector: InputVector,
  weightParameter: number = DEFAULT_WEIGHT,
): number {
  assertFiniteValues(inputVector, "inputVector");
  assertPositiveWeight(weightParameter);
  const { distanceValue, distanceSquared } = extractDistanceTerms(inputVector);
  assertDifferentiableDistance(distanceValue);
  return weightParameter / distanceSquared;
}

export function inverseSquaredDistanceGradient(
  inputVector: InputVector,
  weightParameter: number = DEFAULT_WEIGHT,
): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  assertPositiveWeight(weightParameter);
  const { differenceVector, distanceValue, distanceSquared } =
    extractDistanceTerms(inputVector);
  assertDifferentiableDistance(distanceValue);

  const [dx, dy] = differenceVector;
  const inverseDistancePowerFour = 1.0 / (distanceSquared * distanceSquared);
  const scale = 2.0 * weightParameter * inverseDistancePowerFour;
  return [scale * dx, scale * dy, -scale * dx, -scale * dy];
}

export function inverseSquaredDistanceHessian(
  inputVector: InputVector,
  weightParameter: number = DEFAULT_WEIGHT,
): HessianMatrix {
  assertFiniteValues(inputVector, "inputVector");
  assertPositiveWeight(weightParameter);
  const { differenceVector, distanceValue, distanceSquared } =
    extractDistanceTerms(inputVector);
  assertDifferentiableDistance(distanceValue);

  const [dx, dy] = differenceVector;
  const distancePowerSix =
    distanceSquared * distanceSquared * distanceSquared;
  const scale = (2.0 * weightParameter) / distancePowerSix;
  const block: Matrix2x2 = [
    [scale * (4.0 * dx * dx - distanceSquared), scale * (4.0 * dx * dy)],
    [scale * (4.0 * dx * dy), scale * (4.0 * dy * dy - distanceSquared)],
  ];
  return buildFourByFourFromTwoByTwo(block);
}

export function inverseSquaredDistanceHvp(
  inputVector: InputVector,
  directionVector: GradientVector,
  weightParameter: number = DEFAULT_WEIGHT,
): GradientVector {
  assertFiniteValues(directionVector, "directionVector");
  const hessianMatrix = inverseSquaredDistanceHessian(
    inputVector,
    weightParameter,
  );
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
      const x1 = sampleUniformValue();
      const y1 = sampleUniformValue();
      let x2 = sampleUniformValue();
      let y2 = sampleUniformValue();
      const sampledDistance = Math.hypot(x2 - x1, y2 - y1);
      // Guard: avoid near-singular samples for stable checks.
      if (sampledDistance <= DEFAULT_MINIMUM_SAMPLING_DISTANCE) {
        x2 = x1 + DEFAULT_MINIMUM_SAMPLING_DISTANCE;
        y2 = y1;
      }

      sampledInputs.push([x1, y1, x2, y2]);
    }

    return sampledInputs;
  },
};
