import dotenv from 'dotenv';
dotenv.config();

// ── Validación de variables de entorno obligatorias ───────────────────────────
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'ANTHROPIC_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(`\n❌ Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  console.error('   Revisa tu archivo .env y compara con .env.example\n');
  process.exit(1);
}

import app from './app.js';
import { testConnection } from './config/db.js';

const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV ?? 'development';

const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno : ${ENV}`);
    console.log(`   BD      : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
  });
};

startServer().catch((err) => {
  console.error('❌ Error al iniciar el servidor:', err.message);
  process.exit(1);
});
