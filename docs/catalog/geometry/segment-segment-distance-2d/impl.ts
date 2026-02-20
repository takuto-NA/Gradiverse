/**
 * Responsibility:
 * Provide analytical value/gradient for 2D segment-segment distance.
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

const A0_X_INDEX = 0;
const A0_Y_INDEX = 1;
const A1_X_INDEX = 2;
const A1_Y_INDEX = 3;
const B0_X_INDEX = 4;
const B0_Y_INDEX = 5;
const B1_X_INDEX = 6;
const B1_Y_INDEX = 7;

const MINIMUM_SEGMENT_NORM_SQUARED = 1e-10;
const MINIMUM_DISTANCE_THRESHOLD = 1e-10;
const BRANCH_MARGIN = 1e-5;
const CANDIDATE_TIE_MARGIN = 1e-8;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const DOMAIN_MINIMUM_SEGMENT_LENGTH = 0.4;
const DOMAIN_SEPARATION_OFFSET = 0.3;
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
    // Guard: finite values are required for geometric derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertSegmentIsValid(
  segmentStartX: number,
  segmentStartY: number,
  segmentEndX: number,
  segmentEndY: number,
): void {
  const directionX = segmentEndX - segmentStartX;
  const directionY = segmentEndY - segmentStartY;
  const segmentNormSquared = directionX * directionX + directionY * directionY;
  // Guard: segment endpoints must be distinct.
  if (segmentNormSquared <= MINIMUM_SEGMENT_NORM_SQUARED) {
    throw new Error(
      `segment norm squared must be greater than ${MINIMUM_SEGMENT_NORM_SQUARED}.`,
    );
  }
}

function assertPositiveDistance(distanceValue: number): void {
  // Guard: distance gradient is non-unique at zero distance.
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
}

function assertProjectionBoundaryMargin(projectionParameter: number): void {
  // Guard: projection branch boundaries are non-smooth points.
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

function orientation(
  pX: number,
  pY: number,
  qX: number,
  qY: number,
  rX: number,
  rY: number,
): number {
  return (qX - pX) * (rY - pY) - (qY - pY) * (rX - pX);
}

function segmentsIntersect(inputVector: InputVector): boolean {
  const o1 = orientation(
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
  );
  const o2 = orientation(
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
  );
  const o3 = orientation(
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
  );
  const o4 = orientation(
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
  );
  return o1 * o2 < 0.0 && o3 * o4 < 0.0;
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
  // Guard: point-segment derivative requires non-degenerate segment.
  if (segmentNormSquared <= MINIMUM_SEGMENT_NORM_SQUARED) {
    throw new Error(
      `segment norm squared must be greater than ${MINIMUM_SEGMENT_NORM_SQUARED}.`,
    );
  }

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
  const nearMinimumCount = candidates.filter(
    (candidateResult) =>
      Math.abs(candidateResult.distanceValue - bestDistanceValue) <=
      CANDIDATE_TIE_MARGIN,
  ).length;

  // Guard: gradient is non-unique when multiple candidate pairs are tied.
  if (nearMinimumCount > 1) {
    throw new Error(
      `minimum candidate is not unique within tie margin ${CANDIDATE_TIE_MARGIN}.`,
    );
  }
  return candidates[bestCandidateIndex];
}

function selectMinimumCandidate(
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
  return candidates[bestCandidateIndex];
}

function candidateA0ToSegmentB(inputVector: InputVector): CandidateDistanceResult {
  const pointSegmentResult = pointSegmentDistanceAndGradient(
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
  );
  assertProjectionBoundaryMargin(pointSegmentResult.projectionParameter);
  return {
    distanceValue: pointSegmentResult.distanceValue,
    gradientVector: [
      pointSegmentResult.gradientVector[0],
      pointSegmentResult.gradientVector[1],
      0.0,
      0.0,
      pointSegmentResult.gradientVector[2],
      pointSegmentResult.gradientVector[3],
      pointSegmentResult.gradientVector[4],
      pointSegmentResult.gradientVector[5],
    ],
  };
}

function candidateA1ToSegmentB(inputVector: InputVector): CandidateDistanceResult {
  const pointSegmentResult = pointSegmentDistanceAndGradient(
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
  );
  assertProjectionBoundaryMargin(pointSegmentResult.projectionParameter);
  return {
    distanceValue: pointSegmentResult.distanceValue,
    gradientVector: [
      0.0,
      0.0,
      pointSegmentResult.gradientVector[0],
      pointSegmentResult.gradientVector[1],
      pointSegmentResult.gradientVector[2],
      pointSegmentResult.gradientVector[3],
      pointSegmentResult.gradientVector[4],
      pointSegmentResult.gradientVector[5],
    ],
  };
}

function candidateB0ToSegmentA(inputVector: InputVector): CandidateDistanceResult {
  const pointSegmentResult = pointSegmentDistanceAndGradient(
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
  );
  assertProjectionBoundaryMargin(pointSegmentResult.projectionParameter);
  return {
    distanceValue: pointSegmentResult.distanceValue,
    gradientVector: [
      pointSegmentResult.gradientVector[2],
      pointSegmentResult.gradientVector[3],
      pointSegmentResult.gradientVector[4],
      pointSegmentResult.gradientVector[5],
      pointSegmentResult.gradientVector[0],
      pointSegmentResult.gradientVector[1],
      0.0,
      0.0,
    ],
  };
}

function candidateB1ToSegmentA(inputVector: InputVector): CandidateDistanceResult {
  const pointSegmentResult = pointSegmentDistanceAndGradient(
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
  );
  assertProjectionBoundaryMargin(pointSegmentResult.projectionParameter);
  return {
    distanceValue: pointSegmentResult.distanceValue,
    gradientVector: [
      pointSegmentResult.gradientVector[2],
      pointSegmentResult.gradientVector[3],
      pointSegmentResult.gradientVector[4],
      pointSegmentResult.gradientVector[5],
      0.0,
      0.0,
      pointSegmentResult.gradientVector[0],
      pointSegmentResult.gradientVector[1],
    ],
  };
}

function buildCandidates(inputVector: InputVector): CandidateDistanceResult[] {
  return [
    candidateA0ToSegmentB(inputVector),
    candidateA1ToSegmentB(inputVector),
    candidateB0ToSegmentA(inputVector),
    candidateB1ToSegmentA(inputVector),
  ];
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  assertSegmentIsValid(
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
  );
  assertSegmentIsValid(
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
  );
  if (segmentsIntersect(inputVector)) {
    return 0.0;
  }
  return selectMinimumCandidate(buildCandidates(inputVector)).distanceValue;
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  assertSegmentIsValid(
    inputVector[A0_X_INDEX],
    inputVector[A0_Y_INDEX],
    inputVector[A1_X_INDEX],
    inputVector[A1_Y_INDEX],
  );
  assertSegmentIsValid(
    inputVector[B0_X_INDEX],
    inputVector[B0_Y_INDEX],
    inputVector[B1_X_INDEX],
    inputVector[B1_Y_INDEX],
  );
  // Guard: crossing segments have zero distance but non-unique gradient branch.
  if (segmentsIntersect(inputVector)) {
    throw new Error("gradient is not unique for intersecting segments.");
  }
  return selectMinimumCandidate(buildCandidates(inputVector)).gradientVector;
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
      const a0x = sampleUniformValue();
      const a0y = sampleUniformValue();
      const a1x = a0x + DOMAIN_MINIMUM_SEGMENT_LENGTH + Math.abs(sampleUniformValue());
      const a1y = a0y + 0.2 * sampleUniformValue();

      let b0x = sampleUniformValue();
      let b0y = a0y + DOMAIN_SEPARATION_OFFSET + Math.abs(sampleUniformValue());
      let b1x = b0x + DOMAIN_MINIMUM_SEGMENT_LENGTH + Math.abs(sampleUniformValue());
      let b1y = b0y + 0.35 + 0.2 * sampleUniformValue();

      let candidateInput: InputVector = [a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y];
      for (let adjustmentStep = 0; adjustmentStep < 4; adjustmentStep += 1) {
        try {
          if (segmentsIntersect(candidateInput)) {
            throw new Error("intersect");
          }
          selectUniqueMinimumCandidate(buildCandidates(candidateInput));
          break;
        } catch {
          b0x += 0.137 * (adjustmentStep + 1);
          b0y += 0.071 * (adjustmentStep + 1);
          b1x += 0.083 * (adjustmentStep + 1);
          b1y += 0.059 * (adjustmentStep + 1);
          candidateInput = [a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y];
        }
      }

      sampledInputs.push(candidateInput);
    }
    return sampledInputs;
  },
};
