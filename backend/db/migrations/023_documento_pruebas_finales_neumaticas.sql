WITH version_neumatica AS (
  SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id
  WHERE p.codigo='PRUEBAS_FINALES_NEUMATICAS' AND v.numero=1
)
UPDATE cartillas.versiones SET documento_configuracion='{
  "cabecera":{"formato":"PRUEBAS FINALES NEUMÁTICAS TRAS IM3","codigo":"GO-MRF-MRP-FOR-042","revision":"VALIDACIÓN","fecha_vigencia":"","area":"Material Rodante","pagina":"55 de 61","clasificacion":"Uso interno"},
  "titulo_oficial":"PRUEBAS FINALES NEUMÁTICAS TRAS IM3",
  "elaborado_por":"JAL","revisado_por":"JSC","aprobado_por":"PAF",
  "condiciones":["Bogie en carga de tara (AW0).","Herramientas e instrumentos: tres manómetros, tres racores de conexión rápida y tres radios portátiles.","Marcar √ si la medida está dentro de la tolerancia; de lo contrario marcar X."],
  "firmas":["Técnico 1","Técnico 2","Supervisor"],
  "exportacion":{"orientacion":"portrait","tamano":"letter","repetir_cabecera":true}
}'::jsonb WHERE id=(SELECT id FROM version_neumatica);

WITH version_neumatica AS (
  SELECT v.id FROM cartillas.versiones v JOIN cartillas.plantillas p ON p.id=v.plantilla_id
  WHERE p.codigo='PRUEBAS_FINALES_NEUMATICAS' AND v.numero=1
), campos AS (SELECT f.id,f.codigo FROM cartillas.campos f JOIN cartillas.secciones s ON s.id=f.seccion_id WHERE s.version_id=(SELECT id FROM version_neumatica))
UPDATE cartillas.campos f SET obligatorio=TRUE, configuracion=CASE c.codigo
WHEN 'servicio' THEN '{"reglas":{"requiereObservacionNoConforme":true},"columnas":[{"codigo":"coche","etiqueta":"OPERACIONES"},{"codigo":"referencia","etiqueta":"CRITERIO / TOLERANCIA"},{"codigo":"valor_inicial_bar","etiqueta":"Valor inicial (bar)","tipo":"numero","unidad":"bar"},{"codigo":"valor_10_min_bar","etiqueta":"Valor visualizado (bar) (tras 10 min)","tipo":"numero","unidad":"bar"},{"codigo":"evaluacion","etiqueta":"√ / X","tipo":"seleccion","opciones":[{"valor":"conforme","etiqueta":"√ Conforme"},{"valor":"no_conforme","etiqueta":"X No conforme"}]},{"codigo":"observacion","etiqueta":"OBSERVACIÓN"}],"filasIniciales":[{"coche":"MA1","referencia":"1,8 bar ±0,2","objetivo":1.8,"tolerancia":0.2},{"coche":"MB1","referencia":"1,8 bar ±0,2","objetivo":1.8,"tolerancia":0.2},{"coche":"R","referencia":"1,8 bar ±0,2","objetivo":1.8,"tolerancia":0.2},{"coche":"MB2","referencia":"1,8 bar ±0,2","objetivo":1.8,"tolerancia":0.2},{"coche":"MA2","referencia":"1,8 bar ±0,2","objetivo":1.8,"tolerancia":0.2},{"coche":"Revisar la instalación neumática en busca de fugas.","referencia":"No se detectan fugas en la instalación"}]}'::jsonb
WHEN 'estacionamiento' THEN '{"reglas":{"requiereObservacionNoConforme":true},"columnas":[{"codigo":"coche","etiqueta":"OPERACIONES"},{"codigo":"referencia","etiqueta":"CRITERIO / TOLERANCIA"},{"codigo":"valor_inicial_bar","etiqueta":"Valor inicial (bar)","tipo":"numero","unidad":"bar"},{"codigo":"valor_10_min_bar","etiqueta":"Valor visualizado (bar) (tras 10 min)","tipo":"numero","unidad":"bar"},{"codigo":"evaluacion","etiqueta":"√ / X","tipo":"seleccion","opciones":[{"valor":"conforme","etiqueta":"√ Conforme"},{"valor":"no_conforme","etiqueta":"X No conforme"}]},{"codigo":"observacion","etiqueta":"OBSERVACIÓN"}],"filasIniciales":[{"coche":"MA1","referencia":"7,7 bar ±0,2","objetivo":7.7,"tolerancia":0.2},{"coche":"MB1","referencia":"7,7 bar ±0,2","objetivo":7.7,"tolerancia":0.2},{"coche":"R","referencia":"7,7 bar ±0,2","objetivo":7.7,"tolerancia":0.2},{"coche":"MB2","referencia":"7,7 bar ±0,2","objetivo":7.7,"tolerancia":0.2},{"coche":"MA2","referencia":"7,7 bar ±0,2","objetivo":7.7,"tolerancia":0.2},{"coche":"Verificar el desbloqueo del freno de estacionamiento","referencia":"Se afloja el freno de estacionamiento mecánicamente"}]}'::jsonb
ELSE f.configuracion END, actualizado_en=CURRENT_TIMESTAMP FROM campos c WHERE f.id=c.id;
