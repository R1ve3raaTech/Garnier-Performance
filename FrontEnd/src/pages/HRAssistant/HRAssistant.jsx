import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ONBOARDING_STEPS = [
  {
    id: 'topic',
    question: '¿Sobre qué tema es tu consulta?',
    options: [
      { label: 'Beneficios y salarios',  value: 'Beneficios y salarios',  icon: 'fi-rr-sack-dollar'  },
      { label: 'Políticas y permisos',   value: 'Políticas y permisos',   icon: 'fi-rr-document'      },
      { label: 'Desempeño y metas',      value: 'Desempeño y metas',      icon: 'fi-rr-bullseye'      },
      { label: 'Otro tema',              value: 'Otro',                   icon: 'fi-rr-question'      },
    ],
  },
  {
    id: 'urgency',
    question: '¿Con qué urgencia necesitas la respuesta?',
    options: [
      { label: 'Es urgente',  value: 'Urgente', icon: 'fi-rr-alarm-exclamation' },
      { label: 'Es general',  value: 'General', icon: 'fi-rr-comment-alt'       },
    ],
  },
  {
    id: 'isManager',
    question: '¿Cuál es tu situación en la empresa?',
    options: [
      { label: 'Colaborador individual', value: false, icon: 'fi-rr-user'  },
      { label: 'Tengo personas a cargo', value: true,  icon: 'fi-rr-users' },
    ],
  },
];

