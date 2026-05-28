import { Router } from 'express';
import { solveSimplex } from '../services/simplexSolver.js';

const router = Router();

// POST /api/simplex
router.post('/', async (req, res) => {
  try {
    const problem = req.body; // Expect problem JSON matching ProblemModel
    const result = await solveSimplex(problem);
    res.json(result);
  } catch (err) {
    console.error('Simplex error:', err);
    res.status(500).json({ error: (err as Error).message || 'Internal Server Error' });
  }
});

export default router;
