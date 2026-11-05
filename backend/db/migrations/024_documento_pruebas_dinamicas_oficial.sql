-- Source audited: CARTILLAS EN GENERAL.xlsx / hidden sheet PRUEBAS DINAMICAS.
-- The mapping is versioned with the template; the original workbook is never rebuilt.
WITH version_dinamicas AS (
  SELECT v.id FROM cartillas.versiones v
  JOIN cartillas.plantillas p ON p.id = v.plantilla_id
  WHERE p.codigo = 'PRUEBAS_DINAMICAS' AND v.numero = 1
)
UPDATE cartillas.versiones
SET documento_configuracion = '{
  "origen_oficial": {
    "archivo": "CARTILLAS EN GENERAL.xlsx",
    "hoja": "PRUEBAS DINAMICAS",
    "visibilidad_origen": "oculta",
    "rango_documental": "A1:M192",
    "paginas_origen": "58 de 61 a 61 de 61"
  },
  "cabecera": {
    "formato": "FORMATO",
    "codigo": "GO-MRF-MRP-FOR-042",
    "revision": "VALIDACIÓN",
    "fecha_vigencia": "07/06/2018",
    "area": "Material Rodante",
    "pagina": "58 de 61 a 61 de 61",
    "clasificacion": "Uso interno"
  },
  "titulo_oficial": "PRUEBAS DINÁMICAS DEL TREN POR SALIDA DE IM3",
  "elaborado_por": "JAL",
  "revisado_por": "JSC",
  "aprobado_por": "PAF",
  "instruccion_evaluacion": "Marcar √ si la medida es satisfactoria, en caso contrario marcar X.",
  "exportacion": {
    "metodo": "plantilla_original_rellenada",
    "xlsx": "Copia binaria del libro original con solo celdas mapeadas actualizadas.",
    "pdf": "Conversión de la copia oficial y extracción de las páginas 58 a 61.",
    "paginas_pdf_convertido": [23, 24, 25, 26]
  },
  "mapeo_celdas": {
    "tren": "M6",
    "fecha": "M7",
    "observaciones": "A185",
    "resultados_ma": {
      "velocidades": [20,29,37,44,45,48,51,52],
      "tiradores": [70,71,77,78],
      "hombre_muerto": [88,89,90,91,92,93,94],
      "retencion": [101,103],
      "estacionamiento": [114,116,117]
    },
    "deceleraciones": {
      "servicio_combinado": [135,136],
      "emergencia": [153,154],
      "neumatico": [180,181]
    },
    "personal": [189,190,192]
  }
}'::jsonb
WHERE id = (SELECT id FROM version_dinamicas);
