import { Router } from 'express';
import { createRecord, getHistory } from '../controllers/meetings/meetings.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

router.post('/records',              authMiddleware, checkRole(['Jefatura','RH','Admin']), createRecord);
router.get('/records/:employeeId',   authMiddleware, checkRole(['Jefatura','RH','Admin']), getHistory);

export default router;
