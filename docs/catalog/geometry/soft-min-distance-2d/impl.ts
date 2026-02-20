/**
 * Responsibility:
 * Provide smooth minimum of two point distances in 2D with analytical gradient.
 */

export type InputVector = [number, number, number, number, number, number, number];
export type GradientVector = [number, number, number, number, number, number, number];

const POINT_X_INDEX = 0;
const POINT_Y_INDEX = 1;
const ANCHOR_A_X_INDEX = 2;
const ANCHOR_A_Y_INDEX = 3;
const ANCHOR_B_X_INDEX = 4;
const ANCHOR_B_Y_INDEX = 5;
const SHARPNESS_BETA_INDEX = 6;

const MINIMUM_DISTANCE_THRESHOLD = 1e-10;
const MINIMUM_SHARPNESS_BETA = 1e-6;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const DOMAIN_MINIMUM_DISTANCE = 0.1;
const DOMAIN_MINIMUM_BETA = 2.0;
const DOMAIN_MAXIMUM_BETA = 8.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

type DistanceDecomposition = {
  pointToAnchorAX: number;
  pointToAnchorAY: number;
  pointToAnchorBX: number;
  pointToAnchorBY: number;
  distanceToA: number;
  distanceToB: number;
  sharpnessBeta: number;
};

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for stable soft-min evaluation.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function decomposeDistances(inputVector: InputVector): DistanceDecomposition {
  const pointToAnchorAX = inputVector[POINT_X_INDEX] - inputVector[ANCHOR_A_X_INDEX];
  const pointToAnchorAY = inputVector[POINT_Y_INDEX] - inputVector[ANCHOR_A_Y_INDEX];
  const pointToAnchorBX = inputVector[POINT_X_INDEX] - inputVector[ANCHOR_B_X_INDEX];
  const pointToAnchorBY = inputVector[POINT_Y_INDEX] - inputVector[ANCHOR_B_Y_INDEX];
  const distanceToA = Math.hypot(pointToAnchorAX, pointToAnchorAY);
  const distanceToB = Math.hypot(pointToAnchorBX, pointToAnchorBY);
  const sharpnessBeta = inputVector[SHARPNESS_BETA_INDEX];
  return {
    pointToAnchorAX,
    pointToAnchorAY,
    pointToAnchorBX,
    pointToAnchorBY,
    distanceToA,
    distanceToB,
    sharpnessBeta,
  };
}

