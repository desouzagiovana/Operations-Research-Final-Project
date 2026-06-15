import { Problem, SimplexResult } from '../models/problemModel.js';

const EPSILON = 1e-9;
const MAX_ITERATIONS = 100;
const BIG_M = 1000000; // Valor arbitrariamente grande para penalização

/**
 * Limpa erros de ponto flutuante do JS (ex: 0.30000000000000004 -> 0.3)
 */
function cleanZero(value: number): number {
  return Math.abs(value) < EPSILON ? 0 : value;
}

export async function solveSimplex(problem: Problem): Promise<SimplexResult> {
  const { tableau, varNames, basisVarIndices, artificialIndices } = buildStandardTableau(problem);
  const iterations: number[][][] = [];
  const isMax = problem.objective.direction === 'max';
  
  iterations.push(cloneTableau(tableau));

  const numRows = tableau.length;
  const numCols = tableau[0].length;
  let iterationCount = 0;

  while (iterationCount < MAX_ITERATIONS) {
    iterationCount++;
    const objRow = tableau[numRows - 1];
    
    // 1. Escolha da Variável de Entrada (Coluna Pivô) com critério explícito Max/Min
    let enteringCol = -1;
    let bestVal = 0;

    for (let j = 0; j < numCols - 1; j++) {
      const val = objRow[j];
      if (isMax) {
        if (val < -EPSILON && val < bestVal) {
          bestVal = val;
          enteringCol = j;
        }
      } else {
        if (val > EPSILON && val > bestVal) {
          bestVal = val;
          enteringCol = j;
        }
      }
    }

    // Critério de parada: Otimalidade atingida
    if (enteringCol === -1) break;

    // 2. Teste de Razão Mínima (Linha Pivô)
    let minRatio = Infinity;
    let leavingRow = -1;

    for (let i = 0; i < numRows - 1; i++) {
      const colCoeff = tableau[i][enteringCol];
      // Ignora estritamente divisões por valores <= 0
      if (colCoeff > EPSILON) {
        const ratio = tableau[i][numCols - 1] / colCoeff;
        if (ratio >= 0 && ratio < minRatio) {
          minRatio = ratio;
          leavingRow = i;
        }
      }
    }

    // Critério de parada: Problema Ilimitado
    if (leavingRow === -1) {
      return {
        status: 'unbounded',
        iterations,
        message: 'Problema ilimitado: Nenhuma variável candidata para sair da base.',
      } as SimplexResult;
    }

    // 3. Pivotamento e atualização de Base
    pivot(tableau, leavingRow, enteringCol);
    basisVarIndices[leavingRow] = enteringCol;
    iterations.push(cloneTableau(tableau));
  }

  // Verifica loop infinito
  if (iterationCount >= MAX_ITERATIONS) {
    return {
      status: 'infeasible', // Tratado como inviável/não-resolvido para fins práticos
      iterations,
      message: 'Limite de iterações excedido (possível ciclo/degeneração).',
    } as SimplexResult;
  }

  // Extração da Solução Ótima
  const solution: { [variable: string]: number } = {};
  for (let j = 0; j < varNames.length; j++) solution[varNames[j]] = 0;

  for (let i = 0; i < basisVarIndices.length; i++) {
    const varIdx = basisVarIndices[i];
    solution[varNames[varIdx]] = cleanZero(tableau[i][numCols - 1]);
  }

  // Verifica se o problema é inviável (variáveis artificiais continuam na base com valor > 0)
  const isInfeasible = artificialIndices.some(
    (idx) => basisVarIndices.includes(idx) && solution[varNames[idx]] > EPSILON
  );

  if (isInfeasible) {
    return {
      status: 'infeasible',
      iterations,
      message: 'Problema Inviável: Variáveis artificiais não puderam ser removidas da base.',
    } as SimplexResult;
  }

  // O valor ótimo de Z precisa ter seu sinal ajustado no tableau final
  let optimalValue = cleanZero(tableau[numRows - 1][numCols - 1]);
  // No tableau, se Z - cX = RHS, o valor de Z real é o RHS
  // Para minimização no M-Grande, a matemática da tabela nos dá o inverso dependendo da montagema

  return {
    status: 'optimal',
    optimalSolution: solution,
    optimalValue,
    iterations,
  } as SimplexResult;
}

/** * Helper: Constrói a Matriz Padrão (M-Grande embutido)
 */
