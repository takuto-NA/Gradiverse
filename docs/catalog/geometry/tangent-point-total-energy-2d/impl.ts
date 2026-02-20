/**
 * Responsibility:
 * Provide analytical value and gradient for total 2D Tangent Point Energy (TPE)
 * on a closed polyline with cyclic indexing.
 */

export type Vector2 = [number, number];
export type StateVector = number[];
export type GradientVector = number[];
export type Parameters = {
  alphaExponent: number;
};

type Matrix2x2 = [[number, number], [number, number]];
type NormalKinematics = {
  normalVectorAtPoint: Vector2;
  normalJacobianForNextPoint: Matrix2x2;
};

const X_OFFSET = 0;
const Y_OFFSET = 1;
const COORDINATES_PER_POINT = 2;
const MINIMUM_POINT_COUNT = 3;
const DEFAULT_ALPHA_EXPONENT = 3.0;
const MINIMUM_DISTANCE_THRESHOLD = 1e-8;
const MINIMUM_NORMAL_PROJECTION_THRESHOLD = 1e-10;
const MINIMUM_TANGENT_NORM_THRESHOLD = 1e-8;
const DEFAULT_POINT_COUNT = 10;
const DEFAULT_RADIUS = 1.0;
const DEFAULT_RADIAL_NOISE_AMPLITUDE = 0.05;
const DOMAIN_ANGLE_LOWER_BOUND = 0.0;
const DOMAIN_ANGLE_UPPER_BOUND = Math.PI * 2.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;
const MAXIMUM_SAMPLE_RETRY_COUNT = 64;

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

function assertValidStateVector(stateVector: StateVector): void {
  assertFiniteValues(stateVector, "stateVector");
  const hasEvenCoordinateCount =
    stateVector.length % COORDINATES_PER_POINT === 0;
  // Guard: point coordinates must be stored as [x0, y0, x1, y1, ...].
  if (!hasEvenCoordinateCount) {
    throw new Error("stateVector length must be divisible by 2.");
  }

  const pointCount = stateVector.length / COORDINATES_PER_POINT;
  // Guard: at least 3 points are required to define cyclic tangents.
  if (pointCount < MINIMUM_POINT_COUNT) {
    throw new Error("stateVector must contain at least 3 points.");
  }
}

function pointCountFromState(stateVector: StateVector): number {
  return stateVector.length / COORDINATES_PER_POINT;
}

function pointIndexToCoordinateOffset(pointIndex: number): number {
  return pointIndex * COORDINATES_PER_POINT;
}

function cyclicPointIndex(pointIndex: number, pointCount: number): number {
  const normalizedIndex = pointIndex % pointCount;
  return normalizedIndex < 0 ? normalizedIndex + pointCount : normalizedIndex;
}

function readPoint(stateVector: StateVector, pointIndex: number): Vector2 {
  const coordinateOffset = pointIndexToCoordinateOffset(pointIndex);
  return [
    stateVector[coordinateOffset + X_OFFSET],
    stateVector[coordinateOffset + Y_OFFSET],
  ];
}

function writeAddPoint(
  gradientVector: GradientVector,
  pointIndex: number,
  contribution: Vector2,
): void {
  const coordinateOffset = pointIndexToCoordinateOffset(pointIndex);
  gradientVector[coordinateOffset + X_OFFSET] += contribution[0];
  gradientVector[coordinateOffset + Y_OFFSET] += contribution[1];
}

function subtractVector2(leftVector: Vector2, rightVector: Vector2): Vector2 {
  return [leftVector[0] - rightVector[0], leftVector[1] - rightVector[1]];
}

function dotVector2(leftVector: Vector2, rightVector: Vector2): number {
  return leftVector[0] * rightVector[0] + leftVector[1] * rightVector[1];
}

function multiplyScalarAndVector2(scalarValue: number, vector2: Vector2): Vector2 {
  return [scalarValue * vector2[0], scalarValue * vector2[1]];
}

function transposeMultiplyMatrix2AndVector2(matrix2: Matrix2x2, vector2: Vector2): Vector2 {
  return [
    matrix2[0][0] * vector2[0] + matrix2[1][0] * vector2[1],
    matrix2[0][1] * vector2[0] + matrix2[1][1] * vector2[1],
  ];
}

