export interface Objective {
  direction: 'max' | 'min'; // Maximize or Minimize
  coefficients: number[]; // Coefficients for decision variables (e.g., [3,5] for 3x1 + 5x2)
}

export type ConstraintType = '<=' | '>=' | '=';

export interface Constraint {
  coefficients: number[]; // Coefficients for decision variables
  type: ConstraintType; // Inequality type
  rhs: number; // Right‑hand side value
}

export interface Problem {
  objective: Objective;
  constraints: Constraint[];
  // Number of variables can be derived from objective.coefficients length
}

export interface SimplexResult {
  status: 'optimal' | 'unbounded' | 'infeasible';
  optimalSolution?: { [variable: string]: number };
  optimalValue?: number;
  iterations: number[][][]; // Array of tableaux (each tableau is 2‑D array of numbers)
  message?: string;
}
