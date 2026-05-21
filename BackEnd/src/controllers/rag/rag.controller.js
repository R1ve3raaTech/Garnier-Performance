import path    from 'path';
import fs      from 'fs';
import { fileURLToPath } from 'url';
import multer  from 'multer';
import pool    from '../../config/db.js';

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
    const [rows] = await pool.execute(
      `SELECT r.id, r.original_name, r.file_size, r.mime_type,
              r.status, r.sections, r.created_at,
              u.name AS uploaded_by_name
       FROM   rag_documents r
       JOIN   users u ON r.uploaded_by = u.id
       ORDER  BY r.created_at DESC`
    );
    res.json({ success: true, data: rows });
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

    const [result] = await pool.execute(
      `INSERT INTO rag_documents (original_name, filename, file_size, mime_type, status, uploaded_by)
       VALUES (?, ?, ?, ?, 'processing', ?)`,
      [originalname, filename, size, mimetype, req.user.id]
    );

    const docId = result.insertId;

    // Simula el procesamiento de indexación (en producción sería un job asíncrono)
    setTimeout(async () => {
      try {
        await pool.execute(
          `UPDATE rag_documents SET status = 'active', sections = ? WHERE id = ?`,
          [JSON.stringify(['Sección detectada automáticamente']), docId]
        );
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

    const [rows] = await pool.execute(
      'SELECT filename FROM rag_documents WHERE id = ?', [id]
    );
    if (!rows.length) {
      const err = new Error('Documento no encontrado'); err.status = 404; return next(err);
    }

    // Eliminar archivo del disco
    const filePath = path.join(UPLOAD_DIR, rows[0].filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.execute('DELETE FROM rag_documents WHERE id = ?', [id]);
    res.json({ success: true, message: 'Documento eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