function buildNormalKinematics(
  stateVector: StateVector,
  pointIndex: number,
): NormalKinematics {
  const pointCount = pointCountFromState(stateVector);
  const previousPoint = readPoint(
    stateVector,
    cyclicPointIndex(pointIndex - 1, pointCount),
  );
  const nextPoint = readPoint(
    stateVector,
    cyclicPointIndex(pointIndex + 1, pointCount),
  );
  const tangentVector = subtractVector2(nextPoint, previousPoint);
  const tangentNorm = Math.hypot(tangentVector[0], tangentVector[1]);

  // Guard: tangent normalization requires a non-zero norm.
  if (tangentNorm <= MINIMUM_TANGENT_NORM_THRESHOLD) {
    throw new Error(
      `tangentNorm must be greater than ${MINIMUM_TANGENT_NORM_THRESHOLD}.`,
    );
  }

  const reciprocalTangentNorm = 1.0 / tangentNorm;
  const unitTangentVector = multiplyScalarAndVector2(
    reciprocalTangentNorm,
    tangentVector,
  );
  const normalVectorAtPoint: Vector2 = [-unitTangentVector[1], unitTangentVector[0]];

  const projectionMatrix: Matrix2x2 = [
    [
      1.0 - unitTangentVector[0] * unitTangentVector[0],
      -unitTangentVector[0] * unitTangentVector[1],
    ],
    [
      -unitTangentVector[1] * unitTangentVector[0],
      1.0 - unitTangentVector[1] * unitTangentVector[1],
    ],
  ];
  const rotationMatrix: Matrix2x2 = [
    [0.0, -1.0],
    [1.0, 0.0],
  ];
  const rotationProjectionMatrix: Matrix2x2 = [
    [
      rotationMatrix[0][0] * projectionMatrix[0][0] +
        rotationMatrix[0][1] * projectionMatrix[1][0],
      rotationMatrix[0][0] * projectionMatrix[0][1] +
        rotationMatrix[0][1] * projectionMatrix[1][1],
    ],
    [
      rotationMatrix[1][0] * projectionMatrix[0][0] +
        rotationMatrix[1][1] * projectionMatrix[1][0],
      rotationMatrix[1][0] * projectionMatrix[0][1] +
        rotationMatrix[1][1] * projectionMatrix[1][1],
    ],
  ];
  const normalJacobianForNextPoint: Matrix2x2 = [
    [
      reciprocalTangentNorm * rotationProjectionMatrix[0][0],
      reciprocalTangentNorm * rotationProjectionMatrix[0][1],
    ],
    [
      reciprocalTangentNorm * rotationProjectionMatrix[1][0],
      reciprocalTangentNorm * rotationProjectionMatrix[1][1],
    ],
  ];

  return {
    normalVectorAtPoint,
    normalJacobianForNextPoint,
  };
}

function computeTotalEnergyAndGradient(
  stateVector: StateVector,
  parameters: Parameters,
): {
  totalEnergyValue: number;
  totalGradient: GradientVector;
} {
  assertValidStateVector(stateVector);
  assertPositiveAlpha(parameters.alphaExponent);

  const pointCount = pointCountFromState(stateVector);
  const normalKinematicsPerPoint: NormalKinematics[] = [];
  for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
    normalKinematicsPerPoint.push(buildNormalKinematics(stateVector, pointIndex));
  }

  let totalEnergyValue = 0.0;
  const totalGradient: GradientVector = new Array(stateVector.length).fill(0.0);

  for (let pointI = 0; pointI < pointCount; pointI += 1) {
    const pointIValue = readPoint(stateVector, pointI);
    const normalVectorAtPointI = normalKinematicsPerPoint[pointI].normalVectorAtPoint;
    const normalJacobianForNextPoint =
      normalKinematicsPerPoint[pointI].normalJacobianForNextPoint;

    for (let pointJ = 0; pointJ < pointCount; pointJ += 1) {
      if (pointJ === pointI) {
        continue;
      }

      const pointJValue = readPoint(stateVector, pointJ);
      const relativePositionVector = subtractVector2(pointJValue, pointIValue);
      const distanceSquared = dotVector2(relativePositionVector, relativePositionVector);
      const minimumDistanceSquared = MINIMUM_DISTANCE_THRESHOLD * MINIMUM_DISTANCE_THRESHOLD;

      // Guard: pair distance must stay away from zero.
      if (distanceSquared <= minimumDistanceSquared) {
        throw new Error(`distanceSquared must be greater than ${minimumDistanceSquared}.`);
      }

      const normalProjection = dotVector2(normalVectorAtPointI, relativePositionVector);
      const absoluteNormalProjection = Math.abs(normalProjection);

      // Guard: absolute value cusp at zero projection is non-differentiable.
      if (absoluteNormalProjection <= MINIMUM_NORMAL_PROJECTION_THRESHOLD) {
        throw new Error(
          `absoluteNormalProjection must be greater than ${MINIMUM_NORMAL_PROJECTION_THRESHOLD}.`,
        );
      }

      const baseValue = (2.0 * absoluteNormalProjection) / distanceSquared;
      const pairEnergyValue = baseValue ** parameters.alphaExponent;
      totalEnergyValue += pairEnergyValue;

      const pairGradientScale = parameters.alphaExponent * pairEnergyValue;
      const reciprocalNormalProjection = 1.0 / normalProjection;
      const reciprocalDistanceSquared = 1.0 / distanceSquared;

      const directGradientAtPointJ: Vector2 = [
        pairGradientScale *
          (normalVectorAtPointI[0] * reciprocalNormalProjection -
            2.0 * relativePositionVector[0] * reciprocalDistanceSquared),
        pairGradientScale *
          (normalVectorAtPointI[1] * reciprocalNormalProjection -
            2.0 * relativePositionVector[1] * reciprocalDistanceSquared),
      ];
      writeAddPoint(totalGradient, pointJ, directGradientAtPointJ);
      writeAddPoint(totalGradient, pointI, multiplyScalarAndVector2(-1.0, directGradientAtPointJ));

      const derivativeWithRespectToNormal: Vector2 = [
        pairGradientScale * relativePositionVector[0] * reciprocalNormalProjection,
        pairGradientScale * relativePositionVector[1] * reciprocalNormalProjection,
      ];
      const chainContributionAtNextPoint = transposeMultiplyMatrix2AndVector2(
        normalJacobianForNextPoint,
        derivativeWithRespectToNormal,
      );
      const nextPointIndex = cyclicPointIndex(pointI + 1, pointCount);
      const previousPointIndex = cyclicPointIndex(pointI - 1, pointCount);
      writeAddPoint(totalGradient, nextPointIndex, chainContributionAtNextPoint);
      writeAddPoint(
        totalGradient,
        previousPointIndex,
        multiplyScalarAndVector2(-1.0, chainContributionAtNextPoint),
      );
    }
  }

  return {
    totalEnergyValue,
    totalGradient,
  };
}

