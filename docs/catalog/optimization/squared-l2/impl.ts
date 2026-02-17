/**
 * Responsibility:
 * Implement the squared L2 norm energy derivative card.
 * f(x) = 0.5 * ||x||^2
 */

export type Vector = number[];
export type Matrix = number[][];

const SCALAR_HALF = 0.5;
const DEFAULT_SAMPLE_DIMENSION = 4;
const DEFAULT_DOMAIN_LOWER_BOUND = -1.0;
const DEFAULT_DOMAIN_UPPER_BOUND = 1.0;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

function assertVectorHasFiniteValues(inputVector: Vector): void {
  // Guard: an empty vector does not define this card target.
  if (inputVector.length === 0) {
    throw new Error("inputVector must contain at least one element.");
  }

  for (const inputValue of inputVector) {
    // Guard: derivatives are only defined for finite values.
    if (!Number.isFinite(inputValue)) {
      throw new Error("inputVector must contain finite values.");
    }
  }
}

function assertVectorsShareSameDimension(
  inputVector: Vector,
  directionVector: Vector,
): void {
  // Guard: HVP requires matching dimensions.
  if (inputVector.length !== directionVector.length) {
    throw new Error("inputVector and directionVector dimensions must match.");
  }
}

function cloneVector(inputVector: Vector): Vector {
  return [...inputVector];
}

export const domain = {
  sample(seed: number, sampleCount: number, dimension: number = DEFAULT_SAMPLE_DIMENSION): Vector[] {
    // Guard: sampleCount must be non-negative.
    if (sampleCount < 0) {
      throw new Error("sampleCount must be greater than or equal to zero.");
    }
    // Guard: dimension must be at least one.
    if (dimension < 1) {
      throw new Error("dimension must be greater than or equal to one.");
    }

    const sampledVectors: Vector[] = [];
    let currentSeed = seed >>> 0;

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const sampledVector: Vector = [];
      for (let componentIndex = 0; componentIndex < dimension; componentIndex += 1) {
        currentSeed =
          (LINEAR_CONGRUENTIAL_MULTIPLIER * currentSeed +
            LINEAR_CONGRUENTIAL_INCREMENT) %
          LINEAR_CONGRUENTIAL_MODULUS;
        const randomUnitValue = currentSeed / LINEAR_CONGRUENTIAL_MODULUS;
        const mappedValue =
          DEFAULT_DOMAIN_LOWER_BOUND +
          (DEFAULT_DOMAIN_UPPER_BOUND - DEFAULT_DOMAIN_LOWER_BOUND) *
            randomUnitValue;
        sampledVector.push(mappedValue);
      }
      sampledVectors.push(sampledVector);
    }

    return sampledVectors;
  },
};

export function value(inputVector: Vector): number {
  assertVectorHasFiniteValues(inputVector);

  let squaredNormSum = 0.0;
  for (const inputValue of inputVector) {
    squaredNormSum += inputValue * inputValue;
  }

  return SCALAR_HALF * squaredNormSum;
}

export function grad(inputVector: Vector): Vector {
  assertVectorHasFiniteValues(inputVector);
  return cloneVector(inputVector);
}

export function hess(inputVector: Vector): Matrix {
  assertVectorHasFiniteValues(inputVector);

  const inputDimension = inputVector.length;
  const identityMatrix: Matrix = [];
  for (let rowIndex = 0; rowIndex < inputDimension; rowIndex += 1) {
    const rowValues = new Array<number>(inputDimension).fill(0.0);
    rowValues[rowIndex] = 1.0;
    identityMatrix.push(rowValues);
  }
  return identityMatrix;
}

export function hvp(inputVector: Vector, directionVector: Vector): Vector {
  assertVectorHasFiniteValues(inputVector);
  assertVectorHasFiniteValues(directionVector);
  assertVectorsShareSameDimension(inputVector, directionVector);
  return cloneVector(directionVector);
}
