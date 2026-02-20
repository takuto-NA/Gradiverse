/**
 * Responsibility:
 * Provide analytical value/gradient for 3D point-to-plane unsigned distance.
 */

export type InputVector = [
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
];

const POINT_X_INDEX = 0;
const POINT_Y_INDEX = 1;
const POINT_Z_INDEX = 2;
const NORMAL_X_INDEX = 3;
const NORMAL_Y_INDEX = 4;
const NORMAL_Z_INDEX = 5;
const OFFSET_INDEX = 6;

const MINIMUM_NORMAL_NORM_SQUARED = 1e-10;
const MINIMUM_SIGNED_DISTANCE_ABSOLUTE = 1e-10;
const DOMAIN_LOWER_BOUND = -2.0;
const DOMAIN_UPPER_BOUND = 2.0;
const DOMAIN_MINIMUM_NORMAL_COMPONENT = 0.2;
const DOMAIN_MINIMUM_SIGNED_DISTANCE = 0.05;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

type Decomposition = {
  pointX: number;
  pointY: number;
  pointZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  offsetValue: number;
  normalNormSquared: number;
  signedPlaneValue: number;
};

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for valid derivatives.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function decomposeInput(inputVector: InputVector): Decomposition {
  const pointX = inputVector[POINT_X_INDEX];
  const pointY = inputVector[POINT_Y_INDEX];
  const pointZ = inputVector[POINT_Z_INDEX];
  const normalX = inputVector[NORMAL_X_INDEX];
  const normalY = inputVector[NORMAL_Y_INDEX];
  const normalZ = inputVector[NORMAL_Z_INDEX];
  const offsetValue = inputVector[OFFSET_INDEX];
  const normalNormSquared =
    normalX * normalX + normalY * normalY + normalZ * normalZ;
  const signedPlaneValue =
    normalX * pointX + normalY * pointY + normalZ * pointZ + offsetValue;
  return {
    pointX,
    pointY,
    pointZ,
    normalX,
    normalY,
    normalZ,
    offsetValue,
    normalNormSquared,
    signedPlaneValue,
  };
}

function assertDifferentiability(decomposition: Decomposition): void {
  // Guard: plane normal must be non-degenerate.
  if (decomposition.normalNormSquared <= MINIMUM_NORMAL_NORM_SQUARED) {
    throw new Error(
      `normal norm squared must be greater than ${MINIMUM_NORMAL_NORM_SQUARED}.`,
    );
  }
  // Guard: unsigned absolute value is non-differentiable at zero signed value.
  if (
    Math.abs(decomposition.signedPlaneValue) <= MINIMUM_SIGNED_DISTANCE_ABSOLUTE
  ) {
    throw new Error(
      `absolute signed plane value must be greater than ${MINIMUM_SIGNED_DISTANCE_ABSOLUTE}.`,
    );
  }
}

export function value(inputVector: InputVector): number {
  assertFiniteValues(inputVector, "inputVector");
  const decomposition = decomposeInput(inputVector);
  // Guard: plane normal must be non-degenerate.
  if (decomposition.normalNormSquared <= MINIMUM_NORMAL_NORM_SQUARED) {
    throw new Error(
      `normal norm squared must be greater than ${MINIMUM_NORMAL_NORM_SQUARED}.`,
    );
  }
  return (
    Math.abs(decomposition.signedPlaneValue) /
    Math.sqrt(decomposition.normalNormSquared)
  );
}

export function grad(inputVector: InputVector): GradientVector {
  assertFiniteValues(inputVector, "inputVector");
  const decomposition = decomposeInput(inputVector);
  assertDifferentiability(decomposition);

  const signValue = Math.sign(decomposition.signedPlaneValue);
  const normalNorm = Math.sqrt(decomposition.normalNormSquared);
  const inverseNormalNorm = 1.0 / normalNorm;
  const inverseNormalNormCubed = inverseNormalNorm / decomposition.normalNormSquared;

  return [
    signValue * decomposition.normalX * inverseNormalNorm,
    signValue * decomposition.normalY * inverseNormalNorm,
    signValue * decomposition.normalZ * inverseNormalNorm,
    signValue * decomposition.pointX * inverseNormalNorm -
      Math.abs(decomposition.signedPlaneValue) *
        decomposition.normalX *
        inverseNormalNormCubed,
    signValue * decomposition.pointY * inverseNormalNorm -
      Math.abs(decomposition.signedPlaneValue) *
        decomposition.normalY *
        inverseNormalNormCubed,
    signValue * decomposition.pointZ * inverseNormalNorm -
      Math.abs(decomposition.signedPlaneValue) *
        decomposition.normalZ *
        inverseNormalNormCubed,
    signValue * inverseNormalNorm,
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

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const pointX = sampleUniformValue();
      const pointY = sampleUniformValue();
      const pointZ = sampleUniformValue();
      let normalX = sampleUniformValue();
      let normalY = sampleUniformValue();
      let normalZ = sampleUniformValue();

      const normalNorm = Math.hypot(normalX, normalY, normalZ);
      // Guard: avoid degenerate normals in random sampling.
      if (normalNorm <= DOMAIN_MINIMUM_NORMAL_COMPONENT) {
        normalX = DOMAIN_MINIMUM_NORMAL_COMPONENT;
        normalY = 0.0;
        normalZ = 0.0;
      }

      let offsetValue = sampleUniformValue();
      const signedValue =
        normalX * pointX + normalY * pointY + normalZ * pointZ + offsetValue;
      // Guard: avoid absolute-value cusp for gradient checks.
      if (Math.abs(signedValue) <= DOMAIN_MINIMUM_SIGNED_DISTANCE) {
        offsetValue += DOMAIN_MINIMUM_SIGNED_DISTANCE;
      }

      sampledInputs.push([
        pointX,
        pointY,
        pointZ,
        normalX,
        normalY,
        normalZ,
        offsetValue,
      ]);
    }

    return sampledInputs;
  },
};
