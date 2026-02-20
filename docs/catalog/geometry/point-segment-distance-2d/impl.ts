/**
 * Responsibility:
 * Provide analytical value/gradient for 2D point-to-segment distance.
 */

export type InputVector = [number, number, number, number, number, number];
export type GradientVector = [number, number, number, number, number, number];
type BranchKind = "endpoint-a" | "endpoint-b" | "interior";

const POINT_X_INDEX = 0;
const POINT_Y_INDEX = 1;
const SEGMENT_A_X_INDEX = 2;
const SEGMENT_A_Y_INDEX = 3;
const SEGMENT_B_X_INDEX = 4;
const SEGMENT_B_Y_INDEX = 5;

const MINIMUM_SEGMENT_NORM_SQUARED = 1e-10;
const MINIMUM_DISTANCE_THRESHOLD = 1e-10;
const BRANCH_MARGIN = 1e-5;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const DOMAIN_MINIMUM_SEGMENT_LENGTH = 0.3;
const DOMAIN_MINIMUM_DISTANCE = 0.05;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

type GeometryDecomposition = {
  pointX: number;
  pointY: number;
  segmentAX: number;
  segmentAY: number;
  segmentBX: number;
  segmentBY: number;
  segmentDirectionX: number;
  segmentDirectionY: number;
  pointFromAX: number;
  pointFromAY: number;
  pointFromBX: number;
  pointFromBY: number;
  segmentDirectionNormSquared: number;
  projectionParameter: number;
  signedAreaNumerator: number;
};

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for reliable derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function decomposeGeometry(inputVector: InputVector): GeometryDecomposition {
  const pointX = inputVector[POINT_X_INDEX];
  const pointY = inputVector[POINT_Y_INDEX];
  const segmentAX = inputVector[SEGMENT_A_X_INDEX];
  const segmentAY = inputVector[SEGMENT_A_Y_INDEX];
  const segmentBX = inputVector[SEGMENT_B_X_INDEX];
  const segmentBY = inputVector[SEGMENT_B_Y_INDEX];
  const segmentDirectionX = segmentBX - segmentAX;
  const segmentDirectionY = segmentBY - segmentAY;
  const pointFromAX = pointX - segmentAX;
  const pointFromAY = pointY - segmentAY;
  const pointFromBX = pointX - segmentBX;
  const pointFromBY = pointY - segmentBY;
  const segmentDirectionNormSquared =
    segmentDirectionX * segmentDirectionX + segmentDirectionY * segmentDirectionY;
  const projectionParameter =
    (pointFromAX * segmentDirectionX + pointFromAY * segmentDirectionY) /
    segmentDirectionNormSquared;
  const signedAreaNumerator =
    segmentDirectionX * pointFromAY - segmentDirectionY * pointFromAX;

  return {
    pointX,
    pointY,
    segmentAX,
    segmentAY,
    segmentBX,
    segmentBY,
    segmentDirectionX,
    segmentDirectionY,
    pointFromAX,
    pointFromAY,
    pointFromBX,
    pointFromBY,
    segmentDirectionNormSquared,
    projectionParameter,
    signedAreaNumerator,
  };
}

function classifyBranch(projectionParameter: number): BranchKind {
  if (projectionParameter <= 0.0) {
    return "endpoint-a";
  }
  if (projectionParameter >= 1.0) {
    return "endpoint-b";
  }
  return "interior";
}

function assertSegmentIsValid(segmentDirectionNormSquared: number): void {
  // Guard: segment endpoints must not coincide.
  if (segmentDirectionNormSquared <= MINIMUM_SEGMENT_NORM_SQUARED) {
    throw new Error(
      `segment direction norm squared must be greater than ${MINIMUM_SEGMENT_NORM_SQUARED}.`,
    );
  }
}

function pointLineDistanceValue(geometry: GeometryDecomposition): number {
  const squaredDistance =
    (geometry.signedAreaNumerator * geometry.signedAreaNumerator) /
    geometry.segmentDirectionNormSquared;
  return Math.sqrt(squaredDistance);
}

function endpointDistanceValue(
  pointDifferenceX: number,
  pointDifferenceY: number,
): number {
  return Math.hypot(pointDifferenceX, pointDifferenceY);
}

function assertDistanceDifferentiability(distanceValue: number): void {
  // Guard: distance derivative is not unique at zero distance.
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
}

function assertProjectionBoundaryMargin(projectionParameter: number): void {
  // Guard: piecewise derivative is not unique exactly at branch switching boundaries.
  if (Math.abs(projectionParameter) <= BRANCH_MARGIN) {
    throw new Error(
      `projectionParameter must stay away from 0 by more than ${BRANCH_MARGIN}.`,
    );
  }
  if (Math.abs(projectionParameter - 1.0) <= BRANCH_MARGIN) {
    throw new Error(
      `projectionParameter must stay away from 1 by more than ${BRANCH_MARGIN}.`,
    );
  }
}

