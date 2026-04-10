import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
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

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/equipo/:token" element={<EquipoPublico />} />
          <Route path="/tv" element={<TVDashboard />} />
          <Route path="/analitica" element={<Layout><Analitica /></Layout>} />
          
          {/* Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="equipos" element={<Equipos />} />
              <Route path="ordenes" element={<Ordenes />} />
              <Route path="trazabilidad" element={<Trazabilidad />} />
              <Route path="preventivos" element={<Preventivos />} />
              <Route path="alertas" element={<Alertas />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="tecnovigilancia" element={<Tecnovigilancia />} />
              <Route path="copilot" element={<Copilot />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
