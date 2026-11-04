INSERT INTO cartillas.categorias (nombre, descripcion)
VALUES ('Mantenimiento', 'Cartillas de mantenimiento UNNA')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    activo = TRUE,
    actualizado_en = CURRENT_TIMESTAMP;

WITH catalogo (codigo, nombre) AS (
  VALUES
    ('CARATULA', 'CARATULA'),
    ('CARTILLA_900_000_KM', 'Cartillla 900,000km'),
    ('TIRADOR_DE_ALARMA', 'TIRADOR DE ALARMA'),
    ('BOGIE', 'BOGIE'),
    ('CAMBIO_DE_BOGIE', 'CAMBIO DE BOGIE'),
    ('CONTROL_DE_APRIETE_01', 'CONTROL DE APRIETE 01'),
    ('CONTROL_DE_APRIETE_02', 'CONTROL DE APRIETE 02'),
    ('TAPAS_DE_PUNTA_DE_EJE', 'TAPAS DE PUNTA DE EJE'),
    ('CAMBIO_DE_MOTOR', 'CAMBIO DE MOTOR'),
    ('CARTILLA_ELECTROTECNIA', 'Cartilla_Electrotecnia'),
    ('CARTILLA_ELECTRONICA', 'Cartilla_Electronica'),
    ('INSPECCION_BAJO_BAST', 'Inspección bajo bast'),
    ('HOJA_DE_MATERIALES', 'HOJA DE MATERIALES'),
    ('LISTA_DE_PERSONAL', 'LISTA DE PERSONAL'),
    ('PRUEBAS_FINALES_NEUMATICAS', 'PRUEBAS FINALES NEUMATICAS'),
    ('PRUEBAS_ESTATICAS', 'PRUEBAS ESTATICAS'),
    ('PRUEBAS_DINAMICAS', 'PRUEBAS DINAMICAS')
), categoria AS (
  SELECT id FROM cartillas.categorias WHERE nombre = 'Mantenimiento'
)
INSERT INTO cartillas.plantillas (categoria_id, codigo, nombre, activo)
SELECT categoria.id, catalogo.codigo, catalogo.nombre, TRUE
FROM catalogo CROSS JOIN categoria
ON CONFLICT (codigo) DO UPDATE
SET categoria_id = EXCLUDED.categoria_id,
    nombre = EXCLUDED.nombre,
    activo = TRUE,
    actualizado_en = CURRENT_TIMESTAMP;

INSERT INTO cartillas.versiones (plantilla_id, numero, estado, activo)
SELECT id, 1, 'borrador', TRUE
FROM cartillas.plantillas
WHERE codigo IN (
  'CARATULA', 'CARTILLA_900_000_KM', 'TIRADOR_DE_ALARMA', 'BOGIE',
  'CAMBIO_DE_BOGIE', 'CONTROL_DE_APRIETE_01', 'CONTROL_DE_APRIETE_02',
  'TAPAS_DE_PUNTA_DE_EJE', 'CAMBIO_DE_MOTOR', 'CARTILLA_ELECTROTECNIA',
  'CARTILLA_ELECTRONICA', 'INSPECCION_BAJO_BAST', 'HOJA_DE_MATERIALES',
  'LISTA_DE_PERSONAL', 'PRUEBAS_FINALES_NEUMATICAS', 'PRUEBAS_ESTATICAS',
  'PRUEBAS_DINAMICAS'
)
ON CONFLICT (plantilla_id, numero) DO UPDATE
SET estado = EXCLUDED.estado,
    activo = TRUE,
    actualizado_en = CURRENT_TIMESTAMP;
