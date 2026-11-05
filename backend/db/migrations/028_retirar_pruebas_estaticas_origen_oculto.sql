-- PRUEBAS_ESTATICAS proviene de una hoja oculta del libro oficial.
-- Se retira únicamente del catálogo operativo; su definición e historial se conservan.
UPDATE cartillas.plantillas
SET activo = FALSE,
    actualizado_en = CURRENT_TIMESTAMP
WHERE codigo = 'PRUEBAS_ESTATICAS';
