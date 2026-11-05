# Mapas documentales oficiales

Cada mapa representa una plantilla y una versión concreta. Un mapa empieza en
`borrador`; no habilita exportaciones ni descargas.

Para incorporar una cartilla:

1. Auditar la hoja fuente y registrar su SHA-256.
2. Crear un JSON en esta carpeta con `templateCode`, `templateVersion`, hoja,
   área de impresión y destinos confirmados.
3. Declarar solo celdas superiores izquierdas de combinaciones y filas fijas.
4. Añadir el mapa a `index.ts`.
5. Añadir pruebas para destinos permitidos, destinos no permitidos, límites de
   área y combinaciones.
6. Mantener el estado `borrador` hasta aprobar mapeo y comparación visual.

Los campos sin destino confirmado no se agregan al mapa. El motor futuro debe
rechazar cualquier escritura que no esté declarada en este contrato.
