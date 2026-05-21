import { Router } from 'express';
import { createFeedback, getReceived, getGiven, getTeamFeedback } from '../controllers/feedback/feedback.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

router.post('/',              authMiddleware,                                    createFeedback);
router.get('/received',       authMiddleware,                                    getReceived);
router.get('/given',          authMiddleware,                                    getGiven);
router.get('/team/:userId',   authMiddleware, checkRole(['Jefatura','RH','Admin']), getTeamFeedback);

export default router;
