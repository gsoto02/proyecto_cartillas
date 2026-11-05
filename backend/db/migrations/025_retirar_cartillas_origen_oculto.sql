-- Las cartillas cuyo documento fuente estaba oculto no forman parte del catálogo operativo.
-- Se conserva su historial en base de datos, pero no se exponen ni se pueden iniciar desde la plataforma.
UPDATE cartillas.plantillas
SET activo = FALSE,
    actualizado_en = CURRENT_TIMESTAMP
WHERE codigo = 'PRUEBAS_DINAMICAS';
