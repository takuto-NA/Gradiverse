/**
 * Responsibility:
 * Analytical value/gradient/Hessian/HVP for 2D rigid-body local-point distance:
 * d = || (pB + R(thetaB) rB) - (pA + R(thetaA) rA) ||.
 */

export type Vector2 = [number, number];
export type StateVector = [number, number, number, number, number, number];
export type GradientVector = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type HessianMatrix = [
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
  [number, number, number, number, number, number],
];
export type Parameters = {
  localPointA: Vector2;
  localPointB: Vector2;
};

const PAX_INDEX = 0;
const PAY_INDEX = 1;
const THETA_A_INDEX = 2;
const PBX_INDEX = 3;
const PBY_INDEX = 4;
const THETA_B_INDEX = 5;
const STATE_DIMENSION = 6;

const MINIMUM_DISTANCE_THRESHOLD = 1e-8;
const DEFAULT_MINIMUM_SEPARATION = 0.1;
const DOMAIN_LOWER_BOUND = -1.5;
const DOMAIN_UPPER_BOUND = 1.5;
const LINEAR_CONGRUENTIAL_MULTIPLIER = 1664525;
const LINEAR_CONGRUENTIAL_INCREMENT = 1013904223;
const LINEAR_CONGRUENTIAL_MODULUS = 2 ** 32;

function assertFiniteValues(inputValues: number[], inputName: string): void {
  for (const inputValue of inputValues) {
    // Guard: analytic derivatives require finite inputs.
    if (!Number.isFinite(inputValue)) {
      throw new Error(`${inputName} must contain finite values.`);
    }
  }
}

function rotationMatrix(rotationAngle: number): [[number, number], [number, number]] {
  const cosineValue = Math.cos(rotationAngle);
  const sineValue = Math.sin(rotationAngle);
  return [
    [cosineValue, -sineValue],
    [sineValue, cosineValue],
  ];
}

function multiplyMatrix2AndVector2(
  matrix2: [[number, number], [number, number]],
  vector2: Vector2,
): Vector2 {
  return [
    matrix2[0][0] * vector2[0] + matrix2[0][1] * vector2[1],
    matrix2[1][0] * vector2[0] + matrix2[1][1] * vector2[1],
  ];
}

function perpendicularVector(inputVector: Vector2): Vector2 {
  return [-inputVector[1], inputVector[0]];
}

function addVector2(leftVector: Vector2, rightVector: Vector2): Vector2 {
  return [leftVector[0] + rightVector[0], leftVector[1] + rightVector[1]];
}

function subtractVector2(leftVector: Vector2, rightVector: Vector2): Vector2 {
  return [leftVector[0] - rightVector[0], leftVector[1] - rightVector[1]];
}

function dotVector2(leftVector: Vector2, rightVector: Vector2): number {
  return leftVector[0] * rightVector[0] + leftVector[1] * rightVector[1];
}

function multiplyScalarAndVector2(scalarValue: number, inputVector: Vector2): Vector2 {
  return [scalarValue * inputVector[0], scalarValue * inputVector[1]];
}

function extractBodyAPosition(stateVector: StateVector): Vector2 {
  return [stateVector[PAX_INDEX], stateVector[PAY_INDEX]];
}

function extractBodyBPosition(stateVector: StateVector): Vector2 {
  return [stateVector[PBX_INDEX], stateVector[PBY_INDEX]];
}

function decomposeRelativeTerms(
  stateVector: StateVector,
  parameters: Parameters,
): {
  globalPointA: Vector2;
  globalPointB: Vector2;
  relativeVector: Vector2;
  relativeDerivativeThetaA: Vector2;
  relativeDerivativeThetaB: Vector2;
  relativeSecondDerivativeThetaA: Vector2;
  relativeSecondDerivativeThetaB: Vector2;
} {
  assertFiniteValues(stateVector, "stateVector");
  assertFiniteValues(parameters.localPointA, "parameters.localPointA");
  assertFiniteValues(parameters.localPointB, "parameters.localPointB");

  const bodyAPosition = extractBodyAPosition(stateVector);
  const bodyBPosition = extractBodyBPosition(stateVector);
  const rotationA = rotationMatrix(stateVector[THETA_A_INDEX]);
  const rotationB = rotationMatrix(stateVector[THETA_B_INDEX]);

  const rotatedLocalPointA = multiplyMatrix2AndVector2(
    rotationA,
    parameters.localPointA,
  );
  const rotatedLocalPointB = multiplyMatrix2AndVector2(
    rotationB,
    parameters.localPointB,
  );

  const globalPointA = addVector2(bodyAPosition, rotatedLocalPointA);
  const globalPointB = addVector2(bodyBPosition, rotatedLocalPointB);
  const relativeVector = subtractVector2(globalPointB, globalPointA);
  const relativeDerivativeThetaA = multiplyScalarAndVector2(
    -1.0,
    multiplyMatrix2AndVector2(rotationA, perpendicularVector(parameters.localPointA)),
  );
  const relativeDerivativeThetaB = multiplyMatrix2AndVector2(
    rotationB,
    perpendicularVector(parameters.localPointB),
  );
  const relativeSecondDerivativeThetaA = multiplyMatrix2AndVector2(
    rotationA,
    parameters.localPointA,
  );
  const relativeSecondDerivativeThetaB = multiplyScalarAndVector2(
    -1.0,
    multiplyMatrix2AndVector2(rotationB, parameters.localPointB),
  );

  return {
    globalPointA,
    globalPointB,
    relativeVector,
    relativeDerivativeThetaA,
    relativeDerivativeThetaB,
    relativeSecondDerivativeThetaA,
    relativeSecondDerivativeThetaB,
  };
}

