/**
 * Responsibility:
 * Verify analytical gradient for smooth minimum distance in 2D.
 */

import {
  assertVectorApproximatelyEqual,
  estimateGradientByCentralDifference,
  type Tolerance,
} from "../../_shared/test-utils";
import { domain, grad, value, type GradientVector, type InputVector } from "./impl";

const TEST_RANDOM_SEED = 59;
const TEST_SAMPLE_COUNT = 12;
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
