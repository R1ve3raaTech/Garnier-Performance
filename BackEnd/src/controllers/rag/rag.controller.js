import multer  from 'multer';
import supabase from '../../config/supabaseClient.js';

const BUCKET = 'rag-documents';

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
  storage: multer.memoryStorage(),
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

    const { originalname, buffer, size, mimetype } = req.file;
    const ext      = originalname.includes('.') ? originalname.slice(originalname.lastIndexOf('.')) : '';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: mimetype, upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase.from('rag_documents').insert({
      original_name: originalname, filename, file_size: size, mime_type: mimetype,
      status: 'processing', uploaded_by: req.user.id,
    }).select('id').single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([filename]);
      throw error;
    }

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

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([rows[0].filename]);
    if (storageError) throw storageError;

    const { error } = await supabase.from('rag_documents').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Documento eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
