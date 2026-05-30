import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Portal público (componentes existentes)
import PublicApp from './PublicApp'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './pages/panel/ProtectedRoute'
import PanelLayout from './pages/panel/PanelLayout'

const HubPage        = lazy(() => import('./pages/panel/HubPage'))
const DashboardPage  = lazy(() => import('./pages/panel/DashboardPage'))
const MonitorPage    = lazy(() => import('./pages/panel/MonitorPage'))
const SIGABAppPage   = lazy(() => import('./pages/panel/SIGABAppPage'))
const OrdenesPage    = lazy(() => import('./pages/panel/OrdenesPage'))
const MantenimientosPage = lazy(() => import('./pages/panel/MantenimientosPage'))
const TerminalPage   = lazy(() => import('./pages/panel/TerminalPage'))
const AgentesPage    = lazy(() => import('./pages/panel/AgentesPage'))
const TokensPage     = lazy(() => import('./pages/panel/TokensPage'))
const ObsidianPage   = lazy(() => import('./pages/panel/ObsidianPage'))

const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-5 h-5 border-2 border-sigah-blue border-t-transparent rounded-full animate-spin" />
  </div>
)

const wrap = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

export const router = createBrowserRouter([
  { path: '/',      element: <PublicApp /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      path: '/panel',
      element: <PanelLayout />,
      children: [
        { index: true, element: <Navigate to="hub" replace /> },
        { path: 'hub',                element: wrap(<HubPage />) },
        { path: 'dashboard',          element: wrap(<DashboardPage />) },
        { path: 'monitor',            element: wrap(<MonitorPage />) },
        { path: 'sigab',              element: wrap(<SIGABAppPage />) },
        { path: 'ordenes',            element: wrap(<OrdenesPage />) },
        { path: 'mantenimientos',     element: wrap(<MantenimientosPage />) },
        { path: 'terminal',           element: wrap(<TerminalPage />) },
        { path: 'agentes',            element: wrap(<AgentesPage />) },
        { path: 'tokens',             element: wrap(<TokensPage />) },
        { path: 'cerebro',            element: wrap(<ObsidianPage />) },
        { path: 'cerebro/:equipo',    element: wrap(<ObsidianPage />) },
      ],
    }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
