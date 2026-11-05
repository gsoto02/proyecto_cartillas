-- Metadatos documentales inmutables por versión de cartilla.
-- La estructura operativa existente (secciones, campos y respuestas) se conserva.
ALTER TABLE cartillas.versiones
  ADD COLUMN IF NOT EXISTS documento_configuracion JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'versiones_documento_configuracion_objeto') THEN
    ALTER TABLE cartillas.versiones
      ADD CONSTRAINT versiones_documento_configuracion_objeto
      CHECK (jsonb_typeof(documento_configuracion) = 'object');
  END IF;
END $$;

COMMENT ON COLUMN cartillas.versiones.documento_configuracion IS
  'Fuente documental por versión: cabecera, clasificación, responsables, notas, instrucciones, tablas fijas, criterios, rangos, unidades, reglas de validación, firmas y evidencias. No sustituye secciones/campos existentes.';
