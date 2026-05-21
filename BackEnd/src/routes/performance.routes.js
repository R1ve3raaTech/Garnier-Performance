import { Router } from 'express';
import { getGoalsByUser, createGoal, updateGoal, get1on1Prep } from '../controllers/performance/performance.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

// Metas — el propio usuario puede ver las suyas; la lógica de acceso está en el controller
router.get('/goals/:userId',  authMiddleware,                                    getGoalsByUser);
router.post('/goals',         authMiddleware, checkRole(['Jefatura','RH','Admin']), createGoal);
router.put('/goals/:goalId',  authMiddleware, checkRole(['Jefatura','RH','Admin']), updateGoal);

// 1:1
router.post('/1on1-prep',     authMiddleware, checkRole(['Jefatura','RH','Admin']), get1on1Prep);

export default router;
