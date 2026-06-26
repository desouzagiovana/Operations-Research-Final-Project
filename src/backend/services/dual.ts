import { Problem, Constraint, ConstraintType } from '../models/problemModel.js';

/**
 * Constrói o problema DUAL a partir do PRIMAL.
 *
 * Estratégia (garante variáveis duais y >= 0, resolvíveis pelo solver atual):
 *  - Normaliza as restrições do primal para uma única direção:
 *      • primal de MAX  -> todas '<='
 *      • primal de MIN  -> todas '>='
 *    (restrições '=' são divididas em duas; restrições na direção oposta
 *     são multiplicadas por -1.)
 *  - Para MAX:  max cᵀx,  A x <= b,  x>=0   =>   dual: min bᵀy,  Aᵀy >= c,  y>=0
 *  - Para MIN:  min cᵀx,  A x >= b,  x>=0   =>   dual: max bᵀy,  Aᵀy <= c,  y>=0
 *
 * Pela dualidade forte, o valor ótimo do dual é igual ao do primal.
 */
export function buildDual(primal: Problem): Problem {
  const isMax = primal.objective.direction === 'max';
  const n = primal.objective.coefficients.length;
  const targetType: ConstraintType = isMax ? '<=' : '>=';

  // 1. Normaliza as restrições do primal para a direção alvo.
  const rows: { coefficients: number[]; rhs: number }[] = [];
  const addRow = (coefficients: number[], type: ConstraintType, rhs: number) => {
    if (type === targetType) {
      rows.push({ coefficients: [...coefficients], rhs });
    } else {
      // direção oposta: multiplica por -1 para inverter a desigualdade
      rows.push({ coefficients: coefficients.map(v => -v), rhs: -rhs });
    }
  };
  for (const c of primal.constraints) {
    if (c.type === '=') {
      addRow(c.coefficients, '<=', c.rhs);
      addRow(c.coefficients, '>=', c.rhs);
    } else {
      addRow(c.coefficients, c.type, c.rhs);
    }
  }

  // 2. Monta o dual (transposta da matriz de restrições).
  const dualDirection: 'max' | 'min' = isMax ? 'min' : 'max';
  const dualType: ConstraintType = isMax ? '>=' : '<=';

  const dualObjective = {
    direction: dualDirection,
    coefficients: rows.map(r => r.rhs), // vetor b vira os coeficientes da FO dual
  };

  const dualConstraints: Constraint[] = [];
  for (let j = 0; j < n; j++) {
    dualConstraints.push({
      coefficients: rows.map(r => r.coefficients[j]), // coluna j de A = linha j de Aᵀ
      type: dualType,
      rhs: primal.objective.coefficients[j], // c_j vira o RHS
    });
  }

  return { objective: dualObjective, constraints: dualConstraints };
}
