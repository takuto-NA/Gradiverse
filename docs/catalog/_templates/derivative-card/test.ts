/**
 * Responsibility:
 * Provide reusable numerical checks for gradient and Hessian-vector products.
 */

import { grad, hvp, value, type CardParameters, type Vector } from "./impl";

type Tolerance = {
  absoluteTolerance: number;
  relativeTolerance: number;
};

const DEFAULT_TOLERANCE: Tolerance = {
  absoluteTolerance: 1e-6,
  relativeTolerance: 1e-6,
};
const GRADIENT_DIFFERENCE_EPSILON = 1e-6;
const HVP_DIFFERENCE_EPSILON = 1e-6;
const DEFAULT_PARAMETERS: CardParameters = {
  scaleParameter: 1.0,
};
const DEFAULT_TEST_POINT: Vector = [0.25];
const DEFAULT_DIRECTION: Vector = [0.5];

function addVectors(leftVector: Vector, rightVector: Vector): Vector {
  return leftVector.map((leftValue, index) => leftValue + rightVector[index]);
}

function subtractVectors(leftVector: Vector, rightVector: Vector): Vector {
  return leftVector.map((leftValue, index) => leftValue - rightVector[index]);
}

function scaleVector(vector: Vector, scalar: number): Vector {
  return vector.map((valueAtIndex) => valueAtIndex * scalar);
}

function assertApproximatelyEqual(
  actualValue: number,
  expectedValue: number,
  tolerance: Tolerance = DEFAULT_TOLERANCE,
): void {
  const absoluteError = Math.abs(actualValue - expectedValue);
  const scale = Math.max(Math.abs(expectedValue), 1.0);
  const allowedError =
    tolerance.absoluteTolerance + tolerance.relativeTolerance * scale;
  // Guard: throw immediately when approximation constraint is violated.
  if (absoluteError > allowedError) {
    throw new Error(
      `Approximation failed. actual=${actualValue}, expected=${expectedValue}, allowed=${allowedError}`,
    );
  }
}

function centralDifferenceGradient(
  inputVector: Vector,
  parameters: CardParameters,
  epsilon: number = GRADIENT_DIFFERENCE_EPSILON,
): Vector {
  const positivePerturbation = addVectors(inputVector, [epsilon]);
  const negativePerturbation = subtractVectors(inputVector, [epsilon]);
  const positiveValue = value(positivePerturbation, parameters);
  const negativeValue = value(negativePerturbation, parameters);
  return [(positiveValue - negativeValue) / (2.0 * epsilon)];
}

function finiteDifferenceHvp(
  inputVector: Vector,
  directionVector: Vector,
  parameters: CardParameters,
  epsilon: number = HVP_DIFFERENCE_EPSILON,
): Vector {
  const perturbedInputVector = addVectors(
    inputVector,
    scaleVector(directionVector, epsilon),
  );
  const perturbedGradient = grad(perturbedInputVector, parameters);
  const baseGradient = grad(inputVector, parameters);
  return scaleVector(
    subtractVectors(perturbedGradient, baseGradient),
    1.0 / epsilon,
  );
}

export function check(): void {
  const analyticGradient = grad(DEFAULT_TEST_POINT, DEFAULT_PARAMETERS);
  const numericGradient = centralDifferenceGradient(
    DEFAULT_TEST_POINT,
    DEFAULT_PARAMETERS,
  );
  assertApproximatelyEqual(analyticGradient[0], numericGradient[0]);

  const analyticHvp = hvp(
    DEFAULT_TEST_POINT,
    DEFAULT_DIRECTION,
    DEFAULT_PARAMETERS,
  );
  const numericHvp = finiteDifferenceHvp(
    DEFAULT_TEST_POINT,
    DEFAULT_DIRECTION,
    DEFAULT_PARAMETERS,
  );
  assertApproximatelyEqual(analyticHvp[0], numericHvp[0]);
}
