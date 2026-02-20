/**
 * Responsibility:
 * Provide analytical value and gradient for 2D tangent-point pair energy:
 * E_ij = (2 * |n_i · (p_j - p_i)| / |p_j - p_i|^2)^alpha.
 */

export type Vector2 = [number, number];
export type InputVector = [number, number, number, number];
export type GradientVector = [number, number, number, number];
export type Parameters = {
  normalVectorAtPointI: Vector2;
  alphaExponent: number;
};

const PI_X_INDEX = 0;
const PI_Y_INDEX = 1;
const PJ_X_INDEX = 2;
const PJ_Y_INDEX = 3;
const DEFAULT_ALPHA_EXPONENT = 3.0;
const DEFAULT_MINIMUM_SAMPLE_DISTANCE = 0.2;
const MINIMUM_DISTANCE_THRESHOLD = 1e-8;
const MINIMUM_NORMAL_PROJECTION_THRESHOLD = 1e-10;
const DOMAIN_LOWER_BOUND = -1.5;
const DOMAIN_UPPER_BOUND = 1.5;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

function assertFiniteValues(inputValues: number[], inputName: string): void {
  for (const inputValue of inputValues) {
    // Guard: analytic expressions require finite values.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertPositiveAlpha(alphaExponent: number): void {
  // Guard: alpha must stay positive for the intended potential.
  if (!(alphaExponent > 0.0)) {
    throw new Error("alphaExponent must be greater than zero.");
  }
}

function dotVector2(leftVector: Vector2, rightVector: Vector2): number {
  return leftVector[0] * rightVector[0] + leftVector[1] * rightVector[1];
}

function subtractVector2(leftVector: Vector2, rightVector: Vector2): Vector2 {
  return [leftVector[0] - rightVector[0], leftVector[1] - rightVector[1]];
}

function multiplyScalarAndVector2(scalarValue: number, inputVector: Vector2): Vector2 {
  return [scalarValue * inputVector[0], scalarValue * inputVector[1]];
}

function extractPoints(inputVector: InputVector): { pointI: Vector2; pointJ: Vector2 } {
  return {
    pointI: [inputVector[PI_X_INDEX], inputVector[PI_Y_INDEX]],
    pointJ: [inputVector[PJ_X_INDEX], inputVector[PJ_Y_INDEX]],
  };
}

function decomposeEnergyTerms(
  inputVector: InputVector,
  parameters: Parameters,
): {
  relativePositionVector: Vector2;
  distanceSquared: number;
  normalProjection: number;
  absoluteNormalProjection: number;
  tangentPointPairValue: number;
} {
  assertFiniteValues(inputVector, "inputVector");
  assertFiniteValues(parameters.normalVectorAtPointI, "parameters.normalVectorAtPointI");
  assertPositiveAlpha(parameters.alphaExponent);

  const { pointI, pointJ } = extractPoints(inputVector);
  const relativePositionVector = subtractVector2(pointJ, pointI);
  const distanceSquared = dotVector2(relativePositionVector, relativePositionVector);

  // Guard: pair distance must stay away from zero.
  if (distanceSquared <= MINIMUM_DISTANCE_THRESHOLD * MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceSquared must be greater than ${
        MINIMUM_DISTANCE_THRESHOLD * MINIMUM_DISTANCE_THRESHOLD
      }.`,
    );
  }

  const normalProjection = dotVector2(parameters.normalVectorAtPointI, relativePositionVector);
  const absoluteNormalProjection = Math.abs(normalProjection);

  // Guard: absolute value cusp at zero projection is non-differentiable.
  if (absoluteNormalProjection <= MINIMUM_NORMAL_PROJECTION_THRESHOLD) {
    throw new Error(
      `absoluteNormalProjection must be greater than ${MINIMUM_NORMAL_PROJECTION_THRESHOLD}.`,
    );
  }

  const baseValue = (2.0 * absoluteNormalProjection) / distanceSquared;
  const tangentPointPairValue = baseValue ** parameters.alphaExponent;

  return {
    relativePositionVector,
    distanceSquared,
    normalProjection,
    absoluteNormalProjection,
    tangentPointPairValue,
  };
}

export function value(
  inputVector: InputVector,
  parameters: Parameters = {
    normalVectorAtPointI: [0.0, 1.0],
    alphaExponent: DEFAULT_ALPHA_EXPONENT,
  },
): number {
  return decomposeEnergyTerms(inputVector, parameters).tangentPointPairValue;
}

export function grad(
  inputVector: InputVector,
  parameters: Parameters = {
    normalVectorAtPointI: [0.0, 1.0],
    alphaExponent: DEFAULT_ALPHA_EXPONENT,
  },
): GradientVector {
  const decomposedTerms = decomposeEnergyTerms(inputVector, parameters);
  const gradientScale = parameters.alphaExponent * decomposedTerms.tangentPointPairValue;
  const reciprocalNormalProjection = 1.0 / decomposedTerms.normalProjection;
  const reciprocalDistanceSquared = 1.0 / decomposedTerms.distanceSquared;

  const gradientAtPointJ: Vector2 = [
    gradientScale *
      (parameters.normalVectorAtPointI[0] * reciprocalNormalProjection -
        2.0 * decomposedTerms.relativePositionVector[0] * reciprocalDistanceSquared),
    gradientScale *
      (parameters.normalVectorAtPointI[1] * reciprocalNormalProjection -
        2.0 * decomposedTerms.relativePositionVector[1] * reciprocalDistanceSquared),
  ];
  const gradientAtPointI = multiplyScalarAndVector2(-1.0, gradientAtPointJ);

  return [
    gradientAtPointI[0],
    gradientAtPointI[1],
    gradientAtPointJ[0],
    gradientAtPointJ[1],
  ];
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
      const pointIX = sampleUniformValue();
      const pointIY = sampleUniformValue();
      let pointJX = sampleUniformValue();
      let pointJY = sampleUniformValue();
      const sampledDistance = Math.hypot(pointJX - pointIX, pointJY - pointIY);

      // Guard: avoid near-singular point pairs for validation.
      if (sampledDistance <= DEFAULT_MINIMUM_SAMPLE_DISTANCE) {
        pointJX = pointIX + DEFAULT_MINIMUM_SAMPLE_DISTANCE;
        pointJY = pointIY;
      }

      sampledInputs.push([pointIX, pointIY, pointJX, pointJY]);
    }

    return sampledInputs;
  },
};
