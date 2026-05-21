import { Router } from 'express';
import {
  healthCheck, processQuery, getChatHistory,
  getUnresolvedQueries, resolveQuery, updateQueryStatus,
} from '../modules/hr-assistant/controllers.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/health',                       healthCheck);
router.post('/query',                       authMiddleware,                          processQuery);
router.get('/history',                      authMiddleware,                          getChatHistory);

// Gestión de escalaciones (RH y Admin)
router.get('/unresolved',                   authMiddleware, checkRole(['RH','Admin']), getUnresolvedQueries);
router.put('/unresolved/:id/resolve',       authMiddleware, checkRole(['RH','Admin']), resolveQuery);
router.put('/unresolved/:id/status',        authMiddleware, checkRole(['RH','Admin']), updateQueryStatus);

export default router;
