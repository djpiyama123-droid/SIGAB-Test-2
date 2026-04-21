/**
 * @module pages/Dashboard
 * @description Centro de Control principal del sistema SIGAB.
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
          <p className="text-slate-400 font-medium animate-pulse">Iniciando SIGAB Engine...</p>
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
            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
          >
            Reintentar Conexión
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
        <motion.div variants={containerVariants} className="flex items-center gap-5">
          <div className="relative">
            <div className="absolute -inset-1 bg-emerald-500/20 blur-lg rounded-full animate-pulse" />
            <img 
              src="/imss_logo.png" 
              alt="IMSS Logo" 
              className="relative h-14 md:h-16 w-auto object-contain brightness-110 contrast-125"
            />
          </div>
          <div className="h-12 w-px bg-slate-800 hidden md:block" />
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-2">
              CENTRO DE CONTROL <span className="text-emerald-500">SIGAB</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base font-medium mt-1">
              HGR No.1 — IMSS | <span className="text-emerald-500/80">Monitor Biotecnológico en Tiempo Real</span>
            </p>
          </div>
        </motion.div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPokaYoke(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-900/10"
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="font-bold text-sm hidden sm:inline">Poka-Yoke</span>
          </button>
          <button 
            onClick={() => navigate('/checklists')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-900/10"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="font-bold text-sm hidden sm:inline">NOM-016</span>
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
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
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
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
            <Title className="text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
              Cumplimiento de Mantenimiento
            </Title>
            <Text className="text-slate-500 text-xs mb-6">Programado vs. Ejecutado por mes</Text>
            <MaintenanceChart />
          </Card>
        </GridItem>
      </DashboardGrid>
    </motion.div>
  );
}
