import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import 'dayjs/locale/pt-br'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AdminDashboard from './pages/admin/Dashboard'
import MapPage from './pages/admin/Map'
import PersonnelPage from './pages/admin/Personnel'
import ReportsPage from './pages/admin/Reports'
import AgentDashboard from './pages/agent/Dashboard'
import NewOccurrence from './pages/agent/NewOccurrence'
import PatrolReport from './pages/agent/PatrolReport'
import VehicleChecklist from './pages/agent/VehicleChecklist'
import Login from './pages/Login'
import PrivateRoute from './components/PrivateRoute'

export default function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Agent area */}
            <Route
              path="/agent"
              element={<PrivateRoute roles={['agent', 'inspector', 'commander', 'dispatcher']} />}
            >
              <Route index element={<AgentDashboard />} />
              <Route path="occurrence/new" element={<NewOccurrence />} />
              <Route path="patrol-report" element={<PatrolReport />} />
              <Route path="vehicle-checklist" element={<VehicleChecklist />} />
            </Route>

            {/* Admin area */}
            <Route
              path="/admin"
              element={<PrivateRoute roles={['inspector', 'commander', 'dispatcher']} />}
            >
              <Route index element={<AdminDashboard />} />
              <Route path="map" element={<MapPage />} />
              <Route path="personnel" element={<PersonnelPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/agent" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LocalizationProvider>
  )
}
