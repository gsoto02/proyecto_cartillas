import express from 'express';
import { pool } from './db.js';
import { autenticar, crearToken, esSolicitudSegura, hashToken, permitir, tokenSesion, verificarContrasena } from './auth.js';

export const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(esSolicitudSegura);

const estadosRegistro = ['pendiente', 'en_proceso', 'revision', 'aprobado'];
const tiposCampo = ['texto', 'numero', 'fecha', 'seleccion', 'medicion', 'tabla', 'firma'];

const numero = (value: string | string[]): number | null => {
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const respuestaValida = (tipo: string, valor: unknown, opciones: string[]): boolean => {
  if (tipo === 'texto') return typeof valor === 'string';
  if (tipo === 'numero') return typeof valor === 'number' && Number.isFinite(valor);
  if (tipo === 'fecha') return typeof valor === 'string' && !Number.isNaN(Date.parse(valor));
  if (tipo === 'seleccion') return typeof valor === 'string' && opciones.includes(valor);
  if (tipo === 'medicion') return Boolean(valor && typeof valor === 'object' && typeof (valor as { valor?: unknown }).valor === 'number' && typeof (valor as { unidad?: unknown }).unidad === 'string');
  if (tipo === 'tabla') return Array.isArray(valor) && valor.every((fila) => fila && typeof fila === 'object' && !Array.isArray(fila));
  if (tipo === 'firma') return typeof valor === 'string' && valor.startsWith('data:image/');
  return false;
};

app.post('/api/auth/login', async (request, response) => {
  const { usuario, contrasena } = request.body as { usuario?: unknown; contrasena?: unknown };
  if (typeof usuario !== 'string' || typeof contrasena !== 'string') return response.status(400).json({ error: 'Credenciales inválidas' });
  try {
    const { rows } = await pool.query('SELECT id, contrasena_hash FROM auth.usuarios WHERE (nombre_usuario=$1 OR correo=$1) AND activo', [usuario]);
    if (!rows[0] || !verificarContrasena(contrasena, rows[0].contrasena_hash)) return response.status(401).json({ error: 'Credenciales inválidas' });
    const token = crearToken(); const expira = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await pool.query('INSERT INTO auth.sesiones(usuario_id,token_hash,expira_en) VALUES($1,$2,$3)', [rows[0].id, hashToken(token), expira]);
    response.cookie('unna_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: expira, path: '/' });
    response.status(204).end();
  } catch { response.status(503).json({ error: 'database unavailable' }); }
});
app.post('/api/auth/logout', autenticar, async (request, response) => { await pool.query('UPDATE auth.sesiones SET revocada_en=CURRENT_TIMESTAMP WHERE usuario_id=$1 AND token_hash=$2', [request.usuario!.id, hashToken(tokenSesion(request)!)]); response.clearCookie('unna_session', { path: '/' }).status(204).end(); });
app.get('/api/auth/me', autenticar, (request, response) => response.json(request.usuario));

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.status(200).json({ api: 'ok', database: 'ok' });
  } catch {
    response.status(503).json({ api: 'ok', database: 'unavailable' });
  }
});

