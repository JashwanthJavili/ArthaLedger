import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import BookPage from './pages/BookPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import { useAuth } from './context/AuthContext'
import Loader from './components/common/Loader'

/**
 * Guard for /verify-email:
 * - Loading → spinner
 * - Logged in + already verified → /dashboard
 * - Has pending verification (just registered, signed out) → show page
 * - Logged in but unverified → show page
 * - No user and no pending email → /login
 */
function VerifyEmailRoute({ children }) {
  const { user, loading, isEmailVerified, needsEmailVerification } = useAuth()
  if (loading) return <Loader text="Preparing your space..." />
  if (user && isEmailVerified) return <Navigate to="/dashboard" replace />
  if (needsEmailVerification) return children
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public routes — redirect logged-in users away */}
          <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {/* Email verification waiting room */}
          <Route path="/verify-email" element={<VerifyEmailRoute><VerifyEmailPage /></VerifyEmailRoute>} />

          {/* Protected routes — require login + verified email */}
          <Route path="/dashboard"   element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/analytics"   element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/settings"    element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId"                    element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/books/:bookId"      element={<ProtectedRoute><BookPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppDataProvider>
    </AuthProvider>
  )
}
