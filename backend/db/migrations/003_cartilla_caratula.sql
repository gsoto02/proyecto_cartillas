WITH plantilla AS (
  SELECT id FROM cartillas.plantillas WHERE codigo = 'CARATULA'
), version AS (
  SELECT id FROM cartillas.versiones WHERE plantilla_id = (SELECT id FROM plantilla) AND numero = 1
)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'CARATULA', 1, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1), seccion AS (SELECT s.id FROM cartillas.secciones s WHERE s.version_id = (SELECT id FROM version) AND s.orden = 1)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT seccion.id, datos.codigo, datos.etiqueta, datos.tipo, datos.orden, datos.configuracion::jsonb FROM seccion CROSS JOIN (VALUES
  ('pedido_trabajo', 'PEDIDO DE TRABAJO N°:', 'texto', 1, '{}'),
  ('fecha_hora_inicial', '1. FECHA Y HORA INICIAL:', 'fecha', 2, '{}'),
  ('fecha_hora_final', '2. FECHA Y HORA FINAL:', 'fecha', 3, '{}'),
  ('tipo_mantenimiento', '3. TIPO DE MANTENIMIENTO:', 'texto', 4, '{}'),
  ('numero_tren', '4. N° DE TREN:', 'texto', 5, '{}'),
  ('km_tren', 'KM DE TREN:', 'numero', 6, '{}')
) AS datos(codigo, etiqueta, tipo, orden, configuracion)
ON CONFLICT (seccion_id, codigo) DO UPDATE SET etiqueta = EXCLUDED.etiqueta, tipo = EXCLUDED.tipo, orden = EXCLUDED.orden, configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'PARTICIPANTES MANTENIMIENTO PREVENTIVO', 2, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 2)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'participantes_preventivo', 'PARTICIPANTES MANTENIMIENTO PREVENTIVO', 'tabla', 1, '{"columnas":[{"codigo":"responsable","etiqueta":"RESPONSABLE"},{"codigo":"nombres_completos","etiqueta":"NOMBRES COMPLETOS"},{"codigo":"firma","etiqueta":"FIRMAS","tipo":"firma"}],"filasIniciales":[{"responsable":"Responsable 1"},{"responsable":"Responsable 2"},{"responsable":"Responsable 3"},{"responsable":"Responsable 4"},{"responsable":"Responsable 5"},{"responsable":"Responsable 6"},{"responsable":"Responsable 7"},{"responsable":"Responsable 8"},{"responsable":"Responsable 9"},{"responsable":"Responsable 10"},{"responsable":"Responsable 11"},{"responsable":"Responsable 12"}]}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'RESPONSABLE TALLERES', 3, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 3)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'responsables_talleres', 'RESPONSABLE TALLERES', 'tabla', 1, '{"columnas":[{"codigo":"taller","etiqueta":"RESPONSABLE"},{"codigo":"nombres_completos","etiqueta":"NOMBRES COMPLETOS"},{"codigo":"firma","etiqueta":"FIRMAS","tipo":"firma"}],"filasIniciales":[{"taller":"Taller Mecánica"},{"taller":"Taller Eléctrotecnia"},{"taller":"Taller Eléctrónica"}]}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'OBSERVACIONES', 4, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 4)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'observaciones', 'OBSERVACIONES:', 'texto', 1, '{"multilinea":true}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 4)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'firma_responsable_mantenimiento', 'FIRMA', 'firma', 2, '{}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARATULA' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 4)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'responsable_mantenimiento', 'RESPONSABLE DE MANTENIMIENTO', 'texto', 3, '{}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;
