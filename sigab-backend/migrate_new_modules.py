import asyncio
import aiomysql
from config import DB_CONFIG

async def migrate():
    conn = await aiomysql.connect(**DB_CONFIG)
    async with conn.cursor() as cur:
        print("Migrando tablas de Metrología y Capacitaciones...")
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS metrologia_calibracion (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                equipo_id INT UNSIGNED NOT NULL,
                tipo_medicion VARCHAR(100),
                fecha_calibracion DATE NOT NULL,
                proxima_calibracion DATE NOT NULL,
                certificado_numero VARCHAR(50),
                entidad_calibradora VARCHAR(150),
                ruta_especificaciones_pdf VARCHAR(255),
                estado ENUM('vigente', 'proximo_vencer', 'vencido') DEFAULT 'vigente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
            );
        """)
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS capacitaciones (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                equipo_id INT UNSIGNED NOT NULL,
                tema VARCHAR(200) NOT NULL,
                fecha_capacitacion DATE NOT NULL,
                instructor VARCHAR(150),
                personal_capacitado TEXT,
                lista_asistencia_pdf VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
            );
        """)
        await conn.commit()
    conn.close()
    print("Migración completada con éxito.")

if __name__ == "__main__":
    asyncio.run(migrate())
