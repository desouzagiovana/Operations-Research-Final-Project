import { Problem, SimplexResult } from '../models/problemModel.js';

/**
 * Simplex solver for linear programming problems.
 * Supports max/min objectives and constraints of type <=, >=, =.
 * Returns iteration tableaux, optimal solution, and status.
 */
export async function solveSimplex(problem: Problem): Promise<SimplexResult> {
  // Convert to standard form (all constraints <= with non‑negative RHS)
  const { tableau, varNames, basisVarIndices } = buildStandardTableau(problem);
  const iterations: number[][][] = [];
  // Record initial tableau
  iterations.push(cloneTableau(tableau));

  const numRows = tableau.length;
  const numCols = tableau[0].length;

  while (true) {
    // Identify entering variable (most negative coefficient in objective row)
    const objRow = tableau[numRows - 1];
    let enteringCol = -1;
    let mostNegative = 0;
    for (let j = 0; j < numCols - 1; j++) {
      if (objRow[j] < mostNegative) {
        mostNegative = objRow[j];
        enteringCol = j;
      }
    }
    if (enteringCol === -1) {
      // optimal
      break;
    }
    // Identify leaving variable (minimum ratio test)
    let minRatio = Infinity;
    let leavingRow = -1;
    for (let i = 0; i < numRows - 1; i++) {
      const colCoeff = tableau[i][enteringCol];
      if (colCoeff > 0) {
        const ratio = tableau[i][numCols - 1] / colCoeff;
        if (ratio < minRatio) {
          minRatio = ratio;
          leavingRow = i;
        }
      }
    }
    if (leavingRow === -1) {
      // unbounded
      return {
        status: 'unbounded',
        iterations,
        message: 'Problem is unbounded',
      } as SimplexResult;
    }
    // Pivot on (leavingRow, enteringCol)
    pivot(tableau, leavingRow, enteringCol);
    // Update basis tracking
    basisVarIndices[leavingRow] = enteringCol;
    iterations.push(cloneTableau(tableau));
  }

  // Extract solution
  const solution: { [variable: string]: number } = {};
  for (let i = 0; i < basisVarIndices.length; i++) {
    const varIdx = basisVarIndices[i];
    const varName = varNames[varIdx];
    solution[varName] = tableau[i][numCols - 1];
  }
  // Non‑basic vars = 0
  for (let j = 0; j < varNames.length; j++) {
    if (!Object.prototype.hasOwnProperty.call(solution, varNames[j])) {
      solution[varNames[j]] = 0;
    }
  }
  const optimalValue = tableau[numRows - 1][numCols - 1] * (problem.objective.direction === 'max' ? 1 : -1);

  return {
    status: 'optimal',
    optimalSolution: solution,
    optimalValue,
    iterations,
  } as SimplexResult;
}

/** Helper: build standard tableau */
function buildStandardTableau(problem: Problem) {
  const numOriginalVars = problem.objective.coefficients.length;
  const constraints = problem.constraints.map((c) => {
    // Ensure RHS non‑negative
    let coeffs = c.coefficients.slice();
    let rhs = c.rhs;
    let type = c.type;
    if (rhs < 0) {
      coeffs = coeffs.map((v) => -v);
      rhs = -rhs;
      // Reverse inequality direction
      if (type === '<=') type = '>=';
      else if (type === '>=') type = '<=';
    }
    // Convert >= to <= by multiplying -1
    if (type === '>=') {
      coeffs = coeffs.map((v) => -v);
      rhs = -rhs;
      type = '<=';
    }
    // Equality is split into two <= constraints
    if (type === '=') {
      return [
        { coefficients: coeffs, rhs },
        { coefficients: coeffs.map((v) => -v), rhs: -rhs },
      ];
    }
    return [{ coefficients: coeffs, rhs }];
  }).flat();

  const numConstraints = constraints.length;
  // Total variables = original + slack for each constraint
  const totalVars = numOriginalVars + numConstraints;
  const varNames: string[] = [];
  for (let i = 0; i < numOriginalVars; i++) varNames.push(`x${i + 1}`);
  for (let i = 0; i < numConstraints; i++) varNames.push(`s${i + 1}`);

  // Build tableau matrix (rows = constraints + objective)
  const tableau: number[][] = [];
  for (let i = 0; i < numConstraints; i++) {
    const row: number[] = new Array(totalVars + 1).fill(0);
    const cons = constraints[i];
    // Original variable coefficients
    for (let j = 0; j < numOriginalVars; j++) {
      row[j] = cons.coefficients[j] ?? 0;
    }
    // Slack variable coefficient = 1 for this row
    row[numOriginalVars + i] = 1;
    // RHS
    row[totalVars] = cons.rhs;
    tableau.push(row);
  }
  // Objective row (last row)
  const objRow: number[] = new Array(totalVars + 1).fill(0);
  const coeffSign = problem.objective.direction === 'max' ? -1 : 1; // Convert to minimization for tableau
  for (let j = 0; j < numOriginalVars; j++) {
    objRow[j] = coeffSign * problem.objective.coefficients[j];
  }
  // Slack vars have 0
  objRow[totalVars] = 0;
  tableau.push(objRow);

  // Basis initially consists of slack variables indices
  const basisVarIndices = [] as number[];
  for (let i = 0; i < numConstraints; i++) {
    basisVarIndices.push(numOriginalVars + i);
  }

  return { tableau, varNames, basisVarIndices };
}

/** Perform pivot operation */
function pivot(tableau: number[][], pivotRow: number, pivotCol: number) {
  const numRows = tableau.length;
  const numCols = tableau[0].length;
  const pivotElement = tableau[pivotRow][pivotCol];
  // Normalize pivot row
  for (let j = 0; j < numCols; j++) {
    tableau[pivotRow][j] /= pivotElement;
  }
  // Eliminate other rows
  for (let i = 0; i < numRows; i++) {
    if (i !== pivotRow) {
      const factor = tableau[i][pivotCol];
      for (let j = 0; j < numCols; j++) {
        tableau[i][j] -= factor * tableau[pivotRow][j];
      }
    }
  }
}

/** Deep clone tableau for iteration recording */
function cloneTableau(tab: number[][]): number[][] {
  return tab.map((row) => row.slice());
}