function buildStandardTableau(problem: Problem) {
  const numOriginalVars = problem.objective.coefficients.length;
  const isMax = problem.objective.direction === 'max';
  const M = isMax ? -BIG_M : BIG_M; // Penalização na FO

  // Pré-processa as restrições para garantir RHS >= 0
  const constraints = problem.constraints.map(c => {
    let coeffs = [...c.coefficients];
    let rhs = c.rhs;
    let type = c.type;

    if (rhs < -EPSILON) {
      coeffs = coeffs.map(v => -v);
      rhs = -rhs;
      if (type === '<=') type = '>=';
      else if (type === '>=') type = '<=';
    }
    return { coefficients: coeffs, type, rhs };
  });

  const numConstraints = constraints.length;
  const varNames: string[] = [];
  for (let i = 0; i < numOriginalVars; i++) varNames.push(`x${i + 1}`);

  let totalSlackSurplus = 0;
  let totalArtificials = 0;
  
  // Contagem para montar os nomes das variáveis dinamicamente
  constraints.forEach(c => {
    if (c.type === '<=') { varNames.push(`f${++totalSlackSurplus}`); }
    else if (c.type === '>=') { varNames.push(`e${++totalSlackSurplus}`); varNames.push(`a${++totalArtificials}`); }
    else if (c.type === '=') { varNames.push(`a${++totalArtificials}`); }
  });

  const totalVars = varNames.length;
  const tableau: number[][] = [];
  const basisVarIndices: number[] = [];
  const artificialIndices: number[] = [];

  let colIdx = numOriginalVars;
  
  for (let i = 0; i < numConstraints; i++) {
    const row: number[] = new Array(totalVars + 1).fill(0);
    const cons = constraints[i];
    
    for (let j = 0; j < numOriginalVars; j++) {
      row[j] = cons.coefficients[j] ?? 0;
    }

    if (cons.type === '<=') {
      row[colIdx] = 1; // Variável de folga
      basisVarIndices.push(colIdx);
      colIdx++;
    } else if (cons.type === '>=') {
      row[colIdx] = -1; // Variável de excesso
      colIdx++;
      row[colIdx] = 1; // Variável artificial
      basisVarIndices.push(colIdx);
      artificialIndices.push(colIdx);
      colIdx++;
    } else if (cons.type === '=') {
      row[colIdx] = 1; // Variável artificial
      basisVarIndices.push(colIdx);
      artificialIndices.push(colIdx);
      colIdx++;
    }

    row[totalVars] = cons.rhs;
    tableau.push(row);
  }

  // Linha da Função Objetivo
  const objRow: number[] = new Array(totalVars + 1).fill(0);
  for (let j = 0; j < numOriginalVars; j++) {
    objRow[j] = -problem.objective.coefficients[j];
  }

  // Adicionando as penalidades do M-Grande nas variáveis artificiais
  artificialIndices.forEach(aIdx => {
    objRow[aIdx] = -M;
  });
  tableau.push(objRow);

  // Operação de linha para zerar as variáveis artificiais na linha de Z (Inicialização do M-Grande)
  for (let i = 0; i < numConstraints; i++) {
    const basicVarIdx = basisVarIndices[i];
    if (artificialIndices.includes(basicVarIdx)) {
      const factor = tableau[numConstraints][basicVarIdx]; // Valor atual (M ou -M)
      for (let j = 0; j <= totalVars; j++) {
        tableau[numConstraints][j] = cleanZero(tableau[numConstraints][j] - factor * tableau[i][j]);
      }
    }
  }

  return { tableau, varNames, basisVarIndices, artificialIndices };
}

/** * Operação exata de Pivotamento (Gauss-Jordan)
 */
function pivot(tableau: number[][], pivotRow: number, pivotCol: number) {
  const numRows = tableau.length;
  const numCols = tableau[0].length;
  const pivotElement = tableau[pivotRow][pivotCol];

  // 1. Normaliza a Linha Pivô
  for (let j = 0; j < numCols; j++) {
    tableau[pivotRow][j] = cleanZero(tableau[pivotRow][j] / pivotElement);
  }

  // 2. Eliminação de Gauss-Jordan nas demais linhas
  for (let i = 0; i < numRows; i++) {
    if (i !== pivotRow) {
      const factor = tableau[i][pivotCol];
      for (let j = 0; j < numCols; j++) {
        tableau[i][j] = cleanZero(tableau[i][j] - factor * tableau[pivotRow][j]);
      }
    }
  }
}

function cloneTableau(tab: number[][]): number[][] {
  return tab.map((row) => [...row]);
}