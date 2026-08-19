import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import SplashScreen from '../components/ui/SplashScreen'

export default function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <SplashScreen />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}
