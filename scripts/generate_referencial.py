#!/usr/bin/env python3
"""
generate_referencial.py — Pipeline de imágenes referenciales para SIGAB (S6)

Genera imágenes de referencia profesionales para los equipos médicos que NO
tienen foto (imagen_url IS NULL o vacía). Cada imagen incluye:
  - Fondo degradado institucional (gris-azul)
  - Ícono genérico de equipo médico
  - Nombre, marca, modelo y serie del equipo
  - Watermark diagonal "IMAGEN REFERENCIAL"
  - Badge de estado (operativo/mantenimiento/fuera_servicio)

Tras generar la imagen, actualiza la base de datos:
  - imagen_url = '/uploads/referenciales/{id}_{serie}.webp'
  - imagen_referencial = 1

Uso:
  # Dry-run (no escribe nada, solo muestra qué haría)
  python generate_referencial.py --dry-run

  # Generar solo 10 imágenes (batch pequeño para prueba)
  python generate_referencial.py --limit 10

  # Generar todas las imágenes pendientes
  python generate_referencial.py

  # Conexión explícita (si no hay .env)
  python generate_referencial.py --db-url mysql+pymysql://user:pass@host/sigab

  # Usar dentro del contenedor Docker en el VPS:
  docker run --rm --network host \\
    -v /opt/sigab:/opt/sigab \\
    -w /opt/sigab/sigab-backend \\
    sigab-backend:latest \\
    python3 scripts/generate_referencial.py --uploads-dir /opt/sigab/sigab-backend/static/uploads

Requisitos: Pillow, pymysql
"""
import argparse
import math
import os
import sys
import textwrap
from datetime import datetime
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow no está instalado. Ejecuta: pip install Pillow")
    sys.exit(1)

try:
    import pymysql
except ImportError:
    print("ERROR: pymysql no está instalado. Ejecuta: pip install pymysql")
    sys.exit(1)


# ── Configuración visual ─────────────────────────────────────────────────────
IMG_WIDTH = 800
IMG_HEIGHT = 600

# Colores institucionales IMSS/SIGAH
COLOR_BG_TOP = (15, 23, 42)        # slate-900
COLOR_BG_BOTTOM = (30, 41, 59)     # slate-800
COLOR_ACCENT = (0, 108, 183)       # IMSS blue #006CB7
COLOR_ACCENT_GREEN = (5, 150, 105) # SIGAH green
COLOR_TEXT_PRIMARY = (241, 245, 249)   # slate-100
COLOR_TEXT_SECONDARY = (148, 163, 184) # slate-400
COLOR_TEXT_MUTED = (100, 116, 139)     # slate-500
COLOR_WATERMARK = (51, 65, 85)     # slate-700 (semi-transparente en overlay)
COLOR_BADGE_OPERATIVO = (34, 197, 94)    # green-500
COLOR_BADGE_MANT = (250, 204, 21)        # yellow-400
COLOR_BADGE_FUERA = (239, 68, 68)        # red-500

ESTADO_COLORS = {
    "operativo": COLOR_BADGE_OPERATIVO,
    "mantenimiento": COLOR_BADGE_MANT,
    "fuera_servicio": COLOR_BADGE_FUERA,
}

ESTADO_LABELS = {
    "operativo": "OPERATIVO",
    "mantenimiento": "EN MANTENIMIENTO",
    "fuera_servicio": "FUERA DE SERVICIO",
}

# Ícono médico simple (cruz) dibujado con PIL
MEDICAL_CROSS_SIZE = 120


def load_env(env_path=None):
    """Carga variables de un archivo .env (formato KEY=VALUE, sin comillas)."""
    paths_to_try = [
        env_path,
        os.path.join(os.getcwd(), ".env"),
        "/opt/sigab/.env",
    ]
    for p in paths_to_try:
        if p and os.path.isfile(p):
            env = {}
            with open(p) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        env[k.strip()] = v.strip().strip("'\"")
            return env
    return {}