function decomposeDistanceTerms(
  stateVector: StateVector,
  parameters: Parameters,
): ReturnType<typeof decomposeRelativeTerms> & {
  distanceValue: number;
  unitNormalVector: Vector2;
} {
  const kinematicTerms = decomposeRelativeTerms(stateVector, parameters);
  const distanceValue = Math.hypot(
    kinematicTerms.relativeVector[0],
    kinematicTerms.relativeVector[1],
  );
  // Guard: d=0 makes distance derivatives undefined.
  if (distanceValue <= MINIMUM_DISTANCE_THRESHOLD) {
    throw new Error(
      `distanceValue must be greater than ${MINIMUM_DISTANCE_THRESHOLD}.`,
    );
  }
  const unitNormalVector = multiplyScalarAndVector2(
    1.0 / distanceValue,
    kinematicTerms.relativeVector,
  );

  return {
    ...kinematicTerms,
    distanceValue,
    unitNormalVector,
  };
}

function firstDerivativeOfRelativeVector(
  stateComponentIndex: number,
  terms: ReturnType<typeof decomposeDistanceTerms>,
): Vector2 {
  if (stateComponentIndex === PAX_INDEX) {
    return [-1.0, 0.0];
  }
  if (stateComponentIndex === PAY_INDEX) {
    return [0.0, -1.0];
  }
  if (stateComponentIndex === THETA_A_INDEX) {
    return terms.relativeDerivativeThetaA;
  }
  if (stateComponentIndex === PBX_INDEX) {
    return [1.0, 0.0];
  }
  if (stateComponentIndex === PBY_INDEX) {
    return [0.0, 1.0];
  }
  return terms.relativeDerivativeThetaB;
}

function secondDerivativeOfRelativeVector(
  firstComponentIndex: number,
  secondComponentIndex: number,
  terms: ReturnType<typeof decomposeDistanceTerms>,
): Vector2 {
  const isThetaADoubleDerivative =
    firstComponentIndex === THETA_A_INDEX &&
    secondComponentIndex === THETA_A_INDEX;
  if (isThetaADoubleDerivative) {
    return terms.relativeSecondDerivativeThetaA;
  }

  const isThetaBDoubleDerivative =
    firstComponentIndex === THETA_B_INDEX &&
    secondComponentIndex === THETA_B_INDEX;
  if (isThetaBDoubleDerivative) {
    return terms.relativeSecondDerivativeThetaB;
  }

  return [0.0, 0.0];
}

function multiplyHessianAndDirection(
  hessianMatrix: HessianMatrix,
  directionVector: GradientVector,
): GradientVector {
  const productVector: GradientVector = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  for (let rowIndex = 0; rowIndex < STATE_DIMENSION; rowIndex += 1) {
    let rowSum = 0.0;
    for (let columnIndex = 0; columnIndex < STATE_DIMENSION; columnIndex += 1) {
      rowSum += hessianMatrix[rowIndex][columnIndex] * directionVector[columnIndex];
    }
    productVector[rowIndex] = rowSum;
  }
  return productVector;
}

export function globalPointA(
  stateVector: StateVector,
  parameters: Parameters,
): Vector2 {
  return decomposeDistanceTerms(stateVector, parameters).globalPointA;
}

export function globalPointB(
  stateVector: StateVector,
  parameters: Parameters,
): Vector2 {
  return decomposeDistanceTerms(stateVector, parameters).globalPointB;
}

