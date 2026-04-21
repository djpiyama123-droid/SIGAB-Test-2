USE sigab;

UPDATE equipos SET nombre = CONVERT(CAST(CONVERT(nombre USING latin1) AS BINARY) USING utf8mb4) WHERE nombre LIKE '%Ã%';
UPDATE equipos SET marca = CONVERT(CAST(CONVERT(marca USING latin1) AS BINARY) USING utf8mb4) WHERE marca LIKE '%Ã%';
UPDATE equipos SET modelo = CONVERT(CAST(CONVERT(modelo USING latin1) AS BINARY) USING utf8mb4) WHERE modelo LIKE '%Ã%';
UPDATE equipos SET area = CONVERT(CAST(CONVERT(area USING latin1) AS BINARY) USING utf8mb4) WHERE area LIKE '%Ã%';
UPDATE equipos SET piso = CONVERT(CAST(CONVERT(piso USING latin1) AS BINARY) USING utf8mb4) WHERE piso LIKE '%Ã%';
UPDATE equipos SET ubicacion = CONVERT(CAST(CONVERT(ubicacion USING latin1) AS BINARY) USING utf8mb4) WHERE ubicacion LIKE '%Ã%';
UPDATE equipos SET proveedor_servicio = CONVERT(CAST(CONVERT(proveedor_servicio USING latin1) AS BINARY) USING utf8mb4) WHERE proveedor_servicio LIKE '%Ã%';

SELECT id, nombre, area FROM equipos WHERE id IN (2, 3, 4, 5);