def get_db_connection(db_url=None, env_path=None):
    """Abre conexión pymysql desde URL explícita o desde .env."""
    if db_url:
        # Parsear mysql+pymysql://user:pass@host[:port]/dbname
        from urllib.parse import urlparse
        parsed = urlparse(db_url.replace("mysql+pymysql://", "mysql://"))
        return pymysql.connect(
            host=parsed.hostname or "127.0.0.1",
            port=parsed.port or 3306,
            user=parsed.username,
            password=parsed.password or "",
            database=parsed.path.lstrip("/"),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
    # Desde .env
    env = load_env(env_path)
    return pymysql.connect(
        host=env.get("DB_HOST", "127.0.0.1"),
        port=int(env.get("DB_PORT", "3306")),
        user=env.get("DB_USER", "sigab_user"),
        password=env.get("DB_PASS", ""),
        database=env.get("DB_NAME", "sigab"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def get_font(size):
    """Intenta cargar una fuente TrueType; fallback a la fuente por defecto de PIL."""
    font_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:/Windows/Fonts/arial.ttf",
        # WSL
        "/mnt/c/Windows/Fonts/arial.ttf",
    ]
    for fp in font_candidates:
        if os.path.isfile(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    # Fallback: PIL default (bitmap, sin escalado real, pero funciona)
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        # Pillow < 10.1 no soporta size= en load_default
        return ImageFont.load_default()


def draw_gradient_bg(draw, width, height, color_top, color_bottom):
    """Dibuja un degradado vertical de arriba a abajo."""
    for y in range(height):
        ratio = y / height
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * ratio)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * ratio)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))


