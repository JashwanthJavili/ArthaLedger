import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Settings, Moon, Sun, Bell, BellOff,
  DollarSign, Download, LogOut, User, Shield, ChevronRight,
  Lock, Eye, EyeOff, CheckCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import Toast from '../components/common/Toast'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-amber-500' : 'bg-stone-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingRow({ icon: Icon, iconBg = 'bg-amber-50', iconColor = 'text-amber-700', label, description, right }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-shrink-0 rounded-xl p-2 ${iconBg}`}>
          <Icon size={15} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-700 leading-tight">{label}</p>
          {description && <p className="text-xs text-stone-400 mt-0.5 truncate">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout, changePassword } = useAuth()
  const { projects, booksByProject, entriesByBook } = useAppData()

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sl_dark') === 'true')
  const [notifications, setNotifications] = useState(() => localStorage.getItem('sl_notif') !== 'false')
  const [currency, setCurrency] = useState(() => localStorage.getItem('sl_currency') || 'INR')
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2000)
  }

  useEffect(() => { localStorage.setItem('sl_dark', darkMode) }, [darkMode])
  useEffect(() => { localStorage.setItem('sl_notif', notifications) }, [notifications])
  useEffect(() => { localStorage.setItem('sl_currency', currency) }, [currency])
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode) }, [darkMode])

  const handleChangePw = async (e) => {
    e.preventDefault()
    setPwError('')
    if (!oldPw) { setPwError('Enter your current password.'); return }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return }
    if (oldPw === newPw) { setPwError('New password must be different from the current one.'); return }
    setPwLoading(true)
    try {
      await changePassword(oldPw, newPw)
      setPwSuccess(true)
      setOldPw(''); setNewPw(''); setConfirmPw('')
      showToast('Password changed successfully ✓')
      setTimeout(() => { setPwSuccess(false); setShowChangePw(false) }, 2000)
    } catch (err) {
      setPwError(err.message || 'Failed to change password.')
    } finally {
      setPwLoading(false)
    }
  }

  const handleExport = () => {
    const allData = {
      exportedAt: new Date().toISOString(),
      user: { email: user?.email, displayName: user?.displayName },
      projects: projects.map((p) => ({
        ...p,
        books: (booksByProject[p.id] || []).map((b) => ({
          ...b,
          entries: entriesByBook[b.id] || [],
        })),
      })),
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `santham_ledger_export_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported successfully')
  }

  const totalProjects = projects.length
  const totalBooks = Object.values(booksByProject).flat().length
  const totalEntries = Object.values(entriesByBook).flat().length

  // Detect if user signed in with Google (no password provider)
  const isPasswordUser = user?.providerData?.some((p) => p.providerId === 'password')

  return (
    <LayoutShell>
      <div className="space-y-4 sm:space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors"
          >
            <ArrowLeft size={13} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-100 p-2">
              <Settings size={14} className="text-amber-700" />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-stone-800">Settings</h1>
          </div>
        </div>

        {/* ── Profile card ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/88 p-4 sm:p-5 shadow-sm"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Profile</h2>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 p-3.5">
              <User size={22} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-800 truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-stone-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Projects', value: totalProjects },
              { label: 'Books', value: totalBooks },
              { label: 'Entries', value: totalEntries },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-amber-50/60 p-2.5 text-center">
                <p className="text-base font-bold text-stone-700">{s.value}</p>
                <p className="text-[10px] text-stone-400">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Appearance ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/88 p-4 sm:p-5 shadow-sm space-y-3"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Appearance</h2>
          <SettingRow
            icon={darkMode ? Moon : Sun}
            label="Dark Mode"
            description="Switch to a darker theme"
            right={<Toggle checked={darkMode} onChange={() => setDarkMode((v) => !v)} />}
          />
          <div className="border-t border-amber-50" />
          <SettingRow
            icon={Sun}
            label="Light Devotional Mode"
            description="Warm saffron tones (default)"
            right={<Toggle checked={!darkMode} onChange={() => setDarkMode(false)} />}
          />
        </motion.section>

        {/* ── Notifications ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/88 p-4 sm:p-5 shadow-sm space-y-3"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Notifications</h2>
          <SettingRow
            icon={notifications ? Bell : BellOff}
            label="Push Notifications"
            description="Reminders and updates"
            right={<Toggle checked={notifications} onChange={() => setNotifications((v) => !v)} />}
          />
        </motion.section>

        {/* ── Currency ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/88 p-4 sm:p-5 shadow-sm space-y-3"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Currency</h2>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-xl bg-amber-50 p-2">
              <DollarSign size={15} className="text-amber-700" />
            </div>
            <select
              value={currency}
              onChange={(e) => { setCurrency(e.target.value); showToast('Currency updated') }}
              className="flex-1 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-700 focus:border-amber-300 focus:bg-white transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </motion.section>

        {/* ── Change Password (only for email/password users) ── */}
        {isPasswordUser && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/88 p-4 sm:p-5 shadow-sm"
          >
            <button
              onClick={() => { setShowChangePw((v) => !v); setPwError(''); setPwSuccess(false) }}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2"><Lock size={15} className="text-amber-700" /></div>
                <div className="text-left">
                  <p className="text-sm font-medium text-stone-700">Change Password</p>
                  <p className="text-xs text-stone-400">Update your account password</p>
                </div>
              </div>
              <ChevronRight size={15} className={`text-stone-400 transition-transform ${showChangePw ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showChangePw && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleChangePw}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3 border-t border-amber-50 mt-4">
                    {/* Current password */}
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showOld ? 'text' : 'password'}
                          value={oldPw}
                          onChange={(e) => { setOldPw(e.target.value); setPwError('') }}
                          placeholder="Your current password"
                          className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 pr-10 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                          autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setShowOld(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                          {showOld ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                    {/* New password */}
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPw}
                          onChange={(e) => { setNewPw(e.target.value); setPwError('') }}
                          placeholder="Min. 6 characters"
                          className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 pr-10 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                          autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                          {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                    {/* Confirm new password */}
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => { setConfirmPw(e.target.value); setPwError('') }}
                        placeholder="Re-enter new password"
                        className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                        autoComplete="new-password"
                      />
                    </div>

                    {pwError && (
                      <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">{pwError}</p>
                    )}
                    {pwSuccess && (
                      <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle size={13} /> Password changed successfully!
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-60"
                    >
                      {pwLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {/* ── Data & Account ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/88 p-4 sm:p-5 shadow-sm space-y-2"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Data & Account</h2>

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 rounded-xl border border-amber-100 px-4 py-3 text-sm text-stone-700 hover:bg-amber-50 transition-colors"
          >
            <div className="rounded-xl bg-amber-50 p-1.5"><Download size={14} className="text-amber-700" /></div>
            <span className="flex-1 text-left">Export All Data (JSON)</span>
            <ChevronRight size={14} className="text-stone-400" />
          </button>

          <button
            className="w-full flex items-center gap-3 rounded-xl border border-stone-100 px-4 py-3 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <div className="rounded-xl bg-stone-50 p-1.5"><Shield size={14} className="text-stone-500" /></div>
            <span className="flex-1 text-left">Privacy Policy</span>
            <ChevronRight size={14} className="text-stone-400" />
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            <div className="rounded-xl bg-red-100 p-1.5"><LogOut size={14} className="text-red-600" /></div>
            <span className="flex-1 text-left">Sign Out</span>
          </button>
        </motion.section>

        {/* App info */}
        <div className="text-center py-2 pb-4">
          <p className="text-xs text-stone-300">Santham Ledger v1.0</p>
          <p className="text-[10px] text-stone-300 italic mt-0.5">"Santham" means peace and calm 🙏</p>
        </div>
      </div>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </LayoutShell>
  )
}
