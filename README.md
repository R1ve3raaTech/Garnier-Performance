# Garnier Performance

Ecosistema digital de Recursos Humanos con Inteligencia Artificial, desarrollado para **Garnier & Garnier**.

## Módulos

- **Evaluación de Desempeño** — ciclos de evaluación 360°, autoevaluación y seguimiento por metas
- **Feedback Continuo** — retroalimentación en tiempo real entre colaboradores y líderes
- **eNPS** — medición de satisfacción y lealtad del empleado
- **Pulse Work** — encuestas de clima organizacional rápidas
- **Reconocimientos** — sistema de reconocimiento entre pares
- **Reuniones 1:1** — agendamiento y seguimiento de reuniones individuales
- **HR Assistant (IA)** — asistente inteligente con RAG para consultas de RRHH
- **Gestión de Usuarios y Áreas** — administración de colaboradores y estructura organizacional

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| IA / RAG | OpenAI API + pgvector |
| Autenticación | JWT |

## Estructura del Proyecto

```
Garnier-Performance/
├── BackEnd/          # API REST con Node.js/Express
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── config/
│   └── database/     # Scripts SQL de migraciones
└── FrontEnd/         # SPA con React + Vite
    └── src/
        ├── components/
        ├── pages/
        ├── context/
        └── hooks/
```

## Instalación

### Backend
```bash
cd BackEnd
npm install
cp .env.example .env   # Configurar variables de entorno
npm run dev
```

### Frontend
```bash
cd FrontEnd
npm install
npm run dev
```

## Variables de entorno

Ver `BackEnd/.env.example` para la configuración necesaria (base de datos, JWT secret, OpenAI API key, etc.).

---

Desarrollado por **R1ve3raaTech** para Garnier & Garnier.