function assertDifferentiability(distanceToA: number, distanceToB: number, beta: number): void {
  // Guard: point-anchor distance gradients are undefined at zero distance.
  if (distanceToA <= MINIMUM_DISTANCE_THRESHOLD || distanceToB <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `all distances must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
  // Guard: smooth-min formulation requires strictly positive beta.
  if (beta <= MINIMUM_SHARPNESS_BETA) {
    throw new Error(`beta must be greater than ${MINIMUM_SHARPNESS_BETA}.`);
  }
}

function pointDistanceGradients(
  decomposition: DistanceDecomposition,
): { gradientToA: GradientVector; gradientToB: GradientVector } {
  const inverseDistanceToA = 1.0 / decomposition.distanceToA;
  const inverseDistanceToB = 1.0 / decomposition.distanceToB;
  const gradientToA: GradientVector = [
    decomposition.pointToAnchorAX * inverseDistanceToA,
    decomposition.pointToAnchorAY * inverseDistanceToA,
    -decomposition.pointToAnchorAX * inverseDistanceToA,
    -decomposition.pointToAnchorAY * inverseDistanceToA,
    0.0,
    0.0,
    0.0,
  ];
  const gradientToB: GradientVector = [
    decomposition.pointToAnchorBX * inverseDistanceToB,
    decomposition.pointToAnchorBY * inverseDistanceToB,
    0.0,
    0.0,
    -decomposition.pointToAnchorBX * inverseDistanceToB,
    -decomposition.pointToAnchorBY * inverseDistanceToB,
    0.0,
  ];
  return { gradientToA, gradientToB };
}

function stableSoftWeights(
  distanceToA: number,
  distanceToB: number,
  beta: number,
): {
  weightA: number;
  weightB: number;
  logSumExpValue: number;
} {
  const scoreA = -beta * distanceToA;
  const scoreB = -beta * distanceToB;
  const maxScore = Math.max(scoreA, scoreB);
  const expA = Math.exp(scoreA - maxScore);
  const expB = Math.exp(scoreB - maxScore);
  const sumExp = expA + expB;
  return {
    weightA: expA / sumExp,
    weightB: expB / sumExp,
    logSumExpValue: maxScore + Math.log(sumExp),
  };
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const decomposition = decomposeDistances(inputVector);
  assertDifferentiability(
    decomposition.distanceToA,
    decomposition.distanceToB,
    decomposition.sharpnessBeta,
  );
  const { logSumExpValue } = stableSoftWeights(
    decomposition.distanceToA,
    decomposition.distanceToB,
    decomposition.sharpnessBeta,
  );
  return -logSumExpValue / decomposition.sharpnessBeta;
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const decomposition = decomposeDistances(inputVector);
  assertDifferentiability(
    decomposition.distanceToA,
    decomposition.distanceToB,
    decomposition.sharpnessBeta,
  );
  const { weightA, weightB, logSumExpValue } = stableSoftWeights(
    decomposition.distanceToA,
    decomposition.distanceToB,
    decomposition.sharpnessBeta,
  );
  const { gradientToA, gradientToB } = pointDistanceGradients(decomposition);
  const softMinimumValue = -logSumExpValue / decomposition.sharpnessBeta;
  const expectedDistanceUnderWeights =
    weightA * decomposition.distanceToA + weightB * decomposition.distanceToB;

  const weightedDistanceGradient = gradientToA.map(
    (gradientValue, componentIndex) =>
      weightA * gradientValue + weightB * gradientToB[componentIndex],
  ) as GradientVector;

  return [
    weightedDistanceGradient[0],
    weightedDistanceGradient[1],
    weightedDistanceGradient[2],
    weightedDistanceGradient[3],
    weightedDistanceGradient[4],
    weightedDistanceGradient[5],
    (expectedDistanceUnderWeights - softMinimumValue) / decomposition.sharpnessBeta,
  ];
}

export function hess(): never {
  throw new Error("hess is not implemented.");
}

export function hvp(): never {
  throw new Error("hvp is not implemented.");
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

    function sampleBetaValue(): number {
      currentSeed =
        (LINEAR_CONGRUENTIAL_MULTIPLIER * currentSeed +
          LINEAR_CONGRUENTIAL_INCREMENT) %
        LINEAR_CONGRUENTIAL_MODULUS;
      const randomUnitValue = currentSeed / LINEAR_CONGRUENTIAL_MODULUS;
      return DOMAIN_MINIMUM_BETA + (DOMAIN_MAXIMUM_BETA - DOMAIN_MINIMUM_BETA) * randomUnitValue;
    }

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const pointX = sampleUniformValue();
      const pointY = sampleUniformValue();
      let anchorAX = sampleUniformValue();
      let anchorAY = sampleUniformValue();
      let anchorBX = sampleUniformValue();
      let anchorBY = sampleUniformValue();

      if (Math.hypot(pointX - anchorAX, pointY - anchorAY) <= DOMAIN_MINIMUM_DISTANCE) {
        anchorAX += DOMAIN_MINIMUM_DISTANCE;
      }
      if (Math.hypot(pointX - anchorBX, pointY - anchorBY) <= DOMAIN_MINIMUM_DISTANCE) {
        anchorBY += DOMAIN_MINIMUM_DISTANCE;
      }

      sampledInputs.push([
        pointX,
        pointY,
        anchorAX,
        anchorAY,
        anchorBX,
        anchorBY,
        sampleBetaValue(),
      ]);
    }
    return sampledInputs;
  },
};
