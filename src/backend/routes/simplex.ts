import { Router } from 'express';
import { solveSimplex } from '../services/simplexSolver.js';
import { solveBranchAndBound } from '../services/branchAndBound.js';
import { buildDual } from '../services/dual.js';

const router = Router();

// POST /api/simplex
router.post('/', async (req, res) => {
  try {
    const problem = req.body; // Expect problem JSON matching ProblemModel
    const continuousResult = await solveSimplex(problem);
    const integerResult = await solveBranchAndBound(problem);

    // Solução tabular dual (opcional, quando o usuário clica em "Resolver Dual Simplex")
    let dual = undefined;
    if (problem.includeDual) {
      const dualProblem = buildDual(problem);
      const dualResult = await solveSimplex(dualProblem);
      dual = { problem: dualProblem, result: dualResult };
    }

    res.json({
      continuous: continuousResult,
      integer: integerResult,
      dual
    });
  } catch (err) {
    console.error('Simplex error:', err);
    res.status(500).json({ error: (err as Error).message || 'Internal Server Error' });
  }
});

export default router;