export function value(
  stateVector: StateVector,
  parameters: Parameters,
): number {
  return decomposeDistanceTerms(stateVector, parameters).distanceValue;
}

export function grad(
  stateVector: StateVector,
  parameters: Parameters,
): GradientVector {
  const terms = decomposeDistanceTerms(stateVector, parameters);
  const unitNormalVector = terms.unitNormalVector;

  return [
    -unitNormalVector[0],
    -unitNormalVector[1],
    dotVector2(unitNormalVector, terms.relativeDerivativeThetaA),
    unitNormalVector[0],
    unitNormalVector[1],
    dotVector2(unitNormalVector, terms.relativeDerivativeThetaB),
  ];
}

export function hess(
  stateVector: StateVector,
  parameters: Parameters,
): HessianMatrix {
  const terms = decomposeDistanceTerms(stateVector, parameters);
  const projectionMatrix = [
    [
      1.0 - terms.unitNormalVector[0] * terms.unitNormalVector[0],
      -terms.unitNormalVector[0] * terms.unitNormalVector[1],
    ],
    [
      -terms.unitNormalVector[1] * terms.unitNormalVector[0],
      1.0 - terms.unitNormalVector[1] * terms.unitNormalVector[1],
    ],
  ] as const;
  const inverseDistance = 1.0 / terms.distanceValue;

  const computedHessianRows: number[][] = [];
  for (let rowIndex = 0; rowIndex < STATE_DIMENSION; rowIndex += 1) {
    const currentRow: number[] = [];
    const firstDerivativeRow = firstDerivativeOfRelativeVector(rowIndex, terms);
    for (let columnIndex = 0; columnIndex < STATE_DIMENSION; columnIndex += 1) {
      const firstDerivativeColumn = firstDerivativeOfRelativeVector(
        columnIndex,
        terms,
      );
      const projectedColumnDerivative: Vector2 = [
        projectionMatrix[0][0] * firstDerivativeColumn[0] +
          projectionMatrix[0][1] * firstDerivativeColumn[1],
        projectionMatrix[1][0] * firstDerivativeColumn[0] +
          projectionMatrix[1][1] * firstDerivativeColumn[1],
      ];
      const gaussNewtonLikeTerm =
        inverseDistance * dotVector2(firstDerivativeRow, projectedColumnDerivative);

      const secondDerivative = secondDerivativeOfRelativeVector(
        rowIndex,
        columnIndex,
        terms,
      );
      const curvatureTerm = dotVector2(terms.unitNormalVector, secondDerivative);
      currentRow.push(gaussNewtonLikeTerm + curvatureTerm);
    }
    computedHessianRows.push(currentRow);
  }

  return [
    [
      computedHessianRows[0][0],
      computedHessianRows[0][1],
      computedHessianRows[0][2],
      computedHessianRows[0][3],
      computedHessianRows[0][4],
      computedHessianRows[0][5],
    ],
    [
      computedHessianRows[1][0],
      computedHessianRows[1][1],
      computedHessianRows[1][2],
      computedHessianRows[1][3],
      computedHessianRows[1][4],
      computedHessianRows[1][5],
    ],
    [
      computedHessianRows[2][0],
      computedHessianRows[2][1],
      computedHessianRows[2][2],
      computedHessianRows[2][3],
      computedHessianRows[2][4],
      computedHessianRows[2][5],
    ],
    [
      computedHessianRows[3][0],
      computedHessianRows[3][1],
      computedHessianRows[3][2],
      computedHessianRows[3][3],
      computedHessianRows[3][4],
      computedHessianRows[3][5],
    ],
    [
      computedHessianRows[4][0],
      computedHessianRows[4][1],
      computedHessianRows[4][2],
      computedHessianRows[4][3],
      computedHessianRows[4][4],
      computedHessianRows[4][5],
    ],
    [
      computedHessianRows[5][0],
      computedHessianRows[5][1],
      computedHessianRows[5][2],
      computedHessianRows[5][3],
      computedHessianRows[5][4],
      computedHessianRows[5][5],
    ],
  ];
}

export function hvp(
  stateVector: StateVector,
  directionVector: GradientVector,
  parameters: Parameters,
): GradientVector {
  assertFiniteValues(directionVector, "directionVector");
  return multiplyHessianAndDirection(hess(stateVector, parameters), directionVector);
}

export function squaredValue(
  stateVector: StateVector,
  parameters: Parameters,
): number {
  const terms = decomposeRelativeTerms(stateVector, parameters);
  return dotVector2(terms.relativeVector, terms.relativeVector);
}

