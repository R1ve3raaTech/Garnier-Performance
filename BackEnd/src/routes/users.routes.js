import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getUsersByArea,
  getAllUsers,
} from '../controllers/users/users.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/me',                authMiddleware,                                    getMyProfile);
router.put('/me',                authMiddleware,                                    updateMyProfile);
router.get('/by-area/:areaId',   authMiddleware, checkRole(['Jefatura','RH','Admin']), getUsersByArea);
router.get('/',                  authMiddleware, checkRole(['Admin']),                 getAllUsers);

export default router;
