import dotenv from 'dotenv';
dotenv.config();

// ── Validación de variables de entorno obligatorias ───────────────────────────
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(`\n❌ Faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  console.error('   Revisa tu archivo .env y compara con .env.example\n');
  process.exit(1);
}

import app from './app.js';
import { testConnection } from './config/supabaseClient.js';

const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV ?? 'development';

const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno : ${ENV}`);
    console.log(`   BD      : Supabase @ ${process.env.SUPABASE_URL}\n`);
  });
};

startServer().catch((err) => {
  console.error('❌ Error al iniciar el servidor:', err.message);
  process.exit(1);
});
