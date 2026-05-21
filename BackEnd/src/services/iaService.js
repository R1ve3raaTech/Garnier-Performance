import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

// ── Utilidad interna ──────────────────────────────────────────────────────────
// Limpia la respuesta de Claude y la parsea como JSON de forma segura.
const safeParseJSON = (raw, fallback) => {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
};

// ── Método base ───────────────────────────────────────────────────────────────
/**
 * Wrapper central para todas las llamadas a Claude.
 * El systemPrompt se envía con cache_control para aprovechar prompt caching
 * y reducir costos cuando el mismo system prompt se reutiliza (TTL 5 min).
 */
export const generateCompletion = async (userPrompt, systemPrompt, maxTokens = 1024) => {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  return {
    text: response.content[0].text,
    usage: {
      inputTokens:        response.usage.input_tokens,
      outputTokens:       response.usage.output_tokens,
      cacheCreatedTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens:    response.usage.cache_read_input_tokens     ?? 0,
    },
  };
};

// ── Análisis de sentimiento genérico ─────────────────────────────────────────
/**
 * Análisis de sentimiento general. Base para PulseWork y eNPS.
 * Retorna siempre un objeto estructurado, nunca lanza por JSON malformado.
 */
export const analyzeSentiment = async (text) => {
  if (!text?.trim()) return { sentiment: 'NEUTRO', topics: [], confidence: 0, raw: '' };

  const systemPrompt = `Eres un analizador de sentimiento para comentarios de empleados corporativos.
Clasifica el sentimiento y extrae los temas principales.

REGLAS:
- Clasifica en exactamente uno de: POSITIVO, NEUTRO, NEGATIVO
- Extrae entre 1 y 4 temas clave en español snake_case (ej: "carga_trabajo", "liderazgo")
- Asigna un puntaje de confianza entre 0.0 y 1.0
- Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown

Formato obligatorio:
{"sentiment":"POSITIVO","topics":["tema1","tema2"],"confidence":0.87}`;

  try {
    const { text: raw } = await generateCompletion(`Analiza: "${text}"`, systemPrompt, 256);
    const parsed = safeParseJSON(raw, { sentiment: 'NEUTRO', topics: [], confidence: 0 });
    return { ...parsed, raw };
  } catch {
    return { sentiment: 'NEUTRO', topics: [], confidence: 0, raw: '' };
  }
};

// ── PROYECTO 02: PulseWork ────────────────────────────────────────────────────
/**
 * Analiza el comentario libre del micro-pulso diario.
 * Extrae sentimiento predominante y palabras clave accionables.
 * No retorna nunca información que pueda identificar al empleado.
 * Retorna fallback silencioso si Claude falla — la entrada se guarda igualmente.
 */
export const analyzePulseComment = async (comment) => {
  if (!comment?.trim()) return { sentiment: null, keywords: [], crisisFlag: false };

  const systemPrompt = `Eres un especialista en bienestar organizacional y salud mental laboral que analiza comentarios anónimos de empleados.
Tu tarea es extraer señales accionables para el área de RH Y detectar posibles situaciones de crisis emocional.

REGLAS ESTRICTAS:
- NO identifiques personas, equipos específicos ni nombres propios.
- Clasifica el sentimiento en: POSITIVO, NEUTRO, NEGATIVO.
- Extrae entre 2 y 5 palabras clave que representen los temas de fondo (snake_case, español).
  Palabras clave válidas: carga_trabajo, liderazgo, comunicacion, ambiente, reconocimiento,
  equilibrio_vida, procesos, herramientas, compañerismo, incertidumbre, burnout, motivacion,
  estres_severo, ansiedad, depresion, agotamiento_extremo, crisis_personal.
- Activa crisisFlag: true ÚNICAMENTE si el comentario contiene señales claras de:
  estrés severo o crónico, ansiedad, depresión, agotamiento extremo (burnout avanzado),
  desesperanza, crisis personal, o cualquier indicador que requiera atención de salud mental urgente.
  En caso de duda, deja crisisFlag: false.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional.

Formato obligatorio:
{"sentiment":"NEGATIVO","keywords":["estres_severo","agotamiento_extremo"],"crisisFlag":true}`;

  try {
    const { text: raw } = await generateCompletion(
      `Comentario del empleado: "${comment}"`,
      systemPrompt,
      256
    );
    return safeParseJSON(raw, { sentiment: null, keywords: [], crisisFlag: false });
  } catch {
    return { sentiment: null, keywords: [], crisisFlag: false };
  }
};