export function value(
  stateVector: StateVector,
  parameters: Parameters = { alphaExponent: DEFAULT_ALPHA_EXPONENT },
): number {
  return computeTotalEnergyAndGradient(stateVector, parameters).totalEnergyValue;
}

export function grad(
  stateVector: StateVector,
  parameters: Parameters = { alphaExponent: DEFAULT_ALPHA_EXPONENT },
): GradientVector {
  return computeTotalEnergyAndGradient(stateVector, parameters).totalGradient;
}

export const domain = {
  sample(seed: number, sampleCount: number, pointCount: number = DEFAULT_POINT_COUNT): StateVector[] {
    // Guard: sampleCount must be non-negative.
    if (sampleCount < 0) {
      throw new Error("sampleCount must be greater than or equal to zero.");
    }
    // Guard: pointCount must be large enough for cyclic tangents.
    if (pointCount < MINIMUM_POINT_COUNT) {
      throw new Error("pointCount must be greater than or equal to 3.");
    }

    const sampledStates: StateVector[] = [];
    let currentSeed = seed >>> 0;

    function sampleUniformValue(lowerBound: number, upperBound: number): number {
      currentSeed =
        (LINEAR_CONGRUENTIAL_MULTIPLIER * currentSeed +
          LINEAR_CONGRUENTIAL_INCREMENT) %
        LINEAR_CONGRUENTIAL_MODULUS;
      const randomUnitValue = currentSeed / LINEAR_CONGRUENTIAL_MODULUS;
      return lowerBound + (upperBound - lowerBound) * randomUnitValue;
    }

    while (sampledStates.length < sampleCount) {
      let acceptedSampleState: StateVector | null = null;
      for (let retryCount = 0; retryCount < MAXIMUM_SAMPLE_RETRY_COUNT; retryCount += 1) {
        const candidateState: StateVector = [];
        for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
          const pointRatio = pointIndex / pointCount;
          const baseAngle =
            DOMAIN_ANGLE_LOWER_BOUND +
            (DOMAIN_ANGLE_UPPER_BOUND - DOMAIN_ANGLE_LOWER_BOUND) * pointRatio;
          const angularJitter = sampleUniformValue(-0.08, 0.08);
          const radialJitter = sampleUniformValue(
            -DEFAULT_RADIAL_NOISE_AMPLITUDE,
            DEFAULT_RADIAL_NOISE_AMPLITUDE,
          );
          const radius = DEFAULT_RADIUS + radialJitter;
          const angle = baseAngle + angularJitter;
          candidateState.push(radius * Math.cos(angle));
          candidateState.push(radius * Math.sin(angle));
        }

        try {
          // Guard: accept only states that are differentiable for default alpha.
          value(candidateState, { alphaExponent: DEFAULT_ALPHA_EXPONENT });
          acceptedSampleState = candidateState;
          break;
        } catch {
          continue;
        }
      }

      if (acceptedSampleState === null) {
        throw new Error(
          `Failed to sample a differentiable state after ${MAXIMUM_SAMPLE_RETRY_COUNT} retries.`,
        );
      }

      sampledStates.push(acceptedSampleState);
    }

    return sampledStates;
  },
};
