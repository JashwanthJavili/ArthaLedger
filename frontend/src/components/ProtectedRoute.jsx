import { Navigate } from 'react-router-dom'
import Loader from './common/Loader'
import { useAuth } from '../context/AuthContext'

/**
 * Guards all authenticated routes.
 * - Loading → spinner
 * - Not logged in → /login
 * - Logged in but email not verified → /verify-email
 * - Pending verification (just registered, signed out) → /verify-email
 * - Logged in + verified → render children
 */
export default function ProtectedRoute({ children }) {
  const { user, loading, isEmailVerified, needsEmailVerification } = useAuth()

  if (loading) return <Loader text="Preparing your space..." />
  if (needsEmailVerification) return <Navigate to="/verify-email" replace />
  if (!user) return <Navigate to="/login" replace />
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />

  return children
}
