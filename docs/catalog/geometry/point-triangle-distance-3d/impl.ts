/**
 * Responsibility:
 * Provide analytical value/gradient for 3D point-to-triangle distance.
 */

export type InputVector = [number, number, number];
export type GradientVector = [number, number, number];
export type TriangleParameters = {
  vertexA: [number, number, number];
  vertexB: [number, number, number];
  vertexC: [number, number, number];
};

const POINT_X_INDEX = 0;
const POINT_Y_INDEX = 1;
const POINT_Z_INDEX = 2;

const MINIMUM_NORMAL_NORM_SQUARED = 1e-10;
const MINIMUM_DISTANCE_THRESHOLD = 1e-10;
const MINIMUM_SIGNED_DISTANCE_ABSOLUTE = 1e-10;
const CANDIDATE_TIE_MARGIN = 1e-8;
const DOMAIN_LOWER_BOUND = -1.5;
const DOMAIN_UPPER_BOUND = 1.5;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

export const DEFAULT_TRIANGLE_PARAMETERS: TriangleParameters = {
  vertexA: [0.0, 0.0, 0.0],
  vertexB: [1.0, 0.0, 0.0],
  vertexC: [0.0, 1.0, 0.0],
};

type Vector3 = [number, number, number];
type CandidateDistance = {
  distanceValue: number;
  gradientVector: GradientVector;
};

function subtractVectors(leftVector: Vector3, rightVector: Vector3): Vector3 {
  return [
    leftVector[0] - rightVector[0],
    leftVector[1] - rightVector[1],
    leftVector[2] - rightVector[2],
  ];
}

function addVectors(leftVector: Vector3, rightVector: Vector3): Vector3 {
  return [
    leftVector[0] + rightVector[0],
    leftVector[1] + rightVector[1],
    leftVector[2] + rightVector[2],
  ];
}

function scaleVector(vector: Vector3, scalar: number): Vector3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function dotProduct(leftVector: Vector3, rightVector: Vector3): number {
  return (
    leftVector[0] * rightVector[0] +
    leftVector[1] * rightVector[1] +
    leftVector[2] * rightVector[2]
  );
}

function crossProduct(leftVector: Vector3, rightVector: Vector3): Vector3 {
  return [
    leftVector[1] * rightVector[2] - leftVector[2] * rightVector[1],
    leftVector[2] * rightVector[0] - leftVector[0] * rightVector[2],
    leftVector[0] * rightVector[1] - leftVector[1] * rightVector[0],
  ];
}

function squaredNorm(vector: Vector3): number {
  return dotProduct(vector, vector);
}

function vectorNorm(vector: Vector3): number {
  return Math.sqrt(squaredNorm(vector));
}

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for valid derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertTriangleIsValid(parameters: TriangleParameters): void {
  const edgeAB = subtractVectors(parameters.vertexB, parameters.vertexA);
  const edgeAC = subtractVectors(parameters.vertexC, parameters.vertexA);
  const normalVector = crossProduct(edgeAB, edgeAC);
  // Guard: triangle must be non-degenerate.
  if (squaredNorm(normalVector) <= MINIMUM_NORMAL_NORM_SQUARED) {
    throw new Error(
      `triangle normal norm squared must be greater than ${MINIMUM_NORMAL_NORM_SQUARED}.`,
    );
  }
}

function pointFromInput(inputVector: InputVector): Vector3 {
  return [
    inputVector[POINT_X_INDEX],
    inputVector[POINT_Y_INDEX],
    inputVector[POINT_Z_INDEX],
  ];
}

function pointSegmentDistanceAndPointGradient(
  pointVector: Vector3,
  segmentStart: Vector3,
  segmentEnd: Vector3,
): CandidateDistance {
  const segmentDirection = subtractVectors(segmentEnd, segmentStart);
  const segmentDirectionNormSquared = squaredNorm(segmentDirection);
  if (segmentDirectionNormSquared <= MINIMUM_NORMAL_NORM_SQUARED) {
    throw new Error(
      `segment norm squared must be greater than ${MINIMUM_NORMAL_NORM_SQUARED}.`,
    );
  }

  const pointFromStart = subtractVectors(pointVector, segmentStart);
  const projectionParameter = Math.max(
    0.0,
    Math.min(1.0, dotProduct(pointFromStart, segmentDirection) / segmentDirectionNormSquared),
  );
  const closestPoint = addVectors(
    segmentStart,
    scaleVector(segmentDirection, projectionParameter),
  );
  const pointFromClosest = subtractVectors(pointVector, closestPoint);
  const distanceValue = vectorNorm(pointFromClosest);
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
  const inverseDistance = 1.0 / distanceValue;
  return {
    distanceValue,
    gradientVector: [
      pointFromClosest[0] * inverseDistance,
      pointFromClosest[1] * inverseDistance,
      pointFromClosest[2] * inverseDistance,
    ],
  };
}

