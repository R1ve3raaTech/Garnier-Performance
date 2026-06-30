import { Router } from 'express';
import { requestSignup, listRequests, approveRequest, rejectRequest } from '../controllers/signup/signup.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Solo el endpoint público (anti-spam) lleva el límite estricto.
// Las acciones de Admin (listar/aprobar/rechazar) ya están autenticadas y
// no deben compartir ese cupo con los intentos de login.
router.post('/', authLimiter, requestSignup);

router.get('/requests',                  authMiddleware, checkRole(['Admin']), listRequests);
router.put('/requests/:id/approve',      authMiddleware, checkRole(['Admin']), approveRequest);
router.put('/requests/:id/reject',       authMiddleware, checkRole(['Admin']), rejectRequest);

export default router;
