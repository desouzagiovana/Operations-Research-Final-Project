import { Problem, Constraint, SimplexResult } from '../models/problemModel.js';
import { solveSimplex } from './simplexSolver.js';

const EPSILON = 1e-6; // Tolerância para considerar um número como inteiro

/**
 * Verifica se um valor é um número inteiro (ignorando pequenos erros de float)
 */
function isInteger(value: number): boolean {
  return Math.abs(value - Math.round(value)) < EPSILON;
}

export interface BnBResult {
  hasIntegerSolution: boolean;
  bestIntegerSolution?: { [variable: string]: number };
  bestZ?: number;
  message: string;
  // NOVO (bônus tabular inteira): dados do subproblema cujo simplex deu a solução inteira ótima
  bestProblem?: Problem;            // subproblema (com os cortes de ramificação)
  bestIterations?: number[][][];    // tableaus do simplex desse subproblema
  branchingConstraints?: Constraint[]; // apenas os cortes adicionados em relação ao original
}

export async function solveBranchAndBound(originalProblem: Problem): Promise<BnBResult> {
  const isMax = originalProblem.objective.direction === 'max';
  
  // Nossos limites globais. Começam com o pior cenário possível.
  let globalBestZ = isMax ? -Infinity : Infinity;
  let globalBestSolution: { [variable: string]: number } | undefined = undefined;
  let globalBestResult: SimplexResult | undefined = undefined; // tableau do nó vencedor
  let globalBestProblem: Problem | undefined = undefined;      // subproblema do nó vencedor
  let nodesExplored = 0;
  const MAX_NODES = 1000; // Trava de segurança para não explodir a memória

  // Função recursiva DFS (Busca em Profundidade)
  async function bnbNode(currentProblem: Problem) {
    if (nodesExplored++ > MAX_NODES) return;

    // 1. Resolve o nó atual usando o Simplex contínuo
    const result = await solveSimplex(currentProblem);

    // Se for inviável ou ilimitado, "podamos" (cortamos) esse galho
    if (result.status !== 'optimal' || result.optimalValue === undefined) {
      return;
    }

    const currentZ = result.optimalValue;

    // 2. Limitação (Bounding): O resultado atual é pior que o nosso melhor inteiro? Corta o galho.
    if (isMax && currentZ <= globalBestZ) return;
    if (!isMax && currentZ >= globalBestZ) return;

    // 3. Verifica se as variáveis de decisão originais são inteiras
    let fractionalVarIdx = -1;
    let fractionalValue = 0;
    const numOriginalVars = currentProblem.objective.coefficients.length;

    for (let i = 0; i < numOriginalVars; i++) {
      const varName = `x${i + 1}`;
      const val = result.optimalSolution![varName] || 0;
      
      if (!isInteger(val)) {
        fractionalVarIdx = i;
        fractionalValue = val;
        break; // Encontramos a primeira variável quebrada
      }
    }

    // Se não achou variável decimal, encontramos uma SOLUÇÃO INTEIRA!
    if (fractionalVarIdx === -1) {
      globalBestZ = currentZ;
      globalBestSolution = { ...result.optimalSolution };
      globalBestResult = result;          // guarda o tableau desse nó
      globalBestProblem = currentProblem; // guarda o subproblema (com cortes)
      return;
    }

    // 4. Ramificação (Branching): Cria dois subproblemas
    const floorValue = Math.floor(fractionalValue); // Arredonda para baixo
    const ceilValue = Math.ceil(fractionalValue);   // Arredonda para cima

    // Constrói os coeficientes da nova restrição (ex: [1, 0] para x1, [0, 1] para x2)
    const newConstraintCoeffs = new Array(numOriginalVars).fill(0);
    newConstraintCoeffs[fractionalVarIdx] = 1;

    // Subproblema A: xi <= floor
    const problemA: Problem = {
      objective: { ...currentProblem.objective },
      constraints: [
        ...currentProblem.constraints,
        { coefficients: [...newConstraintCoeffs], type: '<=', rhs: floorValue }
      ]
    };

    // Subproblema B: xi >= ceil
    const problemB: Problem = {
      objective: { ...currentProblem.objective },
      constraints: [
        ...currentProblem.constraints,
        { coefficients: [...newConstraintCoeffs], type: '>=', rhs: ceilValue }
      ]
    };

    // Resolve os dois galhos recursivamente
    await bnbNode(problemA);
    await bnbNode(problemB);
  }

  // Inicia a árvore pelo problema original
  await bnbNode(originalProblem);

  if (globalBestSolution) {
    // (as) necessário: TS não rastreia atribuições feitas dentro do closure recursivo
    const bestProblem = globalBestProblem as Problem | undefined;
    const bestResult = globalBestResult as SimplexResult | undefined;

    // Cortes de ramificação = restrições do nó vencedor além das do problema original
    const numOriginalConstraints = originalProblem.constraints.length;
    const branchingConstraints = bestProblem
      ? bestProblem.constraints.slice(numOriginalConstraints)
      : [];

    return {
      hasIntegerSolution: true,
      bestIntegerSolution: globalBestSolution,
      bestZ: globalBestZ,
      message: `Solução inteira ótima encontrada após explorar ${nodesExplored} nós na árvore de decisão.`,
      bestProblem,
      bestIterations: bestResult ? bestResult.iterations : undefined,
      branchingConstraints
    };
  } else {
    return {
      hasIntegerSolution: false,
      message: 'Nenhuma solução inteira viável foi encontrada na região do problema.'
    };
  }
}