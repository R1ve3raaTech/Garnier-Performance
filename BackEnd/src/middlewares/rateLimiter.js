import rateLimit from 'express-rate-limit';

// Límite estricto para endpoints de autenticación
export const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutos
  max:              10,              // 10 intentos por ventana
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    success: false,
    error: {
      status:  429,
      message: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.',
    },
  },
});

// Límite general para la API (más permisivo)
export const apiLimiter = rateLimit({
  windowMs:        60 * 1000, // 1 minuto
  max:             120,       // 120 requests por minuto
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error: {
      status:  429,
      message: 'Demasiadas peticiones. Intenta de nuevo en un momento.',
    },
  },
});
