-- Fuente: CARTILLAS_EN_GENERAL.xlsx, hoja "PRUEBAS ESTATICAS", filas 125 a 138.
-- Solo se digitalizan los encabezados y espacios de captura identificables en el formato oficial.
WITH version_estatica AS (
  SELECT v.id
  FROM cartillas.versiones v
  JOIN cartillas.plantillas p ON p.id = v.plantilla_id
  WHERE p.codigo = 'PRUEBAS_ESTATICAS' AND v.numero = 1
), secciones AS (
  SELECT s.id, s.titulo
  FROM cartillas.secciones s
  WHERE s.version_id = (SELECT id FROM version_estatica)
)
INSERT INTO cartillas.campos (seccion_id, codigo, etiqueta, tipo, orden, configuracion)
SELECT s.id, d.codigo, d.etiqueta, d.tipo, d.orden, d.configuracion::jsonb
FROM secciones s
JOIN (VALUES
  ('LISTA DE INSTRUMENTOS', 'instrumentos', 'LISTA DE INSTRUMENTOS', 'tabla', 1,
    '{"columnas":[{"codigo":"codigo","etiqueta":"Código"},{"codigo":"descripcion","etiqueta":"Descripción del equipo"},{"codigo":"marca_modelo","etiqueta":"Marca/Modelo"}],"filasIniciales":[{},{},{}]}' ),
  ('OBSERVACIONES', 'observaciones', 'OBSERVACIONES', 'texto', 1,
    '{"multilinea":true}' ),
  ('PERSONAL', 'personal', 'PERSONAL', 'tabla', 1,
    '{"columnas":[{"codigo":"cargo","etiqueta":"PERSONAL"},{"codigo":"firma","etiqueta":"FIRMA","tipo":"firma"}],"filasIniciales":[{"cargo":"TÉCNICO"},{"cargo":"TÉCNICO"},{"cargo":"SUPERVISOR:"}]}' )
) AS d(titulo, codigo, etiqueta, tipo, orden, configuracion) ON d.titulo = s.titulo
ON CONFLICT (seccion_id, codigo) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    tipo = EXCLUDED.tipo,
    orden = EXCLUDED.orden,
    configuracion = EXCLUDED.configuracion,
    activo = TRUE,
    actualizado_en = CURRENT_TIMESTAMP;
