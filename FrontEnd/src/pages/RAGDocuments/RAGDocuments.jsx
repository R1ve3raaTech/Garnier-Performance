import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { showSuccess, showError, showConfirm } from '../../utils/alerts';

// Documentos base de la knowledge base (hardcoded — siempre presentes)
const BASE_DOCS = [
  { id: 'b1', original_name: 'Manual de Empleados Garnier 2025',      status: 'active', sections: ['Política de Vacaciones', 'Permisos y Ausencias', 'Paquete de Compensación'], isBase: true },
  { id: 'b2', original_name: 'Reglamento Interno de Trabajo Garnier', status: 'active', sections: ['Jornada Laboral', 'Evaluación del Desempeño'],                               isBase: true },
  { id: 'b3', original_name: 'Política de Capacitación y Desarrollo', status: 'active', sections: ['Presupuesto de Capacitación'],                                               isBase: true },
];

const STATUS_STYLE = {
  active:     { badge: 'bg-brand-100 text-brand-700',  label: 'Activo',       icon: 'fi-rr-check-circle'  },
  processing: { badge: 'bg-amber-100 text-amber-700',  label: 'Indexando...', icon: 'fi-rr-spinner'       },
  error:      { badge: 'bg-red-100   text-red-700',    label: 'Error',        icon: 'fi-rr-exclamation'   },
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RAGDocuments = () => {
  const [uploaded,   setUploaded]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [dragging,   setDragging]   = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const inputRef = useRef(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/rag');
      setUploaded(res.data.data ?? []);
    } catch {
      // silencioso — los docs base siempre se muestran
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  // Refresca documentos en estado 'processing' cada 4 segundos
  useEffect(() => {
    const hasProcessing = uploaded.some((d) => d.status === 'processing');
    if (!hasProcessing) return;
    const timer = setTimeout(fetchDocs, 4000);
    return () => clearTimeout(timer);
  }, [uploaded]);

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      showError('Formato no permitido', 'Solo se aceptan archivos PDF o DOCX.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Archivo muy grande', 'El tamaño máximo permitido es 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      await api.post('/rag', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showSuccess('Documento recibido', 'El archivo se está indexando en la base de conocimiento.');
      await fetchDocs();
    } catch (err) {
      showError('Error al subir', err.response?.data?.error?.message ?? 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    const result = await showConfirm('¿Eliminar documento?', `"${doc.original_name}" será removido de la base de conocimiento.`);
    if (!result.isConfirmed) return;

    setDeletingId(doc.id);
    try {
      await api.delete(`/rag/${doc.id}`);
      showSuccess('Documento eliminado', 'Ya no estará disponible para el HR Assistant.');
      await fetchDocs();
    } catch (err) {
      showError('Error', err.response?.data?.error?.message ?? 'No se pudo eliminar el documento');
    } finally {
      setDeletingId(null);
    }
  };

  const allDocs = [...BASE_DOCS, ...uploaded];

  return (
    <motion.div
      className="p-8 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-7 bg-brand-500 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-garnier-800">Gestión RAG</h1>
            <p className="text-gray-500 text-sm">Documentos indexados en la base de conocimiento del HR Assistant</p>
          </div>
        </div>
        <motion.button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          whileHover={!uploading ? { scale: 1.03 } : {}}
          whileTap={!uploading ? { scale: 0.97 } : {}}
          className="btn-primary flex items-center gap-2"
        >
          {uploading
            ? <><i className="fi fi-rr-spinner animate-spin leading-none" /> Subiendo...</>
            : <><i className="fi fi-rr-upload leading-none" /> Subir documento</>
          }
        </motion.button>
        <input
          ref={inputRef} type="file" accept=".pdf,.docx" className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
      </div>

      {/* Zona de drag & drop */}
      <motion.div
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        animate={dragging ? { scale: 1.01 } : { scale: 1 }}
      >
        <i className={`fi fi-rr-cloud-upload text-3xl leading-none block mb-2 ${dragging ? 'text-brand-500' : 'text-gray-300'}`} />
        <p className="text-sm font-medium text-garnier-800">
          {dragging ? 'Suelta el archivo aquí' : 'Arrastra un PDF o DOCX aquí'}
        </p>
        <p className="text-xs text-gray-400 mt-1">O haz clic para seleccionar — máx. 10 MB</p>
      </motion.div>

      {/* Lista de documentos */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <i className="fi fi-rr-spinner animate-spin text-2xl leading-none" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
            {allDocs.length} documento{allDocs.length !== 1 ? 's' : ''} en la base de conocimiento
          </p>

          <AnimatePresence>
            {allDocs.map((doc) => {
              const st = STATUS_STYLE[doc.status] ?? STATUS_STYLE.active;
              const isDeleting = deletingId === doc.id;
              return (
                <motion.div
                  key={doc.id}
                  className="card hover:border-brand-200 transition-colors"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  layout
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fi fi-rr-document text-brand-500 text-base leading-none" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-garnier-800 text-sm truncate">{doc.original_name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${st.badge}`}>
                            <i className={`fi ${st.icon} ${doc.status === 'processing' ? 'animate-spin' : ''} leading-none`} />
                            {st.label}
                          </span>
                          {doc.isBase && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-garnier-800 text-white font-medium">Base</span>
                          )}
                        </div>

                        {doc.file_size && (
                          <p className="text-xs text-gray-400 mb-1">{formatSize(doc.file_size)}</p>
                        )}

                        {doc.sections?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(doc.sections) ? doc.sections : JSON.parse(doc.sections)).map((s) => (
                              <span key={s} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {!doc.isBase && (
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={isDeleting}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                        title="Eliminar documento"
                      >
                        {isDeleting
                          ? <i className="fi fi-rr-spinner animate-spin leading-none" />
                          : <i className="fi fi-rr-trash leading-none" />
                        }
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default RAGDocuments;
