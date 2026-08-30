USE sigah;

-- COALESCE(..., columna): si la fila ya está bien codificada, el doble
-- CONVERT produce una secuencia utf8mb4 inválida y MySQL regresa NULL
-- (revienta el UPDATE por el NOT NULL de `nombre`, visto al probar esta
-- migración contra la BD local — filas ya limpias también matcheaban
-- el LIKE '%Ã%'). El fallback deja la columna intacta en ese caso.
UPDATE equipos SET nombre = COALESCE(CONVERT(CAST(CONVERT(nombre USING latin1) AS BINARY) USING utf8mb4), nombre) WHERE nombre LIKE '%Ã%';
UPDATE equipos SET marca = COALESCE(CONVERT(CAST(CONVERT(marca USING latin1) AS BINARY) USING utf8mb4), marca) WHERE marca LIKE '%Ã%';
UPDATE equipos SET modelo = COALESCE(CONVERT(CAST(CONVERT(modelo USING latin1) AS BINARY) USING utf8mb4), modelo) WHERE modelo LIKE '%Ã%';
UPDATE equipos SET area = COALESCE(CONVERT(CAST(CONVERT(area USING latin1) AS BINARY) USING utf8mb4), area) WHERE area LIKE '%Ã%';
UPDATE equipos SET piso = COALESCE(CONVERT(CAST(CONVERT(piso USING latin1) AS BINARY) USING utf8mb4), piso) WHERE piso LIKE '%Ã%';
UPDATE equipos SET ubicacion = COALESCE(CONVERT(CAST(CONVERT(ubicacion USING latin1) AS BINARY) USING utf8mb4), ubicacion) WHERE ubicacion LIKE '%Ã%';
UPDATE equipos SET proveedor_servicio = COALESCE(CONVERT(CAST(CONVERT(proveedor_servicio USING latin1) AS BINARY) USING utf8mb4), proveedor_servicio) WHERE proveedor_servicio LIKE '%Ã%';

SELECT id, nombre, area FROM equipos WHERE id IN (2, 3, 4, 5);
