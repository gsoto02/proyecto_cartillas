-- Las hojas ocultas no operativas se conservan para trazabilidad, pero no se
-- ofrecen en el catálogo ni se pueden iniciar mediante rutas directas.
-- PRUEBAS_ESTATICAS es la única excepción aprobada: ya está digitalizada.
UPDATE cartillas.plantillas
SET activo = FALSE,
    actualizado_en = CURRENT_TIMESTAMP
WHERE codigo IN ('TIRADOR_DE_ALARMA', 'PRUEBAS_FINALES_NEUMATICAS');
