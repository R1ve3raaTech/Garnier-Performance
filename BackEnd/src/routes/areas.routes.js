import { Router } from 'express';
import { getAreas } from '../controllers/areas/areas.controller.js';

const router = Router();

// Pública: catálogo de áreas, lo necesita también el formulario de registro (sin sesión)
router.get('/', getAreas);

export default router;
