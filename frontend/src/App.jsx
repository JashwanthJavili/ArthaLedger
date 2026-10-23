import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { applyUpdateIfReady } from './lib/appUpdate'
import { useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppDataProvider } from './context/AppDataContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import { lockAll } from './lib/pin'
import LandingPage from './pages/LandingPage'
import PrivacyPage from './pages/PrivacyPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import BookPage from './pages/BookPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import VaultPage from './pages/VaultPage'
import ExpenseGroupsPage from './pages/ExpenseGroupsPage'
import ExpenseGroupDetailPage from './pages/ExpenseGroupDetailPage'
import { useAuth } from './context/AuthContext'
import Loader from './components/common/Loader'
import { ensurePushRegistration, syncReminderFromFirebase } from './lib/notifications'

function VerifyEmailRoute({ children }) {
  const { user, loading, isEmailVerified, needsEmailVerification } = useAuth()
  if (loading) return <Loader />
  if (user && isEmailVerified) return <Navigate to="/dashboard" replace />
  if (needsEmailVerification) return children
  return <Navigate to="/login" replace />
}

function HomeRoute() {
  const { user, loading, isEmailVerified } = useAuth()
  if (loading) return <Loader />
  if (user && isEmailVerified) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

// Once signed in: pull reminder settings and (re)register this device for
// push, so reminders reach it even when the app is closed.
// A newer build found in the background is applied on the next page change
function UpdateOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => { applyUpdateIfReady() }, [pathname])
  return null
}

function PushSync() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user?.uid) return
    // Keep this device's push token fresh only while a reminder is on
    const refresh = () => syncReminderFromFirebase().then((r) => { if (r?.enabled) ensurePushRegistration() })
    refresh()
    const handleVisChange = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', handleVisChange)
    return () => document.removeEventListener('visibilitychange', handleVisChange)
  }, [user?.uid])
  return null
}

export default function App() {
  // Lock all PIN-protected items when app comes back from background after 5 min
  useEffect(() => {
    let hiddenAt = null
    const LOCK_AFTER_MS = 5 * 60 * 1000

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
      } else {
        if (hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MS) lockAll()
        hiddenAt = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return (
    <AuthProvider>
      <PushSync />
      <UpdateOnNavigate />
      <AppDataProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/verify-email"    element={<VerifyEmailRoute><VerifyEmailPage /></VerifyEmailRoute>} />
          <Route path="/dashboard"       element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/analytics"       element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/trips"           element={<ProtectedRoute><ExpenseGroupsPage /></ProtectedRoute>} />
          <Route path="/trips/:tripId"   element={<ProtectedRoute><ExpenseGroupDetailPage /></ProtectedRoute>} />
          <Route path="/settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/vault"           element={<ProtectedRoute><VaultPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId"                    element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId/books/:bookId"      element={<ProtectedRoute><BookPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppDataProvider>
    </AuthProvider>
  )
}
