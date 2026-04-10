from datetime import datetime, date
import aiomysql

async def obtener_metricas_fiabilidad(conn):
    """Calcula MTBF, MTTR y riesgo predictivo por equipo."""
    async with conn.cursor(aiomysql.DictCursor) as cur:
        # 1. Obtener base de equipos
        await cur.execute(
            """
            SELECT e.id, e.serie, e.nombre, e.marca, e.modelo, e.estado,
                   e.criticidad, e.fecha_instalacion, e.fecha_ultimo_mantenimiento,
                   (SELECT COUNT(*) FROM ordenes_servicio os 
                    WHERE os.equipo_id = e.id AND os.tipo_mantenimiento = 'correctivo') as total_fallas,
                   (SELECT MAX(fecha) FROM ordenes_servicio os 
                    WHERE os.equipo_id = e.id AND os.tipo_mantenimiento = 'correctivo') as ultima_falla
            FROM equipos e
            WHERE e.estado != 'baja'
            """
        )
        equipos = await cur.fetchall()

        # 2. Obtener historial general para MTTR
        await cur.execute(
            """
            SELECT equipo_id, created_at, closed_at
            FROM ordenes_servicio
            WHERE tipo_mantenimiento = 'correctivo' AND estado = 'cerrada'
              AND closed_at IS NOT NULL
            """
        )
        ordenes = await cur.fetchall()

    # Procesar MTTR por equipo
    tiempos_reparacion = {} # equipo_id -> list of hours
    for o in ordenes:
        eq_id = o['equipo_id']
        delta = o['closed_at'] - o['created_at']
        horas = delta.total_seconds() / 3600.0
        if eq_id not in tiempos_reparacion:
            tiempos_reparacion[eq_id] = []
        tiempos_reparacion[eq_id].append(horas)

    # Calcular MTBF, MTTR y Riesgo Predictivo
    resultados = []
    hoy = date.today()
    
    # Calcular promedios globales como fallback
    global_mtbf_days = 90  # Default 3 meses
    
    for eq in equipos:
        eq_id = eq['id']
        
        # Días operando desde instalación (si no hay, asumimos 365 días)
        fecha_inicio = eq['fecha_instalacion'] if eq['fecha_instalacion'] else (hoy.replace(year=hoy.year-1))
        # Validar si es date o datetime y convertir a date
        if isinstance(fecha_inicio, datetime):
            fecha_inicio = fecha_inicio.date()
        elif type(fecha_inicio) is str:
             try:
                 fecha_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
             except:
                 fecha_inicio = hoy.replace(year=hoy.year-1)

        dias_totales = (hoy - fecha_inicio).days
        if dias_totales < 1:
            dias_totales = 1
            
        fallas = eq['total_fallas'] or 0
        
        # MTBF (Mean Time Between Failures) = Total Uptime / Number of Failures
        mtbf = round(dias_totales / fallas) if fallas > 0 else dias_totales
        
        # MTTR (Mean Time To Repair) = Total Repair Time / Number of Repairs
        lista_tr = tiempos_reparacion.get(eq_id, [])
        mttr = round(sum(lista_tr) / len(lista_tr), 2) if len(lista_tr) > 0 else 0
        
        # Calcular días desde última falla
        uf_date = eq['ultima_falla']
        if isinstance(uf_date, datetime):
            uf_date = uf_date.date()
            
        if uf_date:
             dias_desde_falla = (hoy - uf_date).days
        else:
             dias_desde_falla = dias_totales
             
        # Riesgo Predictivo
        # Si ya pasó más del 90% de su MTBF sin fallar, está en riesgo inminente de fallar pronto.
        riesgo = "Bajo"
        alerta_color = "green"
        probabilidad = 0
        
        if mtbf > 0:
             probabilidad = round((dias_desde_falla / mtbf) * 100, 1)
             
        if probabilidad >= 90:
             riesgo = "Crítico"
             alerta_color = "red"
        elif probabilidad >= 75:
             riesgo = "Medio"
             alerta_color = "orange"
             
        resultados.append({
            "equipo_id": eq_id,
            "serie": eq['serie'],
            "nombre": eq['nombre'],
            "marca": eq['marca'],
            "modelo": eq['modelo'],
            "criticidad": eq['criticidad'],
            "mtbf_dias": mtbf,
            "mttr_horas": mttr,
            "dias_desde_falla": dias_desde_falla,
            "probabilidad_falla_pct": probabilidad,
            "riesgo": riesgo,
            "color": alerta_color
        })

    return sorted(resultados, key=lambda x: x['probabilidad_falla_pct'], reverse=True)
