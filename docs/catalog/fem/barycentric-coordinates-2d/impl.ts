/**
 * Responsibility:
 * Provide barycentric coordinates and Jacobian for a 2D point in a fixed triangle.
 */

export type InputVector = [number, number];
export type BarycentricCoordinates = [number, number, number];
export type JacobianMatrix = [
  [number, number],
  [number, number],
  [number, number],
];
export type TriangleParameters = {
  vertexA: [number, number];
  vertexB: [number, number];
  vertexC: [number, number];
};

const POINT_X_INDEX = 0;
const POINT_Y_INDEX = 1;
const MINIMUM_TRIANGLE_AREA_ABSOLUTE = 1e-10;
const DOMAIN_LOWER_BOUND = -1.5;
const DOMAIN_UPPER_BOUND = 1.5;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

export const DEFAULT_TRIANGLE_PARAMETERS: TriangleParameters = {
  vertexA: [0.0, 0.0],
  vertexB: [1.0, 0.0],
  vertexC: [0.0, 1.0],
};

function assertFiniteValues(inputVector: number[], inputName: string): void {
  for (const inputValue of inputVector) {
    // Guard: finite values are required for valid barycentric evaluation.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function assertTriangleIsValid(parameters: TriangleParameters): void {
  const [ax, ay] = parameters.vertexA;
  const [bx, by] = parameters.vertexB;
  const [cx, cy] = parameters.vertexC;
  assertFiniteValues([ax, ay, bx, by, cx, cy], "parameters");
  const doubledTriangleArea = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  // Guard: barycentric coordinates are undefined for degenerate triangles.
  if (Math.abs(doubledTriangleArea) <= MINIMUM_TRIANGLE_AREA_ABSOLUTE) {
    throw new Error(
      `absolute triangle doubled area must be greater than ${MINIMUM_TRIANGLE_AREA_ABSOLUTE}.`,
    );
  }
}

function doubledTriangleArea(parameters: TriangleParameters): number {
  const [ax, ay] = parameters.vertexA;
  const [bx, by] = parameters.vertexB;
  const [cx, cy] = parameters.vertexC;
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

export function value(
  inputVector: InputVector,
  parameters: TriangleParameters = DEFAULT_TRIANGLE_PARAMETERS,
): BarycentricCoordinates {
  assertFiniteValues(inputVector, "inputVector");
  assertTriangleIsValid(parameters);
  const [px, py] = inputVector;
  const [ax, ay] = parameters.vertexA;
  const [bx, by] = parameters.vertexB;
  const [cx, cy] = parameters.vertexC;
  const denominator = doubledTriangleArea(parameters);

  const w0 =
    ((bx - px) * (cy - py) - (by - py) * (cx - px)) / denominator;
  const w1 =
    ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / denominator;
  const w2 = 1.0 - w0 - w1;
  return [w0, w1, w2];
}

export function grad(
  _inputVector: InputVector,
  parameters: TriangleParameters = DEFAULT_TRIANGLE_PARAMETERS,
): JacobianMatrix {
  assertTriangleIsValid(parameters);
  const [ax, ay] = parameters.vertexA;
  const [bx, by] = parameters.vertexB;
  const [cx, cy] = parameters.vertexC;
  const denominator = doubledTriangleArea(parameters);

  const dw0dpx = (by - cy) / denominator;
  const dw0dpy = (cx - bx) / denominator;
  const dw1dpx = (cy - ay) / denominator;
  const dw1dpy = (ax - cx) / denominator;
  const dw2dpx = -dw0dpx - dw1dpx;
  const dw2dpy = -dw0dpy - dw1dpy;

  return [
    [dw0dpx, dw0dpy],
    [dw1dpx, dw1dpy],
    [dw2dpx, dw2dpy],
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
      sampledInputs.push([sampleUniformValue(), sampleUniformValue()]);
    }
    return sampledInputs;
  },
};
