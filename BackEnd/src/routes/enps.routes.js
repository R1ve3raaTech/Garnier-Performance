import { Router } from 'express';
import {
  getSurveys, getActiveSurvey, createSurvey, updateSurveyStatus,
  createResponse, getExecutiveSummary, getLikertBreakdown, exportToExcel,
  getSegmentedResults,
} from '../controllers/enps/enps.controller.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import checkRole      from '../middlewares/roleMiddleware.js';

const router = Router();

// Encuestas
router.get('/surveys',              authMiddleware,                          getSurveys);
router.get('/surveys/active',       authMiddleware,                          getActiveSurvey);
router.post('/surveys',             authMiddleware, checkRole(['RH','Admin']), createSurvey);
router.put('/surveys/:id/status',   authMiddleware, checkRole(['RH','Admin']), updateSurveyStatus);

// Respuestas
router.post('/responses',                            authMiddleware,                          createResponse);
router.get('/dashboard/executive-summary/:surveyId', authMiddleware, checkRole(['RH','Admin']), getExecutiveSummary);
router.get('/dashboard/likert-breakdown/:surveyId',  authMiddleware, checkRole(['RH','Admin']), getLikertBreakdown);
router.get('/export/:surveyId',                      authMiddleware, checkRole(['RH','Admin']), exportToExcel);
router.get('/dashboard/segmented/:surveyId',         authMiddleware, checkRole(['RH','Admin']), getSegmentedResults);

export default router;