app.get('/api/cartillas/plantillas', autenticar, permitir('tecnico', 'responsable', 'supervisor', 'administrador'), async (_request, response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.codigo, p.nombre, p.activo, c.nombre AS categoria,
             v.id AS version_id, v.numero AS version, v.estado
      FROM cartillas.plantillas p
      JOIN cartillas.categorias c ON c.id = p.categoria_id
      JOIN cartillas.versiones v ON v.plantilla_id = p.id
      WHERE p.activo = TRUE AND v.activo = TRUE
      ORDER BY p.nombre, v.numero DESC
    `);
    response.status(200).json(rows);
  } catch {
    response.status(503).json({ error: 'database unavailable' });
  }
});

app.get('/api/mantenimientos/:mantenimientoId/cartillas', autenticar, permitir('tecnico', 'responsable', 'supervisor', 'administrador'), async (request, response) => {
  const mantenimientoId = numero(request.params.mantenimientoId);
  if (!mantenimientoId) return response.status(400).json({ error: 'Identificador inválido' });
  try {
    const mantenimiento = await pool.query(`SELECT m.id, m.descripcion, m.programado_para, m.realizado_en,
      t.id AS tren_id, t.codigo AS tren_codigo FROM mantenimiento.mantenimientos m
      LEFT JOIN flota.trenes t ON t.id = m.tren_id WHERE m.id = $1 AND m.activo`, [mantenimientoId]);
    if (!mantenimiento.rows[0]) return response.status(404).json({ error: 'Mantenimiento no encontrado' });
    const { rows } = await pool.query(`
      SELECT p.id AS "plantillaId", v.id AS "versionId", p.nombre,
        r.id AS "registroId", COALESCE(r.estado, 'pendiente') AS estado, r.actualizado_en AS "actualizadoEn"
      FROM cartillas.plantillas p JOIN cartillas.versiones v ON v.plantilla_id = p.id
      LEFT JOIN LATERAL (SELECT id, estado, actualizado_en FROM cartillas.registros
        WHERE mantenimiento_id = $1 AND plantilla_id = p.id AND version_id = v.id AND activo ORDER BY actualizado_en DESC LIMIT 1) r ON TRUE
      WHERE p.activo AND v.activo ORDER BY p.nombre, v.numero DESC`, [mantenimientoId]);
    response.json({ mantenimiento: mantenimiento.rows[0], cartillas: rows });
  } catch { response.status(503).json({ error: 'database unavailable' }); }
});

app.get('/api/cartillas/plantillas/:plantillaId/versiones/:versionId', autenticar, permitir('tecnico', 'responsable', 'supervisor', 'administrador'), async (request, response) => {
  const plantillaId = numero(request.params.plantillaId);
  const versionId = numero(request.params.versionId);
  if (!plantillaId || !versionId) return response.status(400).json({ error: 'Identificadores inválidos' });
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.codigo, p.nombre, v.id AS version_id, v.numero, v.estado,
             v.documento_configuracion AS documento_configuracion,
             COALESCE(jsonb_agg(jsonb_build_object(
               'id', s.id, 'titulo', s.titulo, 'descripcion', s.descripcion, 'orden', s.orden,
               'campos', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                 'id', f.id, 'codigo', f.codigo, 'etiqueta', f.etiqueta, 'tipo', f.tipo,
                 'obligatorio', f.obligatorio, 'orden', f.orden, 'configuracion', f.configuracion,
                 'opciones', COALESCE((SELECT jsonb_agg(jsonb_build_object('valor', o.valor, 'etiqueta', o.etiqueta, 'orden', o.orden) ORDER BY o.orden)
                   FROM cartillas.opciones_campo o WHERE o.campo_id = f.id AND o.activo), '[]'::jsonb)
               ) ORDER BY f.orden) FROM cartillas.campos f WHERE f.seccion_id = s.id AND f.activo), '[]'::jsonb)
             ) ORDER BY s.orden) FILTER (WHERE s.id IS NOT NULL), '[]'::jsonb) AS secciones
      FROM cartillas.plantillas p
      JOIN cartillas.versiones v ON v.plantilla_id = p.id
      LEFT JOIN cartillas.secciones s ON s.version_id = v.id AND s.activo
      WHERE p.id = $1 AND v.id = $2 AND p.activo AND v.activo
      GROUP BY p.id, v.id
    `, [plantillaId, versionId]);
    if (!rows[0]) return response.status(404).json({ error: 'Plantilla o versión no encontrada' });
    response.json(rows[0]);
  } catch { response.status(503).json({ error: 'database unavailable' }); }
});

