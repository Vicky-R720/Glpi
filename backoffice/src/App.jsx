import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'
import Accueil from './page/Accueil.jsx'
import Reset from './page/Reset.jsx'
import LoginPage from './page/LoginPage.jsx'
import ImportPage from './page/ImportPage.jsx'
import { AuthProvider, useAuth } from './service/AuthContext.jsx'

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
            <Route path="/accueil" element={<Accueil />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/reset" element={<Reset />} />
            {/* Redirect other views to dashboard or reset */}
            <Route path="/computers" element={<Navigate to="/accueil" replace />} />
            <Route path="/monitors" element={<Navigate to="/accueil" replace />} />
            <Route path="/tickets" element={<Navigate to="/accueil" replace />} />
            <Route path="*" element={<Navigate to="/accueil" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default RootRouter