def draw_medical_cross(draw, cx, cy, size, color):
    """Dibuja una cruz médica centrada en (cx, cy)."""
    arm_w = size // 3
    half = size // 2
    # Barra vertical
    draw.rounded_rectangle(
        [cx - arm_w // 2, cy - half, cx + arm_w // 2, cy + half],
        radius=arm_w // 4,
        fill=color,
    )
    # Barra horizontal
    draw.rounded_rectangle(
        [cx - half, cy - arm_w // 2, cx + half, cy + arm_w // 2],
        radius=arm_w // 4,
        fill=color,
    )


def draw_watermark(img, text="IMAGEN REFERENCIAL"):
    """Superpone texto diagonal semi-transparente como watermark."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = get_font(42)

    # Calcular posiciones para cubrir la imagen con el texto en diagonal
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]

    # Dibujar múltiples líneas de watermark
    step_y = 120
    for offset_y in range(-img.height, img.height * 2, step_y):
        for offset_x in range(-img.width, img.width * 2, text_w + 80):
            # Crear imagen temporal para rotar
            txt_img = Image.new("RGBA", (text_w + 40, 60), (0, 0, 0, 0))
            txt_draw = ImageDraw.Draw(txt_img)
            txt_draw.text((20, 10), text, font=font, fill=(51, 65, 85, 60))
            rotated = txt_img.rotate(25, expand=True, resample=Image.BICUBIC)
            overlay.paste(rotated, (offset_x, offset_y), rotated)

    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def generate_image(equipo):
    """Genera una imagen referencial para un equipo biomédico."""
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT))
    draw = ImageDraw.Draw(img)

    # 1. Fondo degradado
    draw_gradient_bg(draw, IMG_WIDTH, IMG_HEIGHT, COLOR_BG_TOP, COLOR_BG_BOTTOM)

    # 2. Banda decorativa superior (acento IMSS)
    draw.rectangle([0, 0, IMG_WIDTH, 6], fill=COLOR_ACCENT)

    # 3. Cruz médica semitransparente de fondo
    cross_color = tuple(c + 15 for c in COLOR_BG_BOTTOM)  # ligeramente más claro
    draw_medical_cross(draw, IMG_WIDTH // 2, 240, MEDICAL_CROSS_SIZE, cross_color)

    # 4. Texto del equipo
    nombre = equipo.get("nombre", "Equipo Médico")
    marca = equipo.get("marca", "—")
    modelo = equipo.get("modelo", "—")
    serie = equipo.get("serie", "—")
    estado = equipo.get("estado", "operativo")

    # Nombre (título principal — puede ser largo, wrappear)
    font_title = get_font(32)
    font_subtitle = get_font(20)
    font_detail = get_font(16)
    font_badge = get_font(14)

    # Centrar el nombre (con wrap si es muy largo)
    wrapped = textwrap.wrap(nombre, width=35)
    y_cursor = 340
    for line in wrapped[:2]:  # máximo 2 líneas
        bbox = draw.textbbox((0, 0), line, font=font_title)
        tw = bbox[2] - bbox[0]
        draw.text(((IMG_WIDTH - tw) / 2, y_cursor), line, fill=COLOR_TEXT_PRIMARY, font=font_title)
        y_cursor += 40

    # Marca | Modelo
    marca_modelo = f"{marca}  ·  {modelo}"
    bbox = draw.textbbox((0, 0), marca_modelo, font=font_subtitle)
    tw = bbox[2] - bbox[0]
    draw.text(((IMG_WIDTH - tw) / 2, y_cursor + 10), marca_modelo, fill=COLOR_TEXT_SECONDARY, font=font_subtitle)

    # Serie
    serie_text = f"S/N: {serie}"
    bbox = draw.textbbox((0, 0), serie_text, font=font_detail)
    tw = bbox[2] - bbox[0]
    draw.text(((IMG_WIDTH - tw) / 2, y_cursor + 45), serie_text, fill=COLOR_TEXT_MUTED, font=font_detail)

    # 5. Badge de estado
    badge_color = ESTADO_COLORS.get(estado, COLOR_BADGE_OPERATIVO)
    badge_label = ESTADO_LABELS.get(estado, estado.upper())
    bbox = draw.textbbox((0, 0), badge_label, font=font_badge)
    badge_w = bbox[2] - bbox[0] + 24
    badge_h = 28
    badge_x = (IMG_WIDTH - badge_w) / 2
    badge_y = y_cursor + 80
    draw.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
        radius=badge_h // 2,
        fill=badge_color,
    )
    draw.text((badge_x + 12, badge_y + 5), badge_label, fill=(255, 255, 255), font=font_badge)

    # 6. Footer institucional
    footer = "SIGAB · Sistema de Gestión de Activos Biomédicos · HGR No. 1 IMSS Tijuana"
    bbox = draw.textbbox((0, 0), footer, font=font_detail)
    tw = bbox[2] - bbox[0]
    draw.text(((IMG_WIDTH - tw) / 2, IMG_HEIGHT - 40), footer, fill=COLOR_TEXT_MUTED, font=font_detail)

    # 7. Watermark diagonal
    img = draw_watermark(img)

    return img


def fetch_equipos_sin_foto(conn, limit=None):
    """Busca equipos sin imagen_url en la base de datos."""
    sql = """
        SELECT id, nombre, marca, modelo, serie, estado, imagen_url, imagen_referencial
        FROM equipos
        WHERE (imagen_url IS NULL OR imagen_url = '')
        ORDER BY id ASC
    """
    if limit:
        sql += f" LIMIT {int(limit)}"
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()


def update_equipo_imagen(conn, equipo_id, rel_url):
    """Actualiza imagen_url e imagen_referencial en la base de datos."""
    sql = """
        UPDATE equipos
        SET imagen_url = %s, imagen_referencial = 1, updated_at = NOW()
        WHERE id = %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, (rel_url, equipo_id))
    conn.commit()


def main():
    parser = argparse.ArgumentParser(
        description="Genera imágenes referenciales para equipos sin foto en SIGAB.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="No escribe archivos ni modifica la BD. Solo muestra el plan.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Limitar a N equipos (para pruebas incrementales).")
    parser.add_argument("--db-url", default=None,
                        help="URL de conexión MySQL (ej: mysql+pymysql://user:pass@host/sigab)")
    parser.add_argument("--env-file", default=None,
                        help="Ruta al archivo .env con credenciales de BD.")
    parser.add_argument("--uploads-dir", default=None,
                        help="Directorio base de uploads (default: ./static/uploads)")
    parser.add_argument("--format", choices=["webp", "png", "jpg"], default="webp",
                        help="Formato de imagen de salida (default: webp)")
    parser.add_argument("--quality", type=int, default=85,
                        help="Calidad de compresión (1-100, default: 85)")
    args = parser.parse_args()

    # Resolver directorio de uploads
    if args.uploads_dir:
        uploads_base = Path(args.uploads_dir)
    else:
        # Intentar resolver relativo al script o al cwd
        candidates = [
            Path(__file__).parent.parent / "static" / "uploads",
            Path.cwd() / "static" / "uploads",
            Path("/var/lib/docker/volumes/sigab_uploads/_data"),
            Path("/opt/sigab/sigab-backend/static/uploads"),
        ]
        uploads_base = next((c for c in candidates if c.parent.exists()), candidates[0])

    ref_dir = uploads_base / "referenciales"

    print("=" * 65)
    print("  SIGAB — Pipeline de Imágenes Referenciales (S6)")
    print("=" * 65)
    print(f"  Modo:         {'DRY-RUN (sin cambios)' if args.dry_run else 'PRODUCCIÓN'}")
    print(f"  Límite:       {args.limit or 'sin límite'}")
    print(f"  Formato:      {args.format} (calidad: {args.quality})")
    print(f"  Directorio:   {ref_dir}")
    print(f"  Timestamp:    {datetime.now().isoformat()}")
    print("=" * 65)

    # Conectar a BD
    try:
        conn = get_db_connection(db_url=args.db_url, env_path=args.env_file)
        print("\n✓ Conexión a base de datos establecida.")
    except Exception as e:
        print(f"\n✗ Error de conexión a BD: {e}")
        sys.exit(1)

    # Buscar equipos sin foto
    equipos = fetch_equipos_sin_foto(conn, limit=args.limit)
    print(f"✓ Equipos sin imagen encontrados: {len(equipos)}")

    if not equipos:
        print("\n  No hay equipos pendientes. ¡Todo al día!")
        conn.close()
        return

    # Crear directorio si no existe
    if not args.dry_run:
        ref_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ Directorio creado/verificado: {ref_dir}")

    # Procesar equipos
    ok = 0
    errors = []
    print(f"\n  Procesando {len(equipos)} equipos...\n")

    for i, eq in enumerate(equipos, 1):
        serie_safe = (eq["serie"] or "NOSERIE").replace("/", "_").replace("\\", "_")
        filename = f"referencial_{eq['id']}_{serie_safe}.{args.format}"
        rel_url = f"/static/uploads/referenciales/{filename}"
        filepath = ref_dir / filename

        status_icon = "○" if args.dry_run else "●"
        print(f"  {status_icon} [{i}/{len(equipos)}] ID={eq['id']:<6} Serie={eq['serie']:<20} → {filename}")

        if args.dry_run:
            ok += 1
            continue

        try:
            img = generate_image(eq)
            save_kwargs = {}
            if args.format == "webp":
                save_kwargs = {"quality": args.quality, "method": 4}
            elif args.format == "jpg":
                save_kwargs = {"quality": args.quality, "optimize": True}
            elif args.format == "png":
                save_kwargs = {"optimize": True}

            img.save(str(filepath), **save_kwargs)
            update_equipo_imagen(conn, eq["id"], rel_url)
            ok += 1
        except Exception as e:
            errors.append({"id": eq["id"], "serie": eq["serie"], "error": str(e)})
            print(f"    ✗ Error: {e}")

    # Resumen
    print("\n" + "=" * 65)
    print("  RESUMEN")
    print("=" * 65)
    print(f"  Total procesados:  {len(equipos)}")
    print(f"  Exitosos:          {ok}")
    print(f"  Errores:           {len(errors)}")
    if not args.dry_run and ok > 0:
        print(f"  Directorio:        {ref_dir}")
        # Verificar tamaño total
        total_size = sum(f.stat().st_size for f in ref_dir.iterdir() if f.is_file())
        print(f"  Espacio usado:     {total_size / 1024:.1f} KB ({total_size / (1024*1024):.2f} MB)")

    if errors:
        print("\n  Errores encontrados:")
        for err in errors[:10]:
            print(f"    ID={err['id']} Serie={err['serie']}: {err['error']}")
        if len(errors) > 10:
            print(f"    ... y {len(errors) - 10} más.")

    print("=" * 65)
    conn.close()


if __name__ == "__main__":
    main()