function pointLineDistanceGradient(geometry: GeometryDecomposition): GradientVector {
  const pointLineDistance = pointLineDistanceValue(geometry);
  assertDistanceDifferentiability(pointLineDistance);

  const signedAreaGradient: GradientVector = [
    -geometry.segmentDirectionY,
    geometry.segmentDirectionX,
    geometry.segmentBY - geometry.pointY,
    geometry.pointX - geometry.segmentBX,
    geometry.pointY - geometry.segmentAY,
    geometry.segmentAX - geometry.pointX,
  ];
  const segmentNormSquaredGradient: GradientVector = [
    0.0,
    0.0,
    -2.0 * geometry.segmentDirectionX,
    -2.0 * geometry.segmentDirectionY,
    2.0 * geometry.segmentDirectionX,
    2.0 * geometry.segmentDirectionY,
  ];
  const squaredDistanceGradient = signedAreaGradient.map(
    (signedAreaGradientValue, componentIndex) =>
      (2.0 *
        geometry.signedAreaNumerator *
        signedAreaGradientValue *
        geometry.segmentDirectionNormSquared -
        geometry.signedAreaNumerator *
          geometry.signedAreaNumerator *
          segmentNormSquaredGradient[componentIndex]) /
      (geometry.segmentDirectionNormSquared * geometry.segmentDirectionNormSquared),
  ) as GradientVector;
  return squaredDistanceGradient.map(
    (gradientValue) => (0.5 / pointLineDistance) * gradientValue,
  ) as GradientVector;
}

function endpointGradient(
  pointDifferenceX: number,
  pointDifferenceY: number,
  activeEndpoint: "a" | "b",
): GradientVector {
  const distanceValue = endpointDistanceValue(pointDifferenceX, pointDifferenceY);
  assertDistanceDifferentiability(distanceValue);
  const inverseDistance = 1.0 / distanceValue;
  const gradientPointX = pointDifferenceX * inverseDistance;
  const gradientPointY = pointDifferenceY * inverseDistance;

  if (activeEndpoint === "a") {
    return [
      gradientPointX,
      gradientPointY,
      -gradientPointX,
      -gradientPointY,
      0.0,
      0.0,
    ];
  }
  return [
    gradientPointX,
    gradientPointY,
    0.0,
    0.0,
    -gradientPointX,
    -gradientPointY,
  ];
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const geometry = decomposeGeometry(inputVector);
  assertSegmentIsValid(geometry.segmentDirectionNormSquared);
  const branchKind = classifyBranch(geometry.projectionParameter);

  if (branchKind === "endpoint-a") {
    return endpointDistanceValue(geometry.pointFromAX, geometry.pointFromAY);
  }
  if (branchKind === "endpoint-b") {
    return endpointDistanceValue(geometry.pointFromBX, geometry.pointFromBY);
  }
  return pointLineDistanceValue(geometry);
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const geometry = decomposeGeometry(inputVector);
  assertSegmentIsValid(geometry.segmentDirectionNormSquared);
  assertProjectionBoundaryMargin(geometry.projectionParameter);

  const branchKind = classifyBranch(geometry.projectionParameter);
  if (branchKind === "endpoint-a") {
    return endpointGradient(geometry.pointFromAX, geometry.pointFromAY, "a");
  }
  if (branchKind === "endpoint-b") {
    return endpointGradient(geometry.pointFromBX, geometry.pointFromBY, "b");
  }
  return pointLineDistanceGradient(geometry);
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
      const branchSelector = sampleIndex % 3;
      const segmentAX = sampleUniformValue();
      const segmentAY = sampleUniformValue();
      const segmentDirectionX =
        DOMAIN_MINIMUM_SEGMENT_LENGTH + Math.abs(sampleUniformValue());
      const segmentDirectionY = 0.3 * sampleUniformValue();
      const segmentBX = segmentAX + segmentDirectionX;
      const segmentBY = segmentAY + segmentDirectionY;

      if (branchSelector === 0) {
        sampledInputs.push([
          segmentAX - 0.5 * segmentDirectionX,
          segmentAY + DOMAIN_MINIMUM_DISTANCE,
          segmentAX,
          segmentAY,
          segmentBX,
          segmentBY,
        ]);
        continue;
      }

      if (branchSelector === 1) {
        sampledInputs.push([
          segmentBX + 0.5 * segmentDirectionX,
          segmentBY + DOMAIN_MINIMUM_DISTANCE,
          segmentAX,
          segmentAY,
          segmentBX,
          segmentBY,
        ]);
        continue;
      }

      const interiorProjectionFactor = 0.5;
      const interiorBaseX = segmentAX + interiorProjectionFactor * segmentDirectionX;
      const interiorBaseY = segmentAY + interiorProjectionFactor * segmentDirectionY;
      sampledInputs.push([
        interiorBaseX,
        interiorBaseY + DOMAIN_MINIMUM_DISTANCE,
        segmentAX,
        segmentAY,
        segmentBX,
        segmentBY,
      ]);
    }

    return sampledInputs;
  },
};
