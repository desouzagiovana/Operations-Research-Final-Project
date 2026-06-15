import { Router } from 'express';
import { solveSimplex } from '../services/simplexSolver.js';
import { solveBranchAndBound } from '../services/branchAndBound.js';

const router = Router();

// POST /api/simplex
router.post('/', async (req, res) => {
  try {
    const problem = req.body; // Expect problem JSON matching ProblemModel
    const continuousResult = await solveSimplex(problem);
    const integerResult = await solveBranchAndBound(problem);
    res.json({
      continuous: continuousResult,
      integer: integerResult
    });
  } catch (err) {
    console.error('Simplex error:', err);
    res.status(500).json({ error: (err as Error).message || 'Internal Server Error' });
  }
});

export default router;
