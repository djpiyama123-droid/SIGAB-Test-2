import asyncio
import aiomysql
import sys
import os

sys.path.append(os.getcwd())
from config import DB_CONFIG

async def migrate():
    conn = await aiomysql.connect(**DB_CONFIG)
    try:
        async with conn.cursor() as cur:
            print("Creando tabla zonas_mapa...")
            await cur.execute("""
                CREATE TABLE IF NOT EXISTS zonas_mapa (
                    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    nombre     VARCHAR(100) NOT NULL,
                    codigo     VARCHAR(50) UNIQUE NOT NULL,
                    piso       VARCHAR(30),
                    color_bg   VARCHAR(30) DEFAULT '#1e293b',
                    color_borde VARCHAR(30) DEFAULT '#334155',
                    orden      INT DEFAULT 0,
                    activa     BOOLEAN DEFAULT TRUE
                ) ENGINE=InnoDB;
            """)
            
            print("Extendiendo tabla equipos...")
            try:
                # Usamos sentencias individuales y capturamos errores si las columnas ya existen
                columnas = [
                    "ADD COLUMN zona_id INT UNSIGNED NULL COMMENT 'FK a zonas_mapa'",
                    "ADD COLUMN pos_x DECIMAL(5,2) DEFAULT 50.00 COMMENT '% horizontal'",
                    "ADD COLUMN pos_y DECIMAL(5,2) DEFAULT 50.00 COMMENT '% vertical'",
                    "ADD COLUMN imagen_url VARCHAR(255) NULL",
                    "ADD COLUMN tipo_equipo ENUM('monitor','ventilador','arco_c','anestesia','incubadora','desfibrilador','bomba_infusion','rayos_x','ultrasonido','autoclave','laboratorio','electrocardiografo','otro') DEFAULT 'otro'",
                    "ADD COLUMN clase_cofepris ENUM('I','II','III') DEFAULT 'II'",
                    "ADD COLUMN fecha_compra DATE NULL",
                    "ADD COLUMN numero_contrato_servicio VARCHAR(80) NULL"
                ]
                for col in columnas:
                    try:
                        await cur.execute(f"ALTER TABLE equipos {col}")
                    except Exception as e:
                        print(f"Info: {col.split(' ')[2]} ya existe o error: {e}")

                print("Añadiendo FK...")
                try:
                    await cur.execute("ALTER TABLE equipos ADD CONSTRAINT fk_equipo_zona FOREIGN KEY (zona_id) REFERENCES zonas_mapa(id) ON DELETE SET NULL")
                except:
                    print("Info: FK ya existe")
                
                await conn.commit()
                print("Migración de Mapa completada.")
            except Exception as e:
                print(f"Error migrando equipos: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