function interiorDistanceAndPointGradient(
  pointVector: Vector3,
  parameters: TriangleParameters,
): CandidateDistance {
  const edgeAB = subtractVectors(parameters.vertexB, parameters.vertexA);
  const edgeAC = subtractVectors(parameters.vertexC, parameters.vertexA);
  const normalVector = crossProduct(edgeAB, edgeAC);
  const normalNorm = vectorNorm(normalVector);
  const normalNormSquared = normalNorm * normalNorm;
  const unitNormal = scaleVector(normalVector, 1.0 / normalNorm);

  const pointFromA = subtractVectors(pointVector, parameters.vertexA);
  const signedDistance = dotProduct(pointFromA, unitNormal);
  if (Math.abs(signedDistance) <= MINIMUM_SIGNED_DISTANCE_ABSOLUTE) {
    throw new Error(
      `absolute signed distance must be greater than ${MINIMUM_SIGNED_DISTANCE_ABSOLUTE}.`,
    );
  }

  const normalDotPointFromA = dotProduct(pointFromA, normalVector);
  const projectionVector = subtractVectors(
    pointFromA,
    scaleVector(normalVector, normalDotPointFromA / normalNormSquared),
  );

  const dot00 = dotProduct(edgeAB, edgeAB);
  const dot01 = dotProduct(edgeAB, edgeAC);
  const dot11 = dotProduct(edgeAC, edgeAC);
  const dot20 = dotProduct(projectionVector, edgeAB);
  const dot21 = dotProduct(projectionVector, edgeAC);
  const barycentricDenominator = dot00 * dot11 - dot01 * dot01;
  const barycentricU = (dot11 * dot20 - dot01 * dot21) / barycentricDenominator;
  const barycentricV = (dot00 * dot21 - dot01 * dot20) / barycentricDenominator;
  const barycentricW = 1.0 - barycentricU - barycentricV;
  // Guard: interior formula requires projection inside triangle.
  if (barycentricU < 0.0 || barycentricV < 0.0 || barycentricW < 0.0) {
    throw new Error("projection is outside triangle interior.");
  }

  const signValue = Math.sign(signedDistance);
  return {
    distanceValue: Math.abs(signedDistance),
    gradientVector: [
      signValue * unitNormal[0],
      signValue * unitNormal[1],
      signValue * unitNormal[2],
    ],
  };
}

function collectCandidates(
  pointVector: Vector3,
  parameters: TriangleParameters,
): CandidateDistance[] {
  const candidates: CandidateDistance[] = [];
  try {
    candidates.push(interiorDistanceAndPointGradient(pointVector, parameters));
  } catch {
    // interior candidate is optional when projection leaves triangle.
  }
  candidates.push(
    pointSegmentDistanceAndPointGradient(
      pointVector,
      parameters.vertexA,
      parameters.vertexB,
    ),
  );
  candidates.push(
    pointSegmentDistanceAndPointGradient(
      pointVector,
      parameters.vertexB,
      parameters.vertexC,
    ),
  );
  candidates.push(
    pointSegmentDistanceAndPointGradient(
      pointVector,
      parameters.vertexC,
      parameters.vertexA,
    ),
  );
  return candidates;
}

function selectMinimumCandidate(candidates: CandidateDistance[]): CandidateDistance {
  let minimumCandidateIndex = 0;
  for (let candidateIndex = 1; candidateIndex < candidates.length; candidateIndex += 1) {
    if (
      candidates[candidateIndex].distanceValue <
      candidates[minimumCandidateIndex].distanceValue
    ) {
      minimumCandidateIndex = candidateIndex;
    }
  }
  return candidates[minimumCandidateIndex];
}

function assertUniqueMinimumCandidate(candidates: CandidateDistance[]): void {
  const minimumDistanceValue = selectMinimumCandidate(candidates).distanceValue;
  const nearMinimumCount = candidates.filter(
    (candidate) =>
      Math.abs(candidate.distanceValue - minimumDistanceValue) <= CANDIDATE_TIE_MARGIN,
  ).length;
  // Guard: distance gradient is non-unique when multiple branches tie.
  if (nearMinimumCount > 1) {
    throw new Error(
      `minimum candidate is not unique within tie margin ${CANDIDATE_TIE_MARGIN}.`,
    );
  }
}

export function value(
  inputVector: InputVector,
  parameters: TriangleParameters = DEFAULT_TRIANGLE_PARAMETERS,
): number {
  assertFiniteValues(inputVector, "inputVector");
  assertTriangleIsValid(parameters);
  const candidates = collectCandidates(pointFromInput(inputVector), parameters);
  return selectMinimumCandidate(candidates).distanceValue;
}

export function grad(
  inputVector: InputVector,
  parameters: TriangleParameters = DEFAULT_TRIANGLE_PARAMETERS,
): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  assertTriangleIsValid(parameters);
  const candidates = collectCandidates(pointFromInput(inputVector), parameters);
  return selectMinimumCandidate(candidates).gradientVector;
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
      sampledInputs.push([
        sampleUniformValue(),
        sampleUniformValue(),
        sampleUniformValue(),
      ]);
    }
    return sampledInputs;
  },
};
