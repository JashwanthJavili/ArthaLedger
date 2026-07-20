import { Navigate } from 'react-router-dom'
import Loader from './common/Loader'
import { useAuth } from '../context/AuthContext'

/**
 * Redirects authenticated users away from public pages (login, register).
 * - Verified user → /dashboard
 * - Needs verification (signed in unverified OR just registered) → /verify-email
 * - Not logged in → show the page
 */
export default function PublicRoute({ children }) {
  const { user, loading, isEmailVerified, needsEmailVerification } = useAuth()

  if (loading) return <Loader text="Preparing your space..." />
  if (needsEmailVerification) return <Navigate to="/verify-email" replace />
  if (user && isEmailVerified) return <Navigate to="/dashboard" replace />

  return children
}
