WITH plantilla AS (SELECT id FROM cartillas.plantillas WHERE codigo = 'TIRADOR_DE_ALARMA'), version AS (SELECT id FROM cartillas.versiones WHERE plantilla_id = (SELECT id FROM plantilla) AND numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'MUELLES DEL TIRADOR DE ALARMA', 1, 'FICHA: 05.031' FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id WHERE p.codigo='TIRADOR_DE_ALARMA' AND v.numero=1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id=(SELECT id FROM version) AND orden=1)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, datos.codigo, datos.etiqueta, datos.tipo, datos.orden, datos.configuracion::jsonb FROM seccion CROSS JOIN (VALUES
 ('fecha', 'FECHA:', 'fecha', 1, '{}'),
 ('control_muelles', 'MUELLES DEL TIRADOR DE ALARMA', 'tabla', 2, '{"columnas":[{"codigo":"descripcion","etiqueta":"DESCRIPCIÓN"},{"codigo":"longitud_bloqueo_mm","etiqueta":"LONGITUD DE BLOQUEO (mm)"},{"codigo":"resistencia_minima_n","etiqueta":"RESISTENCIA MÍNIMA (N)"}],"filasIniciales":[{"descripcion":"MUELLE DE PRESIÓN (13)","longitud_bloqueo_mm":"","resistencia_minima_n":"","referencia":"Muelle 13: 15,5 mm y 9,9 N."},{"descripcion":"MUELLE DE PRESIÓN (21)","longitud_bloqueo_mm":"","resistencia_minima_n":"","referencia":"Muelle 21: 45 mm y 40 N."}]}')
) AS datos(codigo, etiqueta, tipo, orden, configuracion)
ON CONFLICT (seccion_id, codigo) DO UPDATE SET etiqueta=EXCLUDED.etiqueta, tipo=EXCLUDED.tipo, orden=EXCLUDED.orden, configuracion=EXCLUDED.configuracion, activo=TRUE, actualizado_en=CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id WHERE p.codigo='TIRADOR_DE_ALARMA' AND v.numero=1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'LISTA DE INSTRUMENTOS:', 2, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo=EXCLUDED.titulo, activo=TRUE, actualizado_en=CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id WHERE p.codigo='TIRADOR_DE_ALARMA' AND v.numero=1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id=(SELECT id FROM version) AND orden=2)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'instrumentos', 'LISTA DE INSTRUMENTOS:', 'tabla', 1, '{"columnas":[{"codigo":"codigo","etiqueta":"Código"},{"codigo":"descripcion","etiqueta":"Descripción"},{"codigo":"modelo_marca","etiqueta":"Modelo / Marca"},{"codigo":"fecha_calibracion_verificacion","etiqueta":"Fecha de Calibración/Verificación"},{"codigo":"observaciones","etiqueta":"Observaciones"}],"filasIniciales":[{},{}]}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion=EXCLUDED.configuracion, activo=TRUE, actualizado_en=CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id WHERE p.codigo='TIRADOR_DE_ALARMA' AND v.numero=1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'OBSERVACIONES:', 3, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo=EXCLUDED.titulo, activo=TRUE, actualizado_en=CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id WHERE p.codigo='TIRADOR_DE_ALARMA' AND v.numero=1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id=(SELECT id FROM version) AND orden=3)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'observaciones', 'OBSERVACIONES:', 'texto', 1, '{"multilinea":true}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion=EXCLUDED.configuracion, activo=TRUE, actualizado_en=CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id WHERE p.codigo='TIRADOR_DE_ALARMA' AND v.numero=1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'PERSONAL:', 4, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo=EXCLUDED.titulo, activo=TRUE, actualizado_en=CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id WHERE p.codigo='TIRADOR_DE_ALARMA' AND v.numero=1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id=(SELECT id FROM version) AND orden=4)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, datos.codigo, datos.etiqueta, datos.tipo, datos.orden, '{}'::jsonb FROM seccion CROSS JOIN (VALUES
 ('tecnico_01', 'TÉCNICO:', 'texto', 1), ('firma_tecnico_01', 'FIRMA:', 'firma', 2),
 ('tecnico_02', 'TÉCNICO:', 'texto', 3), ('firma_tecnico_02', 'FIRMA:', 'firma', 4),
 ('supervisor', 'SUPERVISOR:', 'texto', 5), ('firma_supervisor', 'FIRMA:', 'firma', 6)
) AS datos(codigo, etiqueta, tipo, orden)
ON CONFLICT (seccion_id, codigo) DO UPDATE SET etiqueta=EXCLUDED.etiqueta, tipo=EXCLUDED.tipo, orden=EXCLUDED.orden, activo=TRUE, actualizado_en=CURRENT_TIMESTAMP;
