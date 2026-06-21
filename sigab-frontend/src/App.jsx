import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const EquipoPublico = lazy(() => import('./pages/EquipoPublico'));
const TVDashboard = lazy(() => import('./pages/TVDashboard'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Equipos = lazy(() => import('./pages/Equipos'));
const Ordenes = lazy(() => import('./pages/Ordenes'));
const Trazabilidad = lazy(() => import('./pages/Trazabilidad'));
const Preventivos = lazy(() => import('./pages/Preventivos'));
const Alertas = lazy(() => import('./pages/Alertas'));
const Analitica = lazy(() => import('./pages/Analitica'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Tecnovigilancia = lazy(() => import('./pages/Tecnovigilancia'));
const Copilot = lazy(() => import('./pages/Copilot'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage'));
const Almacen = lazy(() => import('./pages/Almacen'));
const Metrologia = lazy(() => import('./pages/Metrologia'));
const Capacitaciones = lazy(() => import('./pages/Capacitaciones'));
const QRBatch = lazy(() => import('./pages/QRBatch'));
const QRScanner = lazy(() => import('./pages/QRScanner'));
const AdminGlobal = lazy(() => import('./pages/AdminGlobal'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const Reservas = lazy(() => import('./pages/Reservas'));
const Formatos = lazy(() => import('./pages/Formatos'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="h-10 w-10 rounded-full border-2 border-slate-300 border-t-sigah-emerald animate-spin" />
        <span className="text-sm">Cargando módulo…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" theme="light" />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/equipo/:token" element={<EquipoPublico />} />
              <Route path="/scan" element={<QRScanner />} />
              <Route path="/tv" element={<TVDashboard />} />

              {/* Rutas Protegidas — SuperAdmin */}
              <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="/superadmin" element={<SuperAdmin />} />
                <Route path="/" element={<Layout />}>
                  <Route path="admin-global" element={<AdminGlobal />} />
                </Route>
              </Route>

              {/* Rutas Protegidas */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="analitica" element={<Analitica />} />
                  <Route path="equipos" element={<Equipos />} />
                  <Route path="ordenes" element={<Ordenes />} />
                  <Route path="trazabilidad" element={<Trazabilidad />} />
                  <Route path="preventivos" element={<Preventivos />} />
                  <Route path="alertas" element={<Alertas />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="tecnovigilancia" element={<Tecnovigilancia />} />
                  <Route path="copilot" element={<Copilot />} />
                  <Route path="auditoria" element={<AuditPage />} />
                  <Route path="checklists" element={<ChecklistPage />} />
                  <Route path="almacen" element={<Almacen />} />
                  <Route path="metrologia" element={<Metrologia />} />
                  <Route path="capacitaciones" element={<Capacitaciones />} />
                  <Route path="reservas" element={<Reservas />} />
                  <Route path="qrbatch" element={<QRBatch />} />
                  <Route path="command-center" element={<CommandCenter />} />
                  <Route path="formatos" element={<Formatos />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
