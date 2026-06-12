import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'
import Dashboard from './page/Dashboard.jsx'
import Reset from './page/Reset.jsx'
import LoginPage from './page/LoginPage.jsx'
import Tickets from './page/Tickets.jsx'
import ItemsCost from './page/ItemsCost.jsx'
import { AuthProvider, useAuth } from './service/AuthContext.jsx'
import ImportPage from './page/ImportPage.jsx'

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

export function RootRouter() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/accueil" replace />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/reset" element={<Reset />} />
            {/* Redirect other views to dashboard or reset */}
            <Route path="/computers" element={<Navigate to="/accueil" replace />} />
            <Route path="/monitors" element={<Navigate to="/accueil" replace />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/items-cost" element={<ItemsCost />} />
            <Route path="*" element={<Navigate to="/accueil" replace />} />
            <Route path="/accueil" element={<Dashboard />} />
            <Route path="/import" element={<ImportPage />} />

          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default RootRouter
