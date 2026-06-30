import { Router } from 'express';
import { requestSignup, listRequests, approveRequest, rejectRequest } from '../controllers/signup/signup.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

router.post('/', requestSignup);

router.get('/requests',                  authMiddleware, checkRole(['Admin']), listRequests);
router.put('/requests/:id/approve',      authMiddleware, checkRole(['Admin']), approveRequest);
router.put('/requests/:id/reject',       authMiddleware, checkRole(['Admin']), rejectRequest);

export default router;
