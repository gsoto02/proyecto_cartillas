WITH plantilla AS (SELECT id FROM cartillas.plantillas WHERE codigo = 'CARTILLA_900_000_KM'), version AS (SELECT id FROM cartillas.versiones WHERE plantilla_id = (SELECT id FROM plantilla) AND numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'PRUEBAS ENTRADA/SALIDAS', 1, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARTILLA_900_000_KM' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 1)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'pruebas_entrada_salidas', 'PRUEBAS ENTRADA/SALIDAS', 'tabla', 1, '{"columnas":[{"codigo":"tecnico","etiqueta":"TEC."},{"codigo":"manual","etiqueta":"MANUAL"},{"codigo":"descripcion","etiqueta":"DESCRIPCIÓN DE ACTIVIDADES"},{"codigo":"ma1","etiqueta":"Ma1","tipo":"seleccion","opciones":[{"valor":"x","etiqueta":"X"}]},{"codigo":"mb1","etiqueta":"Mb1","tipo":"seleccion","opciones":[{"valor":"x","etiqueta":"X"}]},{"codigo":"mb3","etiqueta":"Mb3","tipo":"seleccion","opciones":[{"valor":"x","etiqueta":"X"}]},{"codigo":"r","etiqueta":"R","tipo":"seleccion","opciones":[{"valor":"x","etiqueta":"X"}]},{"codigo":"mb2","etiqueta":"Mb2","tipo":"seleccion","opciones":[{"valor":"x","etiqueta":"X"}]},{"codigo":"ma2","etiqueta":"Ma2","tipo":"seleccion","opciones":[{"valor":"x","etiqueta":"X"}]},{"codigo":"observaciones","etiqueta":"OBSERVACIONES"}],"filasIniciales":[{"tecnico":"TREN","descripcion":"Prueba de entrada","observaciones":""},{"manual":"-","descripcion":"Prueba dinámicas(*)"},{"tecnico":"","descripcion":"Prueba de salida"},{"manual":"-","descripcion":"Prueba dinámicas(*)"}]}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARTILLA_900_000_KM' AND v.numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'OBSERVACIONES', 2, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARTILLA_900_000_KM' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 2)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'observaciones', 'OBSERVACIONES', 'texto', 1, '{"multilinea":true}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARTILLA_900_000_KM' AND v.numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'RELACIÓN DE ANOMALÍAS CORREGIDAS DURANTE LA REVISIÓN', 3, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARTILLA_900_000_KM' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 3)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, 'anomalias_corregidas', 'RELACIÓN DE ANOMALÍAS CORREGIDAS DURANTE LA REVISIÓN', 'tabla', 1, '{"columnas":[{"codigo":"equipo","etiqueta":"Equipo"},{"codigo":"ubicacion","etiqueta":"Ubicación"},{"codigo":"reparaciones_efectuadas","etiqueta":"Reparaciones efectuadas"},{"codigo":"ins_bajo_bastidor","etiqueta":"INS-BAJO BASTIDOR"}],"filasIniciales":[{},{},{}]}'::jsonb FROM seccion
ON CONFLICT (seccion_id, codigo) DO UPDATE SET configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARTILLA_900_000_KM' AND v.numero = 1)
INSERT INTO cartillas.secciones (version_id, titulo, orden, descripcion)
SELECT id, 'PERSONAL', 4, NULL FROM version
ON CONFLICT (version_id, orden) DO UPDATE SET titulo = EXCLUDED.titulo, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;

WITH version AS (SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id WHERE p.codigo = 'CARTILLA_900_000_KM' AND v.numero = 1), seccion AS (SELECT id FROM cartillas.secciones WHERE version_id = (SELECT id FROM version) AND orden = 4)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT id, datos.codigo, datos.etiqueta, datos.tipo, datos.orden, datos.configuracion::jsonb FROM seccion CROSS JOIN (VALUES
 ('personal_participo', 'Personal que participó en el mantenimiento:', 'texto', 1, '{"multilinea":true}'),
 ('responsable_mantenimiento', 'RESPONSABLE MTTO:', 'texto', 2, '{}'),
 ('firma_responsable_mantenimiento', 'FIRMA:', 'firma', 3, '{}'),
 ('responsable_01', 'RESPONSABLE 01:', 'texto', 4, '{}'),
 ('firma_responsable_01', 'FIRMA:', 'firma', 5, '{}'),
 ('responsable_02', 'RESPONSABLE 02:', 'texto', 6, '{}'),
 ('firma_responsable_02', 'FIRMA:', 'firma', 7, '{}')
) AS datos(codigo, etiqueta, tipo, orden, configuracion)
ON CONFLICT (seccion_id, codigo) DO UPDATE SET etiqueta = EXCLUDED.etiqueta, tipo = EXCLUDED.tipo, orden = EXCLUDED.orden, configuracion = EXCLUDED.configuracion, activo = TRUE, actualizado_en = CURRENT_TIMESTAMP;
