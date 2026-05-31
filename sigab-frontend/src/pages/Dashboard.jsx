/**
 * @module pages/Dashboard
 * @description Centro de Control principal del sistema SIGAH.
 *
 * Muestra KPIs en tiempo real vía SSE (Server-Sent Events):
 * - Total de equipos, operativos, fallas críticas, mantenimiento pendiente
 * - Gráficas de degradación y cumplimiento (Tremor + Framer Motion)
 * - Mapa interactivo del hospital con zonas y equipos por zona
 * - Modal de Triple Validación Poka-Yoke (QR + Inventario + Serie)
 *
 * NOTA: La tabla de 751 equipos se movió exclusivamente al módulo de Inventario (/equipos).
 *
 * @requires hooks/useDashboard — Datos del dashboard
 * @requires hooks/useSSE — Suscripción a eventos en tiempo real
 * @requires components/HospitalMap — Mapa SVG interactivo
 * @requires @tremor/react — Componentes de UI para data viz
 */
import { useDashboard } from '../hooks/useDashboard';
import { useSSE } from '../hooks/useSSE';
import { useResponsive } from '../hooks/useResponsive';
import AlertaBanner from '../components/AlertaBanner';
import HospitalMap from '../components/HospitalMap';
import TripleValidationModal from '../components/TripleValidationModal';
import DashboardGrid, { GridItem } from '../components/layout/DashboardGrid';
import KPICard from '../components/cards/KPICard';
import StatusIndicator from '../components/cards/StatusIndicator';
import MaintenanceChart from '../components/charts/MaintenanceChart';

import {
  ShieldCheck,
  ClipboardCheck,
  Activity,
  Wrench,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Title, Text, Metric, Divider } from '@tremor/react';

export default function Dashboard() {
  const { resumen, equipos, alertas, filtros, setFiltros, loading, error, recargar } = useDashboard();
  const [showPokaYoke, setShowPokaYoke] = useState(false);
  const navigate = useNavigate();
  const { isControlRoom } = useResponsive();

  // Integrated SSE for real-time status updates
  useSSE({
    onEvent: (type, data) => {
      console.log(`[Dashboard] SSE Event: ${type}`, data);
      recargar(); // Refresh data on status change or update
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative w-16 h-16">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"
            />
            <Activity className="absolute inset-0 m-auto h-8 w-8 text-emerald-500 animate-pulse" />
          </div>
          <p className="text-[var(--content-muted)] font-medium animate-pulse">Iniciando SIGAH Engine...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <Card className="max-w-md bg-rose-500/10 border-rose-500/20 text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <Title className="text-white">Error de Enlace</Title>
          <Text className="text-rose-200/60 mt-2">{error}</Text>
          <Divider />
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-2 bg-rose-600 hover:bg-rose-500 active:scale-[0.97] text-white text-sm font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]"
          >
            Reintentar conexión
          </button>
        </Card>
      </div>
    );
  }

  const alertasCriticas = alertas.filter((a) => a.prioridad === 'critica');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 md:p-6 lg:p-8"
    >
      {/* Header Conquistador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <motion.div variants={containerVariants} className="flex items-center gap-6 md:gap-8 flex-wrap md:flex-nowrap">
          <div className="relative flex-shrink-0">
            {/* Halo contenido al área del logo (no se desparrama hacia el título) */}
            <div className="absolute inset-0 bg-emerald-500/15 blur-md rounded-full pointer-events-none" />
            <img
              src="/imss_logo.png"
              alt="IMSS Logo"
              className="relative h-14 md:h-16 w-auto object-contain brightness-110 contrast-125"
            />
          </div>
          <div className="h-12 w-px bg-[var(--content-surface)] hidden md:block flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>CENTRO DE CONTROL</span>
              <span className="text-emerald-500">SIGAH</span>
            </h1>
            <p className="text-[var(--content-muted)] text-sm md:text-base font-medium mt-1">
              HGR No.1 — IMSS | <span className="text-emerald-500/80">Monitor Biotecnológico en Tiempo Real</span>
            </p>
          </div>
        </motion.div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowPokaYoke(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">Poka-Yoke</span>
          </button>
          <button
            onClick={() => navigate('/checklists')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#006CB7]/20 border border-[#006CB7]/40 text-[#5bb3e8] rounded-xl hover:bg-[#006CB7] hover:text-white active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006CB7]/50"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">NOM-016</span>
          </button>
        </div>
      </div>

      <TripleValidationModal 
        isOpen={showPokaYoke} 
        onClose={() => setShowPokaYoke(false)}
        onValidated={(eq) => console.log("Validado:", eq)} 
      />

      {/* Alertas Críticas */}
      <AnimatePresence>
        {alertasCriticas.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8"
          >
            <AlertaBanner alertas={alertasCriticas} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Core Grid Stack */}
      <DashboardGrid>
        {/* KPI Row */}
        <KPICard 
          title="Total Activos" 
          value={resumen?.total || 0} 
          unit="Equipos" 
          icon={Activity} 
          color="blue" 
        />
        <KPICard 
          title="Operativos" 
          value={resumen?.operativos || 0} 
          trend="up" 
          icon={Zap} 
          color="emerald" 
        />
        <KPICard 
          title="Fallas Críticas" 
          value={alertasCriticas.length} 
          trend={alertasCriticas.length > 3 ? "up" : "neutral"} 
          icon={AlertTriangle} 
          color="rose" 
        />
        {isControlRoom && (
          <KPICard 
            title="Mantenimiento Due" 
            value={resumen?.mantenimiento_proximo || 0} 
            icon={Wrench} 
            color="amber" 
          />
        )}

        {/* Mapa de Activos — ancho completo */}
        <GridItem span={isControlRoom ? 4 : 3}>
          <Card className="bg-[var(--content-bg)]/40 border-[var(--content-border)] backdrop-blur-sm p-0 overflow-hidden">
            <div className="p-5 border-b border-[var(--content-border)] flex items-center justify-between">
              <Title className="text-white">Mapa de Activos por Zona</Title>
              <StatusIndicator status="green" icon="Wifi" />
            </div>
            <div className="p-5">
              <HospitalMap />
            </div>
          </Card>
        </GridItem>

        {/* Cumplimiento de Mantenimiento — debajo del mapa */}
        <GridItem span={isControlRoom ? 4 : 3}>
          <Card className="bg-[var(--content-bg)]/40 border-[var(--content-border)] backdrop-blur-sm">
            <Title className="text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
              Cumplimiento de Mantenimiento
            </Title>
            <Text className="text-[var(--content-muted)] text-xs mb-6">Programado vs. Ejecutado por mes</Text>
            <MaintenanceChart />
          </Card>
        </GridItem>
      </DashboardGrid>
    </motion.div>
  );
}
