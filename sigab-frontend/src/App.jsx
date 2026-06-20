import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import EquipoPublico from './pages/EquipoPublico';
import TVDashboard from './pages/TVDashboard';
import Dashboard from './pages/Dashboard';
import Equipos from './pages/Equipos';
import Ordenes from './pages/Ordenes';
import Trazabilidad from './pages/Trazabilidad';
import Preventivos from './pages/Preventivos';
import Alertas from './pages/Alertas';
import Analitica from './pages/Analitica';
import Reportes from './pages/Reportes';
import Tecnovigilancia from './pages/Tecnovigilancia';
import Copilot from './pages/Copilot';
import AuditPage from './pages/AuditPage';
import ChecklistPage from './pages/ChecklistPage';
import Almacen from './pages/Almacen';
import Metrologia from './pages/Metrologia';
import Capacitaciones from './pages/Capacitaciones';
import QRBatch from './pages/QRBatch';
import QRScanner from './pages/QRScanner';
import AdminGlobal from './pages/AdminGlobal';
import CommandCenter from './pages/CommandCenter';
import Reservas from './pages/Reservas';
import Formatos from './pages/Formatos';
import LandingPage from './pages/LandingPage';
import SuperAdmin from './pages/SuperAdmin';
import DashboardV3, { DashboardV3Content } from './pages/DashboardV3';


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Toaster position="top-right" theme="light" />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/equipo/:token" element={<EquipoPublico />} />
          <Route path="/scan" element={<QRScanner />} />
          <Route path="/tv" element={<TVDashboard />} />
          {/* SIGAB v3.0 — preview público de diseño (sin auth) */}
          <Route path="/v3" element={<DashboardV3 />} />
          {/* Preview del SHELL real (Layout/Sidebar/Header) con tema verde IMSS */}
          <Route path="/v3app" element={<Layout />}>
            <Route index element={<DashboardV3Content />} />
          </Route>

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
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
