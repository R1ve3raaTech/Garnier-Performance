/**
 * Servicio RAG (Retrieval-Augmented Generation) para el HR Assistant.
 *
 * En producción, vectorizeText y searchSimilarContext se conectarían a
 * Pinecone / Qdrant. Esta implementación simula fielmente ese comportamiento
 * con una base de conocimiento estática sobre políticas de Garnier,
 * permitiendo desarrollar y probar el flujo completo sin infraestructura vectorial.
 */

// ── Base de conocimiento simulada ────────────────────────────────────────────
// Cada chunk representa un fragmento de un documento oficial de Garnier
// con los metadatos que un vector DB real devolvería junto al embedding.
const KNOWLEDGE_BASE = [
  {
    chunkId: 'emp-4.2.1',
    document: 'Manual de Empleados Garnier 2025',
    section: 'Sección 4.2 — Política de Vacaciones',
    score: 0.97,
    content: `Todo empleado de Garnier tiene derecho a vacaciones anuales pagadas según su antigüedad:
- De 0 a 1 año de servicio: 10 días hábiles.
- De 1 a 3 años de servicio: 15 días hábiles.
- De 3 a 5 años de servicio: 18 días hábiles.
- Más de 5 años de servicio: 20 días hábiles.
Las vacaciones deben coordinarse con la jefatura inmediata con un mínimo de 15 días de anticipación.
El goce de vacaciones no puede fraccionarse en períodos menores a 5 días hábiles consecutivos.`,
    keywords: ['vacaciones', 'días', 'descanso', 'año', 'hábiles', 'licencia', 'permiso vacacional'],
  },
  {
    chunkId: 'emp-4.3.1',
    document: 'Manual de Empleados Garnier 2025',
    section: 'Sección 4.3 — Permisos y Ausencias',
    score: 0.91,
    content: `Garnier reconoce los siguientes tipos de permisos con goce de salario:
- Matrimonio: 5 días hábiles.
- Fallecimiento de familiar directo (padres, hijos, cónyuge): 3 días hábiles.
- Fallecimiento de familiar colateral (hermanos, abuelos): 1 día hábil.
- Paternidad: 3 días hábiles adicionales a los establecidos por ley.
- Citas médicas propias: hasta 4 horas, con justificante médico.
Los permisos deben solicitarse a través del sistema HRIS con al menos 48 horas de anticipación, salvo casos de fuerza mayor.`,
    keywords: ['permiso', 'ausencia', 'licencia', 'matrimonio', 'fallecimiento', 'paternidad', 'médico', 'cita'],
  },
  {
    chunkId: 'emp-5.1.1',
    document: 'Manual de Empleados Garnier 2025',
    section: 'Sección 5.1 — Paquete de Compensación',
    score: 0.94,
    content: `El paquete de compensación de Garnier incluye los siguientes beneficios:
- Salario base competitivo revisado anualmente en enero.
- Bono por desempeño semestral: hasta un 15% del salario bruto según evaluación.
- Seguro médico privado con cobertura para empleado y hasta 2 dependientes directos.
- Subsidio de alimentación: ₡75,000 mensuales acreditados en tarjeta de beneficios.
- Subsidio de transporte: ₡40,000 mensuales para empleados fuera del GAM.
- Plan de pensión complementaria con contribución patronal del 3% del salario bruto.`,
    keywords: ['salario', 'beneficios', 'compensación', 'bono', 'seguro', 'alimentación', 'transporte', 'pensión', 'sueldo'],
  },
  {
    chunkId: 'rit-7.1.1',
    document: 'Reglamento Interno de Trabajo Garnier',
    section: 'Sección 7.1 — Jornada Laboral',
    score: 0.89,
    content: `La jornada laboral ordinaria en Garnier es de 8 horas diarias y 40 horas semanales.
El horario estándar es de 8:00 a.m. a 5:00 p.m. de lunes a viernes, con una hora de almuerzo.
Para puestos con modalidad híbrida, se permite trabajo remoto hasta 2 días por semana, sujeto a aprobación de la jefatura.
Las horas extra deben ser previamente autorizadas por la jefatura y se pagan según el Código de Trabajo:
- Horas extra diurnas: 1.5 veces el valor de la hora ordinaria.
- Horas extra nocturnas: 2 veces el valor de la hora ordinaria.`,
    keywords: ['jornada', 'horario', 'horas', 'extra', 'trabajo', 'remoto', 'híbrido', 'teletrabajo', 'semana'],
  },
  {
    chunkId: 'rit-7.2.1',
    document: 'Reglamento Interno de Trabajo Garnier',
    section: 'Sección 7.2 — Evaluación del Desempeño',
    score: 0.88,
    content: `El proceso de evaluación de desempeño en Garnier se realiza de forma semestral (junio y diciembre).
Componentes de la evaluación:
- Cumplimiento de OKRs y KPIs individuales (60% del puntaje).
- Evaluación de competencias conductuales (25% del puntaje).
- Evaluación 360° de pares y colaboradores (15% del puntaje).
Los resultados se clasifican en: Supera Expectativas, Cumple Expectativas, En Desarrollo, o Insatisfactorio.
Un empleado en categoría "Insatisfactorio" por dos períodos consecutivos puede ser sujeto a un plan de mejora formal.`,
    keywords: ['evaluación', 'desempeño', 'okr', 'kpi', 'rendimiento', 'performance', 'calificación', 'semestral'],
  },
  {
    chunkId: 'cap-2.1.1',
    document: 'Política de Capacitación y Desarrollo 2025',
    section: 'Sección 2.1 — Presupuesto de Capacitación',
    score: 0.92,
    content: `Cada empleado de Garnier cuenta con un presupuesto anual de capacitación de ₡300,000 para cursos externos.
Garnier cubre el 100% del costo de certificaciones técnicas aprobadas por la jefatura y el área de RH.
El proceso de solicitud de capacitación debe realizarse a través del portal de HRIS, con justificación de impacto en el puesto.
Los estudios universitarios de posgrado pueden ser apoyados mediante becas parciales (50%) sujetas a disponibilidad presupuestaria y rendimiento académico mínimo de 80%.`,
    keywords: ['capacitación', 'formación', 'curso', 'certificación', 'beca', 'estudio', 'entrenamiento', 'desarrollo'],
  },
];