// ── PROYECTO 03: eNPS ─────────────────────────────────────────────────────────
/**
 * Categoriza ambos comentarios abiertos del formulario eNPS.
 * Asigna una categoría a cada uno para facilitar el análisis agregado del dashboard.
 * Retorna fallback silencioso si Claude falla — la respuesta se guarda igualmente.
 */
export const categorizeENPSComments = async (valuedComment, improvementComment) => {
  const hasValued      = !!valuedComment?.trim();
  const hasImprovement = !!improvementComment?.trim();

  if (!hasValued && !hasImprovement) {
    return { valuedCategory: null, improvementCategory: null };
  }

  const systemPrompt = `Eres un analista de clima organizacional. Clasificas comentarios de empleados
en categorías estándar para facilitar el análisis de tendencias.

CATEGORÍAS VÁLIDAS (usa exactamente uno de estos valores):
liderazgo | beneficios | ambiente | crecimiento_profesional | comunicacion | procesos | cultura | otro

REGLAS:
- Asigna la categoría que mejor capture el tema central de cada comentario.
- Si un comentario está vacío o es null, asigna null a su categoría.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional.

Formato obligatorio:
{"valuedCategory":"ambiente","improvementCategory":"beneficios"}`;

  const userPrompt = `Comentario positivo (lo que el empleado valora): ${hasValued ? `"${valuedComment}"` : 'null'}
Comentario de mejora (lo que mejoraría): ${hasImprovement ? `"${improvementComment}"` : 'null'}`;

  try {
    const { text: raw } = await generateCompletion(userPrompt, systemPrompt, 256);
    return safeParseJSON(raw, { valuedCategory: null, improvementCategory: null });
  } catch {
    return { valuedCategory: null, improvementCategory: null };
  }
};

// ── PROYECTO 04: Performance ──────────────────────────────────────────────────
/**
 * Prepara la agenda de la reunión 1:1 basándose en el avance de metas
 * y compromisos anteriores. Diseñado para el módulo de Performance Review.
 */
export const prepare1on1Meeting = async (goalsProgress, pastCommitments) => {
  const systemPrompt = `Eres un coach de desempeño organizacional experto en metodologías OKR y KPI.
Tu rol es preparar agendas de reuniones 1:1 efectivas basadas en datos reales de avance.

REGLAS:
- Sé específico con los números y porcentajes de avance.
- Identifica riesgos reales (metas con bajo avance y fecha próxima).
- Los compromisos pendientes deben tener seguimiento explícito.
- Usa un tono constructivo y orientado al desarrollo, no al control.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional.

Formato obligatorio:
{
  "suggestedTopics": ["string con contexto numérico", ...],
  "keyFindings": ["hallazgo concreto", ...],
  "recommendedActions": ["acción específica y accionable", ...],
  "riskFlags": ["alerta si existe una meta en riesgo", ...]
}`;

  const goalsText = goalsProgress.map((g) => {
    const pct = g.targetValue > 0
      ? Math.round((g.currentValue / g.targetValue) * 100)
      : 0;
    return `• [${g.type}] ${g.title}: ${g.currentValue}/${g.targetValue} ${g.unit ?? ''} (${pct}%) — Estado: ${g.status} — Vence: ${g.dueDate ?? 'sin fecha'}`;
  }).join('\n');

  const commitmentsText = pastCommitments?.length
    ? pastCommitments.map((c) =>
        `• ${c.commitment} — Vencía: ${c.dueDate ?? 'N/A'} — Completado: ${c.completed ? 'Sí' : 'No'}`
      ).join('\n')
    : 'Sin compromisos registrados del período anterior.';

  const userPrompt = `AVANCE DE METAS DEL PERÍODO:
${goalsText}

COMPROMISOS PREVIOS:
${commitmentsText}`;

  try {
    const { text: raw } = await generateCompletion(userPrompt, systemPrompt, 1024);
    return safeParseJSON(raw, {
      suggestedTopics: [],
      keyFindings: [],
      recommendedActions: [],
      riskFlags: [],
    });
  } catch {
    return { suggestedTopics: [], keyFindings: [], recommendedActions: [], riskFlags: [] };
  }
};

// ── Dashboard: Detección de patrones emocionales ──────────────────────────────
/**
 * Analiza datos agregados de una área y detecta patrones negativos sostenidos.
 * Usado por el endpoint de alertas del dashboard de PulseWork.
 */
