/**
 * Responsibility:
 * Verify barycentric coordinate Jacobian by central differences.
 */

import {
  assertMatrixApproximatelyEqual,
  estimateGradientByCentralDifference,
} from "../../_shared/test-utils";
import {
  DEFAULT_TRIANGLE_PARAMETERS,
  domain,
  grad,
  value,
  type InputVector,
  type JacobianMatrix,
} from "./impl";

const TEST_RANDOM_SEED = 53;
const TEST_SAMPLE_COUNT = 10;
const CENTRAL_DIFFERENCE_EPSILON = 1e-6;

function estimateJacobianByCentralDifference(inputVector: InputVector): JacobianMatrix {
  const jacobianRows: number[][] = [];
  for (let coordinateIndex = 0; coordinateIndex < 3; coordinateIndex += 1) {
    jacobianRows.push(
      estimateGradientByCentralDifference(
        (candidateInputVector) =>
          value(candidateInputVector as InputVector, DEFAULT_TRIANGLE_PARAMETERS)[
            coordinateIndex
          ],
        inputVector,
        CENTRAL_DIFFERENCE_EPSILON,
      ),
    );
  }
  return jacobianRows as JacobianMatrix;
}

export function check(): void {
  const sampledInputs = domain.sample(TEST_RANDOM_SEED, TEST_SAMPLE_COUNT);
  for (const sampledInput of sampledInputs) {
    const analyticalJacobian = grad(sampledInput, DEFAULT_TRIANGLE_PARAMETERS);
    const numericalJacobian = estimateJacobianByCentralDifference(sampledInput);
    assertMatrixApproximatelyEqual(analyticalJacobian, numericalJacobian);
  }
}
