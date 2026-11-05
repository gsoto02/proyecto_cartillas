WITH version_tirador AS (
  SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id
  WHERE p.codigo = 'TIRADOR_DE_ALARMA' AND v.numero = 1
)
UPDATE cartillas.versiones
SET documento_configuracion = '{
  "cabecera": {"formato":"CARTILLA DE MANTENIMIENTO PREVENTIVO IM3","codigo":"GO-MRF-MRP-FOR-012","revision":"Revisión 00","fecha_vigencia":"","area":"Material Rodante","pagina":"13 de 37","clasificacion":"Uso interno"},
  "titulo_oficial":"CONTROL DE MUELLES DEL TIRADOR DE ALARMA - TREN ALSTOM",
  "actividad":"CAJA - TREN ALSTOM",
  "ficha_manual":"05.031",
  "elaborado_por":"JM", "revisado_por":"JMR", "aprobado_por":"GOF",
  "notas":["Registrar la longitud de bloqueo y la resistencia mínima de cada muelle.","Ante un resultado No conforme, la observación es obligatoria."],
  "firmas":["Técnico 1","Técnico 2","Supervisor"],
  "exportacion":{"orientacion":"portrait","tamano":"letter","repetir_cabecera":true}
}'::jsonb
WHERE id = (SELECT id FROM version_tirador);

WITH version_tirador AS (
  SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id
  WHERE p.codigo = 'TIRADOR_DE_ALARMA' AND v.numero = 1
), campo_muelles AS (
  SELECT f.id FROM cartillas.campos f JOIN cartillas.secciones s ON s.id=f.seccion_id
  WHERE s.version_id=(SELECT id FROM version_tirador) AND f.codigo='control_muelles'
)
UPDATE cartillas.campos
SET obligatorio=TRUE,
    configuracion='{
      "reglas":{"requiereObservacionNoConforme":true},
      "columnas":[
        {"codigo":"descripcion","etiqueta":"DESCRIPCIÓN"},
        {"codigo":"longitud_bloqueo_mm","etiqueta":"LONGITUD DE BLOQUEO (mm)","tipo":"numero","unidad":"mm"},
        {"codigo":"resistencia_minima_n","etiqueta":"RESISTENCIA MÍNIMA (N)","tipo":"numero","unidad":"N"},
        {"codigo":"resultado","etiqueta":"RESULTADO","tipo":"seleccion","opciones":[{"valor":"conforme","etiqueta":"Conforme"},{"valor":"no_conforme","etiqueta":"No conforme"}]},
        {"codigo":"observacion","etiqueta":"OBSERVACIÓN"}
      ],
      "filasIniciales":[
        {"descripcion":"MUELLE DE PRESIÓN (13)","referencia":"Muelle 13: 15,5 mm y 9,9 N.","longitud_objetivo_mm":15.5,"resistencia_objetivo_n":9.9},
        {"descripcion":"MUELLE DE PRESIÓN (21)","referencia":"Muelle 21: 45 mm y 40 N.","longitud_objetivo_mm":45,"resistencia_objetivo_n":40}
      ]
    }'::jsonb,
    actualizado_en=CURRENT_TIMESTAMP
WHERE id=(SELECT id FROM campo_muelles);

WITH version_tirador AS (
  SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id = v.plantilla_id
  WHERE p.codigo = 'TIRADOR_DE_ALARMA' AND v.numero = 1
)
UPDATE cartillas.campos f SET obligatorio=TRUE, actualizado_en=CURRENT_TIMESTAMP
FROM cartillas.secciones s
WHERE f.seccion_id=s.id AND s.version_id=(SELECT id FROM version_tirador)
  AND f.codigo IN ('fecha','control_muelles','instrumentos','observaciones','tecnico_01','firma_tecnico_01','tecnico_02','firma_tecnico_02','supervisor','firma_supervisor');