export const detectEmotionalPatterns = async (areaName, stats, topKeywords) => {
  const systemPrompt = `Eres un especialista en bienestar organizacional que interpreta datos de clima laboral.
Analiza los indicadores de una área y determina si existe una alerta de bienestar.

NIVELES DE ALERTA:
- CRITICO: Promedio ≤ 2.0 o más del 50% de entradas negativas en los últimos 7 días.
- MODERADO: Promedio entre 2.1 y 2.9 o tendencia descendente sostenida.
- BAJO: Promedio entre 3.0 y 3.4.
- NORMAL: Promedio ≥ 3.5.

REGLAS:
- Basa tu análisis ÚNICAMENTE en los datos proporcionados.
- No asumas causas externas no presentes en los datos.
- Las recomendaciones deben ser acciones concretas para el área de RH.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional.

Formato obligatorio:
{
  "alertLevel": "CRITICO|MODERADO|BAJO|NORMAL",
  "summary": "Descripción concisa del patrón detectado",
  "mainConcerns": ["preocupación 1", "preocupación 2"],
  "recommendations": ["acción concreta para RH 1", "acción 2"]
}`;

  const userPrompt = `ÁREA: ${areaName}

ESTADÍSTICAS (últimos 30 días):
- Total de registros: ${stats.total}
- Promedio de bienestar (1-5): ${stats.avgScore}
- Entradas con sentimiento NEGATIVO: ${stats.negativeCount} (${stats.negativePct}%)
- Entradas con sentimiento POSITIVO: ${stats.positiveCount} (${stats.positivePct}%)
- Tendencia de la última semana vs semana anterior: ${stats.weekTrend}

TEMAS MÁS FRECUENTES EN COMENTARIOS NEGATIVOS:
${topKeywords.length ? topKeywords.join(', ') : 'Sin comentarios suficientes'}`;

  try {
    const { text: raw } = await generateCompletion(userPrompt, systemPrompt, 512);
    return safeParseJSON(raw, {
      alertLevel: 'NORMAL',
      summary: 'No fue posible generar el análisis automático.',
      mainConcerns: [],
      recommendations: [],
    });
  } catch {
    return {
      alertLevel: 'NORMAL',
      summary: 'Error al procesar análisis IA.',
      mainConcerns: [],
      recommendations: [],
    };
  }
};

// ── Dashboard: Resumen ejecutivo eNPS ─────────────────────────────────────────
/**
 * Genera un resumen ejecutivo de una encuesta eNPS completa.
 * Analiza todos los comentarios recopilados y extrae hallazgos clave.
 */
export const generateENPSExecutiveSummary = async (surveyStats, comments) => {
  const systemPrompt = `Eres un analista de RH experto en metodología eNPS (Employee Net Promoter Score).
Tu tarea es generar un resumen ejecutivo claro y accionable para la alta gerencia.

REGLAS:
- El resumen debe ser profesional y orientado a la toma de decisiones.
- Identifica los temas más frecuentes por separado en comentarios positivos y de mejora.
- Detecta patrones cross-área si los datos los sugieren.
- Responde ÚNICAMENTE con JSON válido, sin texto adicional.

Formato obligatorio:
{
  "overallAssessment": "Párrafo ejecutivo de 2-3 oraciones",
  "positiveThemes": ["tema positivo recurrente 1", "tema 2"],
  "improvementThemes": ["área de mejora recurrente 1", "área 2"],
  "keyInsights": ["hallazgo estratégico 1", "hallazgo 2"],
  "recommendedActions": ["acción prioritaria 1", "acción 2"]
}`;

  const commentBlock = comments.length
    ? comments
        .map((c, i) => `[${i + 1}] Valora: "${c.valued ?? '—'}" | Mejoraría: "${c.improvement ?? '—'}"`)
        .join('\n')
    : 'Sin comentarios registrados.';

  const userPrompt = `RESULTADOS DE ENCUESTA eNPS

Estadísticas generales:
- Total de respuestas: ${surveyStats.total}
- eNPS Score: ${surveyStats.enpsScore} (Promotores: ${surveyStats.promotersPct}% | Pasivos: ${surveyStats.passivesPct}% | Detractores: ${surveyStats.detractorsPct}%)
- Promedio Likert general: ${surveyStats.avgLikert}

COMENTARIOS RECOPILADOS (anonimizados):
${commentBlock}`;

  try {
    const { text: raw } = await generateCompletion(userPrompt, systemPrompt, 1024);
    return safeParseJSON(raw, {
      overallAssessment: 'No fue posible generar el resumen automático.',
      positiveThemes: [],
      improvementThemes: [],
      keyInsights: [],
      recommendedActions: [],
    });
  } catch {
    return {
      overallAssessment: 'Error al procesar el resumen IA.',
      positiveThemes: [],
      improvementThemes: [],
      keyInsights: [],
      recommendedActions: [],
    };
  }
};
