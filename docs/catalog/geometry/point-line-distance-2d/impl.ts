/**
 * Responsibility:
 * Provide analytical value/gradient for 2D point-to-infinite-line distance.
 */

export type InputVector = [number, number, number, number, number, number];
export type GradientVector = [number, number, number, number, number, number];

const POINT_X_INDEX = 0;
const POINT_Y_INDEX = 1;
const LINE_POINT_A_X_INDEX = 2;
const LINE_POINT_A_Y_INDEX = 3;
const LINE_POINT_B_X_INDEX = 4;
const LINE_POINT_B_Y_INDEX = 5;

const MINIMUM_LINE_DIRECTION_NORM_SQUARED = 1e-10;
const MINIMUM_DISTANCE_THRESHOLD = 1e-10;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;
const DOMAIN_MINIMUM_LINE_LENGTH = 0.2;
const DOMAIN_MINIMUM_POINT_LINE_DISTANCE = 0.05;

type DecomposedGeometry = {
  pointX: number;
  pointY: number;
  linePointAX: number;
  linePointAY: number;
  linePointBX: number;
  linePointBY: number;
  lineDirectionX: number;
  lineDirectionY: number;
  signedAreaNumerator: number;
  lineDirectionNormSquared: number;
};

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: derivatives require finite inputs.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function decomposeGeometry(inputVector: InputVector): DecomposedGeometry {
  const pointX = inputVector[POINT_X_INDEX];
  const pointY = inputVector[POINT_Y_INDEX];
  const linePointAX = inputVector[LINE_POINT_A_X_INDEX];
  const linePointAY = inputVector[LINE_POINT_A_Y_INDEX];
  const linePointBX = inputVector[LINE_POINT_B_X_INDEX];
  const linePointBY = inputVector[LINE_POINT_B_Y_INDEX];
  const lineDirectionX = linePointBX - linePointAX;
  const lineDirectionY = linePointBY - linePointAY;
  const signedAreaNumerator =
    lineDirectionX * (pointY - linePointAY) -
    lineDirectionY * (pointX - linePointAX);
  const lineDirectionNormSquared =
    lineDirectionX * lineDirectionX + lineDirectionY * lineDirectionY;

  return {
    pointX,
    pointY,
    linePointAX,
    linePointAY,
    linePointBX,
    linePointBY,
    lineDirectionX,
    lineDirectionY,
    signedAreaNumerator,
    lineDirectionNormSquared,
  };
}

function assertDifferentiability(
  lineDirectionNormSquared: number,
  pointLineDistance: number,
): void {
  // Guard: degenerate line direction is invalid.
  if (lineDirectionNormSquared <= MINIMUM_LINE_DIRECTION_NORM_SQUARED) {
    throw new Error(
      `line direction norm squared must be greater than ${MINIMUM_LINE_DIRECTION_NORM_SQUARED}.`,
    );
  }
  // Guard: distance derivative is not unique at distance zero.
  if (pointLineDistance <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `point-line distance must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
}

function computePointLineDistanceFromGeometry(geometry: DecomposedGeometry): number {
  const squaredDistance =
    (geometry.signedAreaNumerator * geometry.signedAreaNumerator) /
    geometry.lineDirectionNormSquared;
  return Math.sqrt(squaredDistance);
}

function multiplyScalarAndVector(
  scalarValue: number,
  vector: GradientVector,
): GradientVector {
  return vector.map((componentValue) => scalarValue * componentValue) as GradientVector;
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const geometry = decomposeGeometry(inputVector);
  // Guard: value is undefined for degenerate lines.
  if (geometry.lineDirectionNormSquared <= MINIMUM_LINE_DIRECTION_NORM_SQUARED) {
    throw new Error(
      `line direction norm squared must be greater than ${MINIMUM_LINE_DIRECTION_NORM_SQUARED}.`,
    );
  }
  return computePointLineDistanceFromGeometry(geometry);
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const geometry = decomposeGeometry(inputVector);
  const pointLineDistance = computePointLineDistanceFromGeometry(geometry);
  assertDifferentiability(geometry.lineDirectionNormSquared, pointLineDistance);

  const signedAreaGradient: GradientVector = [
    -geometry.lineDirectionY,
    geometry.lineDirectionX,
    geometry.linePointBY - geometry.pointY,
    geometry.pointX - geometry.linePointBX,
    geometry.pointY - geometry.linePointAY,
    geometry.linePointAX - geometry.pointX,
  ];

  const lineDirectionNormSquaredGradient: GradientVector = [
    0.0,
    0.0,
    -2.0 * geometry.lineDirectionX,
    -2.0 * geometry.lineDirectionY,
    2.0 * geometry.lineDirectionX,
    2.0 * geometry.lineDirectionY,
  ];

  const squaredDistanceGradient = signedAreaGradient.map(
    (signedAreaGradientValue, componentIndex) =>
      (2.0 *
        geometry.signedAreaNumerator *
        signedAreaGradientValue *
        geometry.lineDirectionNormSquared -
        geometry.signedAreaNumerator *
          geometry.signedAreaNumerator *
          lineDirectionNormSquaredGradient[componentIndex]) /
      (geometry.lineDirectionNormSquared * geometry.lineDirectionNormSquared),
  ) as GradientVector;

  return multiplyScalarAndVector(0.5 / pointLineDistance, squaredDistanceGradient);
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

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const linePointAX = sampleUniformValue();
      const linePointAY = sampleUniformValue();
      let linePointBX = sampleUniformValue();
      let linePointBY = sampleUniformValue();

      const lineDirectionNorm = Math.hypot(
        linePointBX - linePointAX,
        linePointBY - linePointAY,
      );
      // Guard: avoid degenerate lines in random sampling.
      if (lineDirectionNorm <= DOMAIN_MINIMUM_LINE_LENGTH) {
        linePointBX = linePointAX + DOMAIN_MINIMUM_LINE_LENGTH;
        linePointBY = linePointAY;
      }

      let pointX = sampleUniformValue();
      let pointY = sampleUniformValue();
      const candidateDistance = value([
        pointX,
        pointY,
        linePointAX,
        linePointAY,
        linePointBX,
        linePointBY,
      ]);
      // Guard: avoid distance-zero neighborhood for stable gradient checks.
      if (candidateDistance <= DOMAIN_MINIMUM_POINT_LINE_DISTANCE) {
        pointY += DOMAIN_MINIMUM_POINT_LINE_DISTANCE;
      }

      sampledInputs.push([
        pointX,
        pointY,
        linePointAX,
        linePointAY,
        linePointBX,
        linePointBY,
      ]);
    }

    return sampledInputs;
  },
};
