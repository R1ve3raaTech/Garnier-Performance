import { Router } from 'express';
import { getDocuments, uploadDocument, deleteDocument, upload } from '../controllers/rag/rag.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/',     authMiddleware, checkRole(['RH','Admin']), getDocuments);
router.post('/',    authMiddleware, checkRole(['RH','Admin']), upload.single('document'), uploadDocument);
router.delete('/:id', authMiddleware, checkRole(['RH','Admin']), deleteDocument);

export default router;
