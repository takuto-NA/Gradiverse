/**
 * Responsibility:
 * Provide analytical value/gradient for 2D point-to-triangle-boundary distance.
 */

export type InputVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type GradientVector = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const POINT_X_INDEX = 0;
const POINT_Y_INDEX = 1;
const A_X_INDEX = 2;
const A_Y_INDEX = 3;
const B_X_INDEX = 4;
const B_Y_INDEX = 5;
const C_X_INDEX = 6;
const C_Y_INDEX = 7;

const MINIMUM_SEGMENT_NORM_SQUARED = 1e-10;
const MINIMUM_DISTANCE_THRESHOLD = 1e-10;
const BRANCH_MARGIN = 1e-5;
const CANDIDATE_TIE_MARGIN = 1e-8;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const DOMAIN_MINIMUM_TRIANGLE_EDGE_LENGTH = 0.3;
const DOMAIN_MINIMUM_DISTANCE = 0.05;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

type PointSegmentResult = {
  distanceValue: number;
  gradientVector: [number, number, number, number, number, number];
  projectionParameter: number;
};

type CandidateDistanceResult = {
  distanceValue: number;
  gradientVector: GradientVector;
};

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: all coordinates must be finite.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertPositiveDistance(distanceValue: number): void {
  // Guard: distance gradient is not unique at zero.
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
}

function assertSegmentIsValid(segmentNormSquared: number): void {
  // Guard: each triangle edge must be non-degenerate.
  if (segmentNormSquared <= MINIMUM_SEGMENT_NORM_SQUARED) {
    throw new Error(
      `segment norm squared must be greater than ${MINIMUM_SEGMENT_NORM_SQUARED}.`,
    );
  }
}

