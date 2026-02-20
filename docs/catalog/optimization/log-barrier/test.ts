/**
 * Responsibility:
 * Verify analytical derivatives for scalar log barrier.
 */

import {
  assertMatrixApproximatelyEqual,
  assertVectorApproximatelyEqual,
  estimateDirectionalDerivativeFromGradientDifference,
  estimateGradientByCentralDifference,
  estimateHessianByCentralDifference,
  type Tolerance,
} from "../../_shared/test-utils";
import {
  domain,
  grad,
  hess,
  hvp,
  value,
  type GradientVector,
  type HessianMatrix,
  type InputVector,
} from "./impl";

const TEST_RANDOM_SEED = 71;
const TEST_SAMPLE_COUNT = 10;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const DIRECTION_VECTOR: GradientVector = [0.3, -0.2];
const RELAXED_TOLERANCE: Tolerance = {
  absoluteTolerance: 1e-4,
  relativeTolerance: 1e-4,
};

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);
  for (const sampledInput of sampledInputs) {
    const analyticalGradient = grad(sampledInput);
    const numericalGradient = estimateGradientByCentralDifference(
      (candidateInputVector) => value(candidateInputVector as InputVector),
      sampledInput,
      CENTRAL_DIFFERENCE_EPSILON,
    ) as GradientVector;
    assertVectorApproximatelyEqual(
      analyticalGradient,
      numericalGradient,
      RELAXED_TOLERANCE,
    );

    const analyticalHessian = hess(sampledInput);
    const numericalHessian = estimateHessianByCentralDifference(
      (candidateInputVector) => grad(candidateInputVector as InputVector),
      sampledInput,
      CENTRAL_DIFFERENCE_EPSILON,
    ) as HessianMatrix;
    assertMatrixApproximatelyEqual(
      analyticalHessian,
      numericalHessian,
      RELAXED_TOLERANCE,
    );

    const directHvp = hvp(sampledInput, DIRECTION_VECTOR);
    const numericalHvp = estimateDirectionalDerivativeFromGradientDifference(
      (candidateInputVector) => grad(candidateInputVector as InputVector),
      sampledInput,
      DIRECTION_VECTOR,
      CENTRAL_DIFFERENCE_EPSILON,
    ) as GradientVector;
    assertVectorApproximatelyEqual(directHvp, numericalHvp, RELAXED_TOLERANCE);
  }
}
