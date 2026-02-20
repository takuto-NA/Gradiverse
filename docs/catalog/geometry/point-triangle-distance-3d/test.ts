/**
 * Responsibility:
 * Verify analytical point gradient for 3D point-triangle distance.
 */

import {
  assertVectorApproximatelyEqual,
  estimateGradientByCentralDifference,
  type Tolerance,
} from "../../_shared/test-utils";
import {
  DEFAULT_TRIANGLE_PARAMETERS,
  domain,
  grad,
  value,
  type GradientVector,
  type InputVector,
} from "./impl";

const TEST_RANDOM_SEED = 73;
const TEST_SAMPLE_COUNT = 12;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const RELAXED_TOLERANCE: Tolerance = {
  absoluteTolerance: 3e-6,
  relativeTolerance: 3e-6,
};

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);
  for (const sampledInput of sampledInputs) {
    const analyticalGradient = grad(sampledInput, DEFAULT_TRIANGLE_PARAMETERS);
    const numericalGradient = estimateGradientByCentralDifference(
      (candidateInputVector) =>
        value(candidateInputVector as InputVector, DEFAULT_TRIANGLE_PARAMETERS),
      sampledInput,
      CENTRAL_DIFFERENCE_EPSILON,
    ) as GradientVector;
    assertVectorApproximatelyEqual(
      analyticalGradient,
      numericalGradient,
      RELAXED_TOLERANCE,
    );
  }
}