function assertProjectionBoundaryMargin(projectionParameter: number): void {
  // Guard: derivative is non-unique at projection branch boundaries.
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

function mapPointSegmentGradientToTriangleGradient(
  pointSegmentGradient: [number, number, number, number, number, number],
  edge: "AB" | "BC" | "CA",
): GradientVector {
  if (edge === "AB") {
    return [
      pointSegmentGradient[0],
      pointSegmentGradient[1],
      pointSegmentGradient[2],
      pointSegmentGradient[3],
      pointSegmentGradient[4],
      pointSegmentGradient[5],
      0.0,
      0.0,
    ];
  }
  if (edge === "BC") {
    return [
      pointSegmentGradient[0],
      pointSegmentGradient[1],
      0.0,
      0.0,
      pointSegmentGradient[2],
      pointSegmentGradient[3],
      pointSegmentGradient[4],
      pointSegmentGradient[5],
    ];
  }
  return [
    pointSegmentGradient[0],
    pointSegmentGradient[1],
    pointSegmentGradient[4],
    pointSegmentGradient[5],
    0.0,
    0.0,
    pointSegmentGradient[2],
    pointSegmentGradient[3],
  ];
}

function pointSegmentDistanceAndGradient(
  pointX: number,
  pointY: number,
  segmentAX: number,
  segmentAY: number,
  segmentBX: number,
  segmentBY: number,
): PointSegmentResult {
  const directionX = segmentBX - segmentAX;
  const directionY = segmentBY - segmentAY;
  const segmentNormSquared = directionX * directionX + directionY * directionY;
  assertSegmentIsValid(segmentNormSquared);
  const pointFromAX = pointX - segmentAX;
  const pointFromAY = pointY - segmentAY;
  const projectionParameter =
    (pointFromAX * directionX + pointFromAY * directionY) / segmentNormSquared;

  if (projectionParameter <= 0.0) {
    const distanceValue = Math.hypot(pointFromAX, pointFromAY);
    assertPositiveDistance(distanceValue);
    const inverseDistance = 1.0 / distanceValue;
    return {
      distanceValue,
      gradientVector: [
        pointFromAX * inverseDistance,
        pointFromAY * inverseDistance,
        -pointFromAX * inverseDistance,
        -pointFromAY * inverseDistance,
        0.0,
        0.0,
      ],
      projectionParameter,
    };
  }

  const pointFromBX = pointX - segmentBX;
  const pointFromBY = pointY - segmentBY;
  if (projectionParameter >= 1.0) {
    const distanceValue = Math.hypot(pointFromBX, pointFromBY);
    assertPositiveDistance(distanceValue);
    const inverseDistance = 1.0 / distanceValue;
    return {
      distanceValue,
      gradientVector: [
        pointFromBX * inverseDistance,
        pointFromBY * inverseDistance,
        0.0,
        0.0,
        -pointFromBX * inverseDistance,
        -pointFromBY * inverseDistance,
      ],
      projectionParameter,
    };
  }

  const signedAreaNumerator = directionX * pointFromAY - directionY * pointFromAX;
  const distanceValue = Math.abs(signedAreaNumerator) / Math.sqrt(segmentNormSquared);
  assertPositiveDistance(distanceValue);

  const signedAreaGradient: [number, number, number, number, number, number] = [
    -directionY,
    directionX,
    segmentBY - pointY,
    pointX - segmentBX,
    pointY - segmentAY,
    segmentAX - pointX,
  ];
  const segmentNormSquaredGradient: [number, number, number, number, number, number] =
    [
      0.0,
      0.0,
      -2.0 * directionX,
      -2.0 * directionY,
      2.0 * directionX,
      2.0 * directionY,
    ];

  const signValue = Math.sign(signedAreaNumerator);
  const inverseSegmentNorm = 1.0 / Math.sqrt(segmentNormSquared);
  const inverseSegmentNormCubed = inverseSegmentNorm / segmentNormSquared;
  const firstTerm = signedAreaGradient.map(
    (gradientValue) => signValue * inverseSegmentNorm * gradientValue,
  ) as [number, number, number, number, number, number];
  const secondTerm = segmentNormSquaredGradient.map(
    (gradientValue) =>
      0.5 *
      Math.abs(signedAreaNumerator) *
      inverseSegmentNormCubed *
      gradientValue,
  ) as [number, number, number, number, number, number];

  return {
    distanceValue,
    gradientVector: firstTerm.map(
      (firstTermValue, componentIndex) => firstTermValue - secondTerm[componentIndex],
    ) as [number, number, number, number, number, number],
    projectionParameter,
  };
}

function selectUniqueMinimumCandidate(
  candidates: CandidateDistanceResult[],
): CandidateDistanceResult {
  let bestCandidateIndex = 0;
  for (let candidateIndex = 1; candidateIndex < candidates.length; candidateIndex += 1) {
    if (
      candidates[candidateIndex].distanceValue <
      candidates[bestCandidateIndex].distanceValue
    ) {
      bestCandidateIndex = candidateIndex;
    }
  }
  const bestDistanceValue = candidates[bestCandidateIndex].distanceValue;
  const nearMinimumCandidateCount = candidates.filter(
    (candidateResult) =>
      Math.abs(candidateResult.distanceValue - bestDistanceValue) <=
      CANDIDATE_TIE_MARGIN,
  ).length;

  // Guard: gradient is non-unique where multiple branches share the minimum.
  if (nearMinimumCandidateCount > 1) {
    throw new Error(
      `minimum candidate is not unique within tie margin ${CANDIDATE_TIE_MARGIN}.`,
    );
  }
  return candidates[bestCandidateIndex];
}

function candidateFromEdge(
  edge: "AB" | "BC" | "CA",
  inputVector: InputVector,
): CandidateDistanceResult {
  let pointSegmentResult: PointSegmentResult;
  if (edge === "AB") {
    pointSegmentResult = pointSegmentDistanceAndGradient(
      inputVector[POINT_X_INDEX],
      inputVector[POINT_Y_INDEX],
      inputVector[A_X_INDEX],
      inputVector[A_Y_INDEX],
      inputVector[B_X_INDEX],
      inputVector[B_Y_INDEX],
    );
  } else if (edge === "BC") {
    pointSegmentResult = pointSegmentDistanceAndGradient(
      inputVector[POINT_X_INDEX],
      inputVector[POINT_Y_INDEX],
      inputVector[B_X_INDEX],
      inputVector[B_Y_INDEX],
      inputVector[C_X_INDEX],
      inputVector[C_Y_INDEX],
    );
  } else {
    pointSegmentResult = pointSegmentDistanceAndGradient(
      inputVector[POINT_X_INDEX],
      inputVector[POINT_Y_INDEX],
      inputVector[C_X_INDEX],
      inputVector[C_Y_INDEX],
      inputVector[A_X_INDEX],
      inputVector[A_Y_INDEX],
    );
  }
  assertProjectionBoundaryMargin(pointSegmentResult.projectionParameter);
  return {
    distanceValue: pointSegmentResult.distanceValue,
    gradientVector: mapPointSegmentGradientToTriangleGradient(
      pointSegmentResult.gradientVector,
      edge,
    ),
  };
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const candidates: CandidateDistanceResult[] = [
    candidateFromEdge("AB", inputVector),
    candidateFromEdge("BC", inputVector),
    candidateFromEdge("CA", inputVector),
  ];
  return selectUniqueMinimumCandidate(candidates).distanceValue;
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const candidates: CandidateDistanceResult[] = [
    candidateFromEdge("AB", inputVector),
    candidateFromEdge("BC", inputVector),
    candidateFromEdge("CA", inputVector),
  ];
  return selectUniqueMinimumCandidate(candidates).gradientVector;
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
      const ax = sampleUniformValue();
      const ay = sampleUniformValue();
      const bx = ax + DOMAIN_MINIMUM_TRIANGLE_EDGE_LENGTH + Math.abs(sampleUniformValue());
      const by = ay + 0.2 * sampleUniformValue();
      const cx = ax + 0.2 * sampleUniformValue();
      const cy = ay + DOMAIN_MINIMUM_TRIANGLE_EDGE_LENGTH + Math.abs(sampleUniformValue());

      const branchSelector = sampleIndex % 3;
      let px = (ax + bx + cx) / 3.0;
      let py = (ay + by + cy) / 3.0;
      if (branchSelector === 0) {
        px = 0.5 * (ax + bx);
        py = 0.5 * (ay + by) + DOMAIN_MINIMUM_DISTANCE;
      } else if (branchSelector === 1) {
        px = 0.5 * (bx + cx);
        py = 0.5 * (by + cy) + DOMAIN_MINIMUM_DISTANCE;
      } else {
        px = 0.5 * (cx + ax);
        py = 0.5 * (cy + ay) + DOMAIN_MINIMUM_DISTANCE;
      }

      sampledInputs.push([px, py, ax, ay, bx, by, cx, cy]);
    }
    return sampledInputs;
  },
};