app.post('/api/cartillas/registros', autenticar, permitir('tecnico', 'responsable', 'administrador'), async (request, response) => {
  const { plantillaId, versionId, mantenimientoId } = request.body as { plantillaId?: unknown; versionId?: unknown; mantenimientoId?: unknown };
  if (!Number.isSafeInteger(plantillaId) || !Number.isSafeInteger(versionId)) return response.status(400).json({ error: 'plantillaId y versionId son obligatorios' });
  try {
    const version = await pool.query(`SELECT v.id FROM cartillas.versiones v
      JOIN cartillas.plantillas p ON p.id = v.plantilla_id
      WHERE v.id = $1 AND v.plantilla_id = $2 AND v.activo AND p.activo`, [versionId, plantillaId]);
    if (!version.rows[0]) return response.status(400).json({ error: 'La versión no pertenece a la plantilla' });
    const { rows } = await pool.query(`INSERT INTO cartillas.registros (plantilla_id, version_id, mantenimiento_id, estado)
      VALUES ($1, $2, $3, 'pendiente') RETURNING id, plantilla_id, version_id, estado, creado_en`, [plantillaId, versionId, Number.isSafeInteger(mantenimientoId) ? mantenimientoId : null]);
    response.status(201).json(rows[0]);
  } catch { response.status(503).json({ error: 'database unavailable' }); }
});

app.get('/api/cartillas/registros/:registroId', autenticar, permitir('tecnico', 'responsable', 'supervisor', 'administrador'), async (request, response) => {
  const registroId = numero(request.params.registroId);
  if (!registroId) return response.status(400).json({ error: 'Identificador inválido' });
  try {
    const registro = await pool.query(`SELECT r.id, r.plantilla_id, r.version_id, r.estado, r.creado_en, r.actualizado_en,
      COALESCE((SELECT jsonb_object_agg(campo_id, valor) FROM cartillas.respuestas WHERE registro_id = r.id), '{}'::jsonb) AS respuestas,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'campoId', campo_id, 'detalle', detalle, 'resueltaEn', resuelta_en, 'creadoEn', creado_en) ORDER BY creado_en) FROM cartillas.observaciones WHERE registro_id = r.id AND activo), '[]'::jsonb) AS observaciones,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'archivoId', e.archivo_id, 'nombre', a.nombre_original, 'ruta', a.ruta, 'descripcion', e.descripcion) ORDER BY e.creado_en) FROM documentos.evidencias e JOIN documentos.archivos a ON a.id = e.archivo_id WHERE e.registro_id = r.id AND e.activo), '[]'::jsonb) AS evidencias
      FROM cartillas.registros r
      JOIN cartillas.plantillas p ON p.id = r.plantilla_id AND p.activo
      WHERE r.id = $1 AND r.activo`, [registroId]);
    if (!registro.rows[0]) return response.status(404).json({ error: 'Registro no encontrado' });
    response.json(registro.rows[0]);
  } catch { response.status(503).json({ error: 'database unavailable' }); }
});

app.get('/api/cartillas/registros/:registroId/exportar/:formato', autenticar, permitir('tecnico', 'responsable', 'supervisor', 'administrador'), async (request, response) => {
  const registroId = numero(request.params.registroId);
  const formato = request.params.formato;
  if (!registroId || typeof formato !== 'string' || !['xlsx', 'pdf'].includes(formato)) return response.status(400).json({ error: 'Solicitud de exportación inválida' });
  try {
    const registro = await pool.query(`SELECT p.codigo, COALESCE(jsonb_object_agg(rp.campo_id, rp.valor) FILTER (WHERE rp.id IS NOT NULL), '{}'::jsonb) AS respuestas
      FROM cartillas.registros r JOIN cartillas.plantillas p ON p.id = r.plantilla_id
      LEFT JOIN cartillas.respuestas rp ON rp.registro_id = r.id
      WHERE r.id = $1 AND r.activo AND p.activo GROUP BY p.codigo`, [registroId]);
    if (!registro.rows[0]) return response.status(404).json({ error: 'Registro no encontrado' });
    return response.status(409).json({ error: 'La exportación oficial aún se está validando para esta cartilla.' });
  } catch {
    response.status(503).json({ error: 'No se pudo preparar la exportación oficial.' });
  }
});

