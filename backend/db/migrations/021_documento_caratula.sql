WITH version_caratula AS (
  SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id
  WHERE p.codigo = 'CARATULA' AND v.numero = 1
)
UPDATE cartillas.versiones
SET documento_configuracion = '{
  "cabecera": {
    "formato": "FORMATO",
    "codigo": "UT-UF-MTO-FR-308",
    "revision": "Versión 07",
    "fecha_vigencia": "05/11/2024",
    "area": "MR",
    "pagina": "1 de 21",
    "clasificacion": "Uso interno"
  },
  "titulo_oficial": "MANTENIMIENTO MAYOR 900000KM - OH - TREN ALSTOM",
  "actividad": "MATERIAL RODANTE",
  "estructura": {"filas_participantes": 12, "filas_talleres": 3, "filas_fijas": true},
  "firmas": ["Participantes mantenimiento preventivo", "Responsables talleres", "Responsable de mantenimiento"],
  "exportacion": {"orientacion": "portrait", "tamano": "letter", "repetir_cabecera": true}
}'::jsonb
WHERE id = (SELECT id FROM version_caratula);

WITH version_caratula AS (
  SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id
  WHERE p.codigo = 'CARATULA' AND v.numero = 1
)
UPDATE cartillas.campos f
SET obligatorio = TRUE, actualizado_en = CURRENT_TIMESTAMP
FROM cartillas.secciones s
WHERE f.seccion_id = s.id AND s.version_id = (SELECT id FROM version_caratula)
  AND f.codigo IN ('pedido_trabajo', 'fecha_hora_inicial', 'fecha_hora_final', 'tipo_mantenimiento', 'numero_tren', 'km_tren', 'participantes_preventivo', 'responsables_talleres', 'responsable_mantenimiento', 'firma_responsable_mantenimiento');
