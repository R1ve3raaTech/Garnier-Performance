import { Router } from 'express';
import { getFeed, getMine, createRecognition } from '../controllers/recognition/recognition.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/',       authMiddleware, getFeed);
router.get('/mine',   authMiddleware, getMine);
router.post('/',      authMiddleware, createRecognition);

export default router;