const Message = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="max-w-[78%]">
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
              <i className="fi fi-rr-robot text-white text-[10px] leading-none" />
            </div>
            <p className="text-xs text-gray-400">Garnier HR Assistant</p>
          </div>
        )}

        <div className={`rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-brand-500 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 shadow-sm text-garnier-800 rounded-tl-sm'
        }`}>
          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
        </div>

        {/* Botones de opciones onboarding */}
        {msg.options && (
          <div className="mt-2 flex flex-wrap gap-2 ml-1">
            {msg.options.map((opt) => (
              <motion.button
                key={String(opt.value)}
                onClick={() => msg.onSelect(opt)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-300 hover:bg-brand-50 hover:border-brand-500 text-brand-700 text-xs font-medium rounded-full transition-all shadow-sm"
              >
                <i className={`fi ${opt.icon} leading-none`} />
                {opt.label}
              </motion.button>
            ))}
          </div>
        )}

        {/* Fuentes */}
        {msg.sources?.length > 0 && (
          <div className="mt-2 space-y-1">
            {msg.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-1 ml-1">
                <i className="fi fi-rr-document text-brand-500 text-xs leading-none" />
                <p className="text-xs text-brand-600">{s.document} — {s.section}</p>
              </div>
            ))}
          </div>
        )}
        {msg.escalated && (
          <div className="flex items-center gap-1 ml-1 mt-1">
            <i className="fi fi-rr-triangle-warning text-amber-500 text-xs leading-none" />
            <p className="text-xs text-amber-600">Consulta derivada a RH para seguimiento</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const HRAssistant = () => {
  const { user } = useAuth();
  const [messages,       setMessages]       = useState([]);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [userContext,    setUserContext]     = useState({});
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [prevSession,    setPrevSession]    = useState(null); // { messages, sessionId }
  const bottomRef     = useRef(null);
  const initialized   = useRef(false);
  const sessionId     = useRef(Date.now().toString(36) + Math.random().toString(36).slice(2));

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    api.get('/hr-assistant/history').then(({ data }) => {
      const msgs = data.data?.messages ?? [];
      const sid  = data.data?.lastSession;
      if (msgs.length > 0 && sid) {
        setPrevSession({ messages: msgs, sessionId: sid });
      } else {
        showNextQuestion(0, {});
      }
    }).catch(() => {
      showNextQuestion(0, {});
    }).finally(() => {
      setHistoryLoading(false);
    });
  }, []);

  const restoreSession = () => {
    if (!prevSession) return;
    sessionId.current = prevSession.sessionId;
    const restored = prevSession.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.content,
      sources: m.sources ?? [],
      escalated: !!m.escalated,
    }));
    setMessages(restored);
    setOnboardingStep(ONBOARDING_STEPS.length);
    setPrevSession(null);
  };

  const startNewSession = () => {
    setPrevSession(null);
    showNextQuestion(0, {});
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const addMessage = (msg) =>
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);

  const showNextQuestion = (step, context) => {
    if (step === 0) {
      addMessage({
        role: 'assistant',
        text: `¡Hola${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋 Soy el Asistente Digital de RH de Garnier.\nPara darte la mejor respuesta posible, primero quiero conocer un poco más tu consulta.`,
      });
    }
    if (step < ONBOARDING_STEPS.length) {
      const stepDef = ONBOARDING_STEPS[step];
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          text: `${step + 1}/3 — ${stepDef.question}`,
          options: stepDef.options,
          onSelect: (opt) => handleOnboardingSelect(step, stepDef.id, opt, context),
        });
      }, step === 0 ? 600 : 300);
    } else {
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          text: '¡Perfecto! Ya tengo el contexto que necesito. ¿Cuál es tu consulta? Puedo responder sobre políticas, beneficios, permisos, vacaciones y más.',
        });
      }, 300);
    }
  };

  const handleOnboardingSelect = (step, fieldId, opt, prevContext) => {
    addMessage({ role: 'user', text: opt.label });
    setMessages((prev) =>
      prev.map((m) =>
        m.options && m.text.startsWith(`${step + 1}/3`) ? { ...m, options: null } : m
      )
    );
    const newContext = { ...prevContext, [fieldId]: opt.value };
    setUserContext(newContext);
    const nextStep = step + 1;
    setOnboardingStep(nextStep);
    showNextQuestion(nextStep, newContext);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    addMessage({ role: 'user', text: question });
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/hr-assistant/query', {
        question,
        userContext,
        sessionId: sessionId.current, // persiste el historial en BD
      });
      const { answer, sources, escalated } = data.data;
      addMessage({ role: 'assistant', text: answer, sources, escalated });
    } catch {
      addMessage({ role: 'assistant', text: 'Ocurrió un error al procesar tu consulta. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const inputEnabled = onboardingStep >= ONBOARDING_STEPS.length;

  if (historyLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (prevSession) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <i className="fi fi-rr-time-past text-brand-500 text-2xl leading-none" />
          </div>
          <h2 className="text-lg font-bold text-garnier-800 mb-2">Tienes una conversación anterior</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tienes {prevSession.messages.length} mensaje{prevSession.messages.length !== 1 ? 's' : ''} guardados de tu última sesión con el HR Assistant.
          </p>
          <div className="space-y-3">
            <button
              onClick={restoreSession}
              className="w-full px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <i className="fi fi-rr-redo leading-none" />
              Retomar conversación
            </button>
            <button
              onClick={startNewSession}
              className="w-full px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <i className="fi fi-rr-add leading-none" />
              Iniciar nueva conversación
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <i className="fi fi-rr-robot text-white text-lg leading-none" />
          </div>
          <div>
            <h1 className="text-base font-bold text-garnier-800">HR Assistant</h1>
            <p className="text-xs text-gray-400">Garnier · {user?.area_name}</p>
          </div>
        </div>
        {inputEnabled && (
          <motion.span
            className="flex items-center gap-1.5 text-xs px-3 py-1 bg-brand-100 text-brand-700 rounded-full font-medium"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            En línea
          </motion.span>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence>
          {messages.map((msg) => <Message key={msg.id} msg={msg} />)}
        </AnimatePresence>

        {loading && (
          <motion.div
            className="flex justify-start mb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-6 py-4 bg-white border-t border-gray-100">
        {!inputEnabled ? (
          <p className="text-center text-xs text-gray-400 py-1 flex items-center justify-center gap-1">
            <i className="fi fi-rr-arrow-up leading-none" />
            Responde las 3 preguntas para activar el chat
          </p>
        ) : (
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta sobre políticas, beneficios, vacaciones..."
              className="input flex-1"
              disabled={loading}
              autoFocus
            />
            <motion.button
              type="submit"
              disabled={loading || !input.trim()}
              whileHover={!loading && input.trim() ? { scale: 1.05 } : {}}
              whileTap={!loading && input.trim() ? { scale: 0.95 } : {}}
              className="btn-primary px-5 flex items-center gap-2"
            >
              <i className="fi fi-rr-paper-plane leading-none" />
              Enviar
            </motion.button>
          </div>
        )}
      </form>
    </motion.div>
  );
};

export default HRAssistant;
