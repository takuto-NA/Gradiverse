/**
 * Responsibility:
 * Verify analytical gradient for 2D segment-segment distance.
 */

import {
  assertVectorApproximatelyEqual,
  estimateGradientByCentralDifference,
  type Tolerance,
} from "../../_shared/test-utils";
import { domain, grad, value, type GradientVector, type InputVector } from "./impl";

const TEST_RANDOM_SEED = 47;
const TEST_SAMPLE_COUNT = 10;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;
const RELAXED_TOLERANCE: Tolerance = {
  absoluteTolerance: 3e-6,
  relativeTolerance: 3e-6,
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
  }
}
