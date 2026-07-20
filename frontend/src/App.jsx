import { Navigate, Route, Routes } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import BookPage from './pages/BookPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import VaultPage from './pages/VaultPage'
import ExpenseGroupsPage from './pages/ExpenseGroupsPage'
import ExpenseGroupDetailPage from './pages/ExpenseGroupDetailPage'
import SplashScreen from './components/common/SplashScreen'
import { useAuth } from './context/AuthContext'
import Loader from './components/common/Loader'
import { checkAndTriggerDailyReminder } from './lib/notifications'

function VerifyEmailRoute({ children }) {
  const { user, loading, isEmailVerified, needsEmailVerification } = useAuth()
  if (loading) return <Loader text="Preparing your space..." />
  if (user && isEmailVerified) return <Navigate to="/dashboard" replace />
  if (needsEmailVerification) return children
  return <Navigate to="/login" replace />
}

function HomeRoute() {
  const { user, loading, isEmailVerified } = useAuth()
  if (loading) return <Loader text="Preparing your space..." />
  if (user && isEmailVerified) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

export default function App() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone

  // Show full splash only on the very first visit in a PWA session.
  // sessionStorage is cleared on tab close but persists across refreshes,
  // so a page refresh skips the full animation and goes straight to the app.
  const isFirstVisit = !sessionStorage.getItem('al_visited')
  const [splashDone, setSplashDone] = useState(!isStandalone || !isFirstVisit)

  const handleSplashDone = () => {
    sessionStorage.setItem('al_visited', '1')
    setSplashDone(true)
  }

  useEffect(() => {
    checkAndTriggerDailyReminder()
    const interval = setInterval(checkAndTriggerDailyReminder, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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
      <AppDataProvider>
        {!splashDone && <SplashScreen onDone={handleSplashDone} />}
        <Routes>
          <Route path="/" element={<HomeRoute />} />
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
