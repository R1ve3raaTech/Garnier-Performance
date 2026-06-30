import { Router } from 'express';
import { getAreas } from '../controllers/areas/areas.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, getAreas);

export default router;