app.put('/api/cartillas/registros/:registroId/respuestas', autenticar, permitir('tecnico', 'responsable', 'administrador'), async (request, response) => {
  const registroId = numero(request.params.registroId);
  const respuestas = (request.body as { respuestas?: unknown }).respuestas;
  if (!registroId || !Array.isArray(respuestas)) return response.status(400).json({ error: 'Respuestas inválidas' });
  try {
    const campos = await pool.query(`SELECT f.id, f.tipo, f.configuracion, COALESCE(array_agg(o.valor) FILTER (WHERE o.id IS NOT NULL), '{}') AS opciones
      FROM cartillas.registros r JOIN cartillas.plantillas p ON p.id = r.plantilla_id AND p.activo
      JOIN cartillas.secciones s ON s.version_id = r.version_id JOIN cartillas.campos f ON f.seccion_id = s.id
      LEFT JOIN cartillas.opciones_campo o ON o.campo_id = f.id AND o.activo WHERE r.id = $1 AND f.activo GROUP BY f.id`, [registroId]);
    if (!campos.rows.length) {
      const existe = await pool.query(`SELECT 1 FROM cartillas.registros r
        JOIN cartillas.plantillas p ON p.id = r.plantilla_id AND p.activo
        WHERE r.id = $1 AND r.activo`, [registroId]);
      if (!existe.rows[0]) return response.status(404).json({ error: 'Registro no encontrado' });
    }
    const permitidos = new Map(campos.rows.map((campo) => [Number(campo.id), campo]));
    for (const item of respuestas) {
      if (!item || typeof item !== 'object') return response.status(400).json({ error: 'Respuesta inválida' });
      const { campoId, valor } = item as { campoId?: unknown; valor?: unknown };
      const campo = typeof campoId === 'number' ? permitidos.get(campoId) : undefined;
      if (!campo || !tiposCampo.includes(campo.tipo) || !respuestaValida(campo.tipo, valor, campo.opciones)) return response.status(400).json({ error: 'Respuesta no válida para el campo indicado' });
      const reglas = campo.configuracion?.reglas as { requiereObservacionNoConforme?: boolean } | undefined;
      if (campo.tipo === 'tabla' && reglas?.requiereObservacionNoConforme && Array.isArray(valor) && valor.some((fila) => (fila?.resultado === 'no_conforme' || fila?.evaluacion === 'no_conforme') && (typeof fila.observacion !== 'string' || !fila.observacion.trim()))) return response.status(422).json({ error: 'Ingrese una observación para cada resultado No conforme' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of respuestas as Array<{ campoId: number; valor: unknown }>) await client.query(`INSERT INTO cartillas.respuestas (registro_id, campo_id, valor) VALUES ($1, $2, $3)
        ON CONFLICT (registro_id, campo_id) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP`, [registroId, item.campoId, JSON.stringify(item.valor)]);
      await client.query(`UPDATE cartillas.registros SET estado = CASE WHEN estado = 'pendiente' THEN 'en_proceso' ELSE estado END, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1`, [registroId]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    response.status(204).end();
  } catch {
    response.status(503).json({ error: 'database unavailable' });
  }
});

app.patch('/api/cartillas/registros/:registroId/estado', autenticar, permitir('tecnico', 'responsable', 'supervisor', 'administrador'), async (request, response) => {
  const registroId = numero(request.params.registroId);
  const estado = (request.body as { estado?: unknown }).estado;
  if (!registroId || typeof estado !== 'string' || !estadosRegistro.includes(estado)) return response.status(400).json({ error: 'Estado inválido' });
  try {
    if (estado === 'revision' || estado === 'aprobado') {
      const { rows } = await pool.query(`SELECT f.etiqueta FROM cartillas.registros r JOIN cartillas.secciones s ON s.version_id = r.version_id
        JOIN cartillas.campos f ON f.seccion_id = s.id AND f.activo LEFT JOIN cartillas.respuestas rp ON rp.registro_id = r.id AND rp.campo_id = f.id
        JOIN cartillas.plantillas p ON p.id = r.plantilla_id AND p.activo
        WHERE r.id = $1 AND f.obligatorio AND rp.id IS NULL`, [registroId]);
      if (rows.length) return response.status(422).json({ error: 'Faltan campos obligatorios', campos: rows.map((row) => row.etiqueta) });
    }
    const { rows } = await pool.query(`UPDATE cartillas.registros r SET estado = $2, finalizado_en = CASE WHEN $2::varchar = 'aprobado' THEN CURRENT_TIMESTAMP ELSE finalizado_en END,
      actualizado_en = CURRENT_TIMESTAMP FROM cartillas.plantillas p
      WHERE r.id = $1 AND r.activo AND p.id = r.plantilla_id AND p.activo RETURNING r.id, r.estado, r.actualizado_en`, [registroId, estado]);
    if (!rows[0]) return response.status(404).json({ error: 'Registro no encontrado' });
    response.json(rows[0]);
  } catch { response.status(503).json({ error: 'database unavailable' }); }
});

app.post('/api/cartillas/registros/:registroId/observaciones', autenticar, permitir('tecnico', 'responsable', 'supervisor', 'administrador'), async (request, response) => {
  const registroId = numero(request.params.registroId);
  const { campoId, detalle } = request.body as { campoId?: unknown; detalle?: unknown };
  if (!registroId || typeof detalle !== 'string' || !detalle.trim()) return response.status(400).json({ error: 'Observación inválida' });
  try {
    const { rows } = await pool.query(`INSERT INTO cartillas.observaciones (registro_id, campo_id, detalle)
      SELECT r.id, $2, $3 FROM cartillas.registros r JOIN cartillas.plantillas p ON p.id = r.plantilla_id AND p.activo
      WHERE r.id = $1 AND r.activo RETURNING id, registro_id, campo_id, detalle, creado_en`, [registroId, Number.isSafeInteger(campoId) ? campoId : null, detalle.trim()]);
    if (!rows[0]) return response.status(404).json({ error: 'Registro no encontrado' });
    response.status(201).json(rows[0]);
  } catch { response.status(503).json({ error: 'database unavailable' }); }
});

app.post('/api/cartillas/registros/:registroId/evidencias', autenticar, permitir('tecnico', 'responsable', 'administrador'), async (request, response) => {
  const registroId = numero(request.params.registroId);
  const { nombreOriginal, ruta, tipoMime, tamanioBytes, descripcion } = request.body as Record<string, unknown>;
  if (!registroId || typeof nombreOriginal !== 'string' || typeof ruta !== 'string' || !nombreOriginal || !ruta) return response.status(400).json({ error: 'Metadatos de evidencia inválidos' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const registro = await client.query(`SELECT r.id FROM cartillas.registros r
      JOIN cartillas.plantillas p ON p.id = r.plantilla_id AND p.activo
      WHERE r.id = $1 AND r.activo`, [registroId]);
    if (!registro.rows[0]) { await client.query('ROLLBACK'); return response.status(404).json({ error: 'Registro no encontrado' }); }
    const archivo = await client.query(`INSERT INTO documentos.archivos (nombre_original, ruta, tipo_mime, tamanio_bytes) VALUES ($1, $2, $3, $4)
      ON CONFLICT (ruta) DO UPDATE SET nombre_original = EXCLUDED.nombre_original, tipo_mime = EXCLUDED.tipo_mime, tamanio_bytes = EXCLUDED.tamanio_bytes, actualizado_en = CURRENT_TIMESTAMP RETURNING id`, [nombreOriginal, ruta, typeof tipoMime === 'string' ? tipoMime : null, typeof tamanioBytes === 'number' ? tamanioBytes : null]);
    const evidencia = await client.query('INSERT INTO documentos.evidencias (registro_id, archivo_id, descripcion) VALUES ($1, $2, $3) RETURNING id, archivo_id, descripcion, creado_en', [registroId, archivo.rows[0].id, typeof descripcion === 'string' ? descripcion : null]);
    await client.query('COMMIT');
    response.status(201).json(evidencia.rows[0]);
  } catch { await client.query('ROLLBACK').catch(() => undefined); response.status(503).json({ error: 'database unavailable' }); } finally { client.release(); }
});
