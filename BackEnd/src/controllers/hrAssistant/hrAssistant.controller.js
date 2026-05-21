export const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HR Assistant API Operativa',
    timestamp: new Date().toISOString(),
  });
};

export const processQuery = async (req, res, next) => {
  try {
    const { userId, question } = req.body;

    if (!userId || !question) {
      const err = new Error('Los campos userId y question son requeridos');
      err.status = 400;
      return next(err);
    }

    // Simulación de respuesta del asistente (stub hasta integrar LLM)
    const simulatedAnswer = `Respuesta simulada para el usuario ${userId}: "${question}" — módulo de IA pendiente de integración.`;

    res.status(200).json({
      success: true,
      data: {
        userId,
        question,
        answer: simulatedAnswer,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
