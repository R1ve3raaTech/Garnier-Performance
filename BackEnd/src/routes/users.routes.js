import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getUsersByArea,
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from '../controllers/users/users.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/me',                authMiddleware,                                       getMyProfile);
router.put('/me',                authMiddleware,                                       updateMyProfile);
router.get('/by-area/:areaId',   authMiddleware, checkRole(['Jefatura','RH','Admin']), getUsersByArea);
router.get('/',                  authMiddleware, checkRole(['Admin']),                 getAllUsers);
router.post('/',                 authMiddleware, checkRole(['Admin']),                 createUser);
router.put('/:id/role',          authMiddleware, checkRole(['Admin']),                 updateUserRole);
router.delete('/:id',            authMiddleware, checkRole(['Admin']),                 deleteUser);

export default router;
