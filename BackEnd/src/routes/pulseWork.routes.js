import { Router } from 'express';
import { createEntry, getDashboardAlerts, getCrisisAlerts, getEmotionTrend } from '../controllers/pulseWork/pulseWork.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole from '../middlewares/roleMiddleware.js';

const router = Router();

router.post('/entries',                    authMiddleware,                                    createEntry);
router.get('/dashboard/alerts/:areaId',    authMiddleware, checkRole(['Jefatura','RH','Admin']), getDashboardAlerts);
router.get('/crisis-alerts/:areaId',       authMiddleware, checkRole(['RH','Admin']),            getCrisisAlerts);
router.get('/trend/:areaId',               authMiddleware, checkRole(['Jefatura','RH','Admin']), getEmotionTrend);

export default router;
