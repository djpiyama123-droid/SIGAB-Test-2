/**
 * SIGAB Bot — Tareas Programadas (node-cron)
 * Se ejecuta dentro de la Lenovo ThinkCentre 24/7.
 * 
 * Horarios:
 *   07:00 — Reporte matutino al grupo
 *   13:00 — Recordatorio de preventivos vencidos
 *   18:00 — Resumen de cierre del día
 *   Cada 30 min — Alerta si hay equipo nuevo fuera de servicio
 */

import cron from 'node-cron';
import { cmdReporte, cmdAlertas } from './commands.js';

const API = 'http://localhost:8000/api/openclaw';

let sendToGroup = null; // Se inyecta desde index.js

export function initScheduler(sendFn) {
  sendToGroup = sendFn;
  console.log('⏰ Scheduler SIGAB iniciado');

  // ── 07:00 — Reporte matutino ──
  cron.schedule('0 7 * * 1-6', async () => {
    console.log('[CRON] 07:00 — Reporte matutino');
    try {
      const msg = await cmdReporte();
      const saludo = `☀️ *Buenos días, equipo biomédico.*\n\n${msg}`;
      await sendToGroup(saludo);
    } catch (err) {
      console.error('[CRON] Error reporte matutino:', err.message);
    }
  }, { timezone: 'America/Tijuana' });

  // ── 13:00 — Preventivos vencidos ──
  cron.schedule('0 13 * * 1-6', async () => {
    console.log('[CRON] 13:00 — Check preventivos');
    try {
      const res = await fetch(`${API}/reporte-diario`);
      const json = await res.json();

      if (json.ok && json.preventivos_vencidos?.length > 0) {
        let msg = `⏰ *Recordatorio de preventivos vencidos*\n\n`;
        json.preventivos_vencidos.forEach(p => {
          msg += `🔧 ${p.nombre} (${p.serie})\n   ${p.tipo_preventivo}\n\n`;
        });
        msg += `_Favor de programar con el Ing. de turno._`;
        await sendToGroup(msg);
      }
    } catch (err) {
      console.error('[CRON] Error preventivos:', err.message);
    }
  }, { timezone: 'America/Tijuana' });

  // ── 18:00 — Resumen de cierre ──
  cron.schedule('0 18 * * 1-6', async () => {
    console.log('[CRON] 18:00 — Resumen cierre');
    try {
      const msg = await cmdReporte();
      const cierre = `🌙 *Resumen de cierre — Turno vespertino*\n\n${msg}`;
      await sendToGroup(cierre);
    } catch (err) {
      console.error('[CRON] Error resumen cierre:', err.message);
    }
  }, { timezone: 'America/Tijuana' });

  // ── Cada 30 min — Check equipos fuera de servicio ──
  cron.schedule('*/30 * * * *', async () => {
    try {
      const res = await fetch(`${API}/reporte-diario`);
      const json = await res.json();

      if (json.ok && json.equipos_fuera_servicio?.length > 0) {
        // Solo alertar si hay equipos nuevos (se puede mejorar con cache)
        const total = json.equipos_fuera_servicio.length;
        console.log(`[CRON] ${total} equipo(s) fuera de servicio`);
        // No spamear el grupo, solo loggear
      }
    } catch (_) {}
  });

  // ── Check alertas críticas cada 15 min ──
  cron.schedule('*/15 * * * *', async () => {
    try {
      const res = await fetch(`${API}/alertas-pendientes`);
      const json = await res.json();

      const criticas = json.alertas?.filter(a => a.prioridad === 'critica') || [];
      if (criticas.length > 0) {
        let msg = `🚨 *ALERTA CRÍTICA SIGAB*\n\n`;
        criticas.slice(0, 3).forEach(a => {
          msg += `• ${a.mensaje?.slice(0, 80)}\n`;
        });
        await sendToGroup(msg);
      }
    } catch (_) {}
  });

  // ── Lunes 09:00 — Metrología check ──
  cron.schedule('0 9 * * 1', async () => {
    console.log('[CRON] 09:00 — Metrología check');
    try {
      const res = await fetch(`${API}/check-calibraciones`);
      const json = await res.json();
      if (json.ok && json.vencidas?.length > 0) {
        let msg = `🛡️ *Estatus de Metrología (Semanal)*\n\n`;
        msg += `Los siguientes instrumentos requieren calibración inmediata:\n\n`;
        json.vencidas.forEach(m => {
          msg += `• ${m.nombre} (${m.serie})\nVence: *${m.proxima_calibracion}*\n\n`;
        });
        await sendToGroup(msg);
      }
    } catch (err) {
      console.error('[CRON] Error metrología:', err.message);
    }
  }, { timezone: 'America/Tijuana' });
}