export function squaredGrad(
  stateVector: StateVector,
  parameters: Parameters,
): GradientVector {
  const terms = decomposeRelativeTerms(stateVector, parameters);

  const gradientValues: number[] = [];
  for (let componentIndex = 0; componentIndex < STATE_DIMENSION; componentIndex += 1) {
    const relativeDerivative = firstDerivativeOfRelativeVector(
      componentIndex,
      {
        ...terms,
        distanceValue: 1.0,
        unitNormalVector: [1.0, 0.0],
      },
    );
    gradientValues.push(2.0 * dotVector2(terms.relativeVector, relativeDerivative));
  }

  return [
    gradientValues[0],
    gradientValues[1],
    gradientValues[2],
    gradientValues[3],
    gradientValues[4],
    gradientValues[5],
  ];
}

export function squaredHess(
  stateVector: StateVector,
  parameters: Parameters,
): HessianMatrix {
  const terms = decomposeRelativeTerms(stateVector, parameters);
  const augmentedTerms = {
    ...terms,
    distanceValue: 1.0,
    unitNormalVector: [1.0, 0.0] as Vector2,
  };

  const hessianRows: number[][] = [];
  for (let rowIndex = 0; rowIndex < STATE_DIMENSION; rowIndex += 1) {
    const rowValues: number[] = [];
    const firstDerivativeRow = firstDerivativeOfRelativeVector(
      rowIndex,
      augmentedTerms,
    );
    for (let columnIndex = 0; columnIndex < STATE_DIMENSION; columnIndex += 1) {
      const firstDerivativeColumn = firstDerivativeOfRelativeVector(
        columnIndex,
        augmentedTerms,
      );
      const secondDerivative = secondDerivativeOfRelativeVector(
        rowIndex,
        columnIndex,
        augmentedTerms,
      );
      rowValues.push(
        2.0 *
          (dotVector2(firstDerivativeRow, firstDerivativeColumn) +
            dotVector2(terms.relativeVector, secondDerivative)),
      );
    }
    hessianRows.push(rowValues);
  }

  return [
    [
      hessianRows[0][0],
      hessianRows[0][1],
      hessianRows[0][2],
      hessianRows[0][3],
      hessianRows[0][4],
      hessianRows[0][5],
    ],
    [
      hessianRows[1][0],
      hessianRows[1][1],
      hessianRows[1][2],
      hessianRows[1][3],
      hessianRows[1][4],
      hessianRows[1][5],
    ],
    [
      hessianRows[2][0],
      hessianRows[2][1],
      hessianRows[2][2],
      hessianRows[2][3],
      hessianRows[2][4],
      hessianRows[2][5],
    ],
    [
      hessianRows[3][0],
      hessianRows[3][1],
      hessianRows[3][2],
      hessianRows[3][3],
      hessianRows[3][4],
      hessianRows[3][5],
    ],
    [
      hessianRows[4][0],
      hessianRows[4][1],
      hessianRows[4][2],
      hessianRows[4][3],
      hessianRows[4][4],
      hessianRows[4][5],
    ],
    [
      hessianRows[5][0],
      hessianRows[5][1],
      hessianRows[5][2],
      hessianRows[5][3],
      hessianRows[5][4],
      hessianRows[5][5],
    ],
  ];
}

export function squaredHvp(
  stateVector: StateVector,
  directionVector: GradientVector,
  parameters: Parameters,
): GradientVector {
  assertFiniteValues(directionVector, "directionVector");
  return multiplyHessianAndDirection(
    squaredHess(stateVector, parameters),
    directionVector,
  );
}

export const domain = {
  sample(seed: number, sampleCount: number): StateVector[] {
    // Guard: sampleCount must be non-negative.
    if (sampleCount < 0) {
      throw new Error("sampleCount must be greater than or equal to zero.");
    }

    const sampledStates: StateVector[] = [];
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
      const pAx = sampleUniformValue();
      const pAy = sampleUniformValue();
      const thetaA = sampleUniformValue();
      let pBx = sampleUniformValue();
      let pBy = sampleUniformValue();
      const thetaB = sampleUniformValue();

      const sampledDistance = Math.hypot(pBx - pAx, pBy - pAy);
      // Guard: prevent near-zero baseline point distance in sampled states.
      if (sampledDistance <= DEFAULT_MINIMUM_SEPARATION) {
        pBx = pAx + DEFAULT_MINIMUM_SEPARATION;
        pBy = pAy;
      }

      sampledStates.push([pAx, pAy, thetaA, pBx, pBy, thetaB]);
    }

    return sampledStates;
  },
};