// ── Funciones del servicio ────────────────────────────────────────────────────

/**
 * Simula el envío de texto a un motor de vectorización (ej. OpenAI Embeddings).
 * En producción retornaría el vector float[] para almacenar en Pinecone/Qdrant.
 */
export const vectorizeText = async (text) => {
  return {
    text,
    vectorDimensions: 1536,
    model: 'text-embedding-3-small',
    simulated: true,
  };
};

/**
 * Simula la búsqueda semántica en la base de datos vectorial.
 * Retorna los chunks más relevantes con su metadata completa.
 *
 * La lógica de scoring por keywords aproxima el comportamiento
 * de similitud coseno que usaría Pinecone/Qdrant con embeddings reales.
 */
export const searchSimilarContext = async (question) => {
  const q = question.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const scored = KNOWLEDGE_BASE.map((chunk) => {
    const matches = chunk.keywords.filter((kw) =>
      q.includes(kw.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    ).length;
    return { ...chunk, relevanceScore: matches > 0 ? chunk.score * (matches / chunk.keywords.length + 0.5) : 0 };
  })
  .filter((c) => c.relevanceScore > 0)
  .sort((a, b) => b.relevanceScore - a.relevanceScore)
  .slice(0, 3);

  // Si no hay matches por keywords, retorna el chunk más general como fallback
  return scored.length > 0 ? scored : [];
};

/**
 * Formatea los chunks recuperados en un bloque de contexto
 * listo para inyectar en el prompt de Claude.
 */
export const buildContextBlock = (chunks) => {
  if (chunks.length === 0) return 'No se encontraron fragmentos relevantes en la base de conocimiento.';

  return chunks
    .map(
      (c, i) =>
        `[Fragmento ${i + 1}]\nDocumento: ${c.document}\nSección: ${c.section}\nContenido:\n${c.content}`
    )
    .join('\n\n---\n\n');
};
