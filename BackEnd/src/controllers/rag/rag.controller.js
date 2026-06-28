import path    from 'path';
import fs      from 'fs';
import { fileURLToPath } from 'url';
import multer  from 'multer';
import supabase from '../../config/supabaseClient.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Configuración de Multer ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(Object.assign(new Error('Solo se permiten archivos PDF o DOCX'), { status: 422 }));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── GET /api/v1/rag/documents ─────────────────────────────────────────────────
export const getDocuments = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rag_documents')
      .select('id, original_name, file_size, mime_type, status, sections, created_at, profiles(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    res.json({
      success: true,
      data: data.map((d) => ({ ...d, uploaded_by_name: d.profiles?.name, profiles: undefined })),
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/rag/documents ────────────────────────────────────────────────
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No se recibió ningún archivo');
      err.status = 400;
      return next(err);
    }

    const { originalname, filename, size, mimetype } = req.file;

    const { data, error } = await supabase.from('rag_documents').insert({
      original_name: originalname, filename, file_size: size, mime_type: mimetype,
      status: 'processing', uploaded_by: req.user.id,
    }).select('id').single();
    if (error) throw error;

    const docId = data.id;

    // Simula el procesamiento de indexación (en producción sería un job asíncrono)
    setTimeout(async () => {
      try {
        await supabase.from('rag_documents')
          .update({ status: 'active', sections: ['Sección detectada automáticamente'] })
          .eq('id', docId);
      } catch { /* fallo silencioso del job simulado */ }
    }, 3000);

    res.status(201).json({
      success: true,
      message: 'Documento recibido. Se está indexando en la base de conocimiento.',
      data: { documentId: docId, filename: originalname, status: 'processing' },
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/rag/documents/:id ─────────────────────────────────────────
export const deleteDocument = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const { data: rows, error: findError } = await supabase
      .from('rag_documents').select('filename').eq('id', id);
    if (findError) throw findError;
    if (!rows.length) {
      const err = new Error('Documento no encontrado'); err.status = 404; return next(err);
    }

    const filePath = path.join(UPLOAD_DIR, rows[0].filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const { error } = await supabase.from('rag_documents').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Documento eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
