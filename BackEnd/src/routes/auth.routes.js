import { Router } from 'express';
import { login, changePassword } from '../controllers/auth/auth.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login',           login);
router.put('/change-password',  authMiddleware, changePassword);

export default router;
