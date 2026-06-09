import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Settings, Moon, Sun, DollarSign, Download,
  LogOut, User, Shield, ChevronRight, Lock, Eye, EyeOff,
  CheckCircle, Info, HelpCircle, ChevronDown, ChevronUp,
  Wallet, Database, Key, Globe, Smartphone, CheckCircle2, Trash2, Pencil, Phone, Calendar, Users,
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

const FAQ = [
  {
    q: 'Is my financial data secure?',
    a: 'Yes. All your data is stored in Firebase Realtime Database, which is secured by Firebase security rules — only you can read or write your own data. Data is encrypted in transit (HTTPS/TLS) and at rest by Google Cloud infrastructure.',
  },
  {
    q: 'How are passwords stored? Is my password safe?',
    a: 'ArthaLedger never stores your password. Authentication is handled entirely by Firebase Authentication (Google\'s identity platform), which uses industry-standard bcrypt hashing. Your password is never visible to us — not even in logs.',
  },
  {
    q: 'What is the hierarchy of data in ArthaLedger?',
    a: 'Your data is organized as: Account → Projects → Books (Cashbooks) → Entries. A Project can be "Family Expenses" or "Business". Each Project has multiple Books like "Monthly Budget". Each Book has individual transaction Entries.',
  },
  {
    q: 'Can I use ArthaLedger offline?',
    a: 'ArthaLedger is a Progressive Web App (PWA). The app shell loads offline, but adding or viewing entries requires an internet connection since data is stored in Firebase.',
  },
  {
    q: 'How do I install ArthaLedger on my phone?',
    a: 'On Android: open the app in Chrome, tap the three-dot menu, and select "Add to Home Screen". On iOS: open in Safari, tap the Share button, then "Add to Home Screen".',
  },
  {
    q: 'What payment modes are supported?',
    a: 'Cash, UPI, Online (net banking / wallets), and Bank Transfer. You can record any transaction under any of these modes for accurate tracking.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Go to Settings → Export All Data to download a complete JSON file of all your projects, books, and entries. You can also export individual books as a formatted PDF from the Book page.',
  },
  {
    q: 'How is the running balance calculated?',
    a: 'Each entry\'s "Balance After" is computed sequentially in chronological order. Income adds to the balance, expenses subtract. If you edit or delete a past entry, all subsequent balances are automatically recalculated.',
  },
  {
    q: 'Can multiple people use the same account?',
    a: 'Each account is tied to one email. However, you can use the "Entered By" field on each transaction to track who recorded it, making it suitable for shared family or business tracking.',
  },
  {
    q: 'What does "Artha" mean?',
    a: '"Artha" is a Sanskrit word meaning wealth, purpose, and meaning. In ancient Indian philosophy, Artha is one of the four goals of life — the pursuit of material well-being with intention and wisdom.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Currently, account deletion requires contacting support. You can export all your data first using the Export feature in Settings. We are working on a self-service account deletion feature.',
  },
  {
    q: 'Is ArthaLedger free?',
    a: 'Yes, ArthaLedger is completely free to use. There are no hidden charges, subscriptions, or premium tiers.',
  },
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
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-amber-50 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm font-medium text-stone-700 leading-snug">{q}</span>
        {open
          ? <ChevronUp size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
          : <ChevronDown size={14} className="flex-shrink-0 mt-0.5 text-stone-400" />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-3 text-xs text-stone-500 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout, changePassword, deleteAccount, updateUserProfile, getUserProfile } = useAuth()
  const { projects, booksByProject, entriesByBook } = useAppData()

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sl_dark') === 'true')
  const [currency, setCurrency] = useState(() => localStorage.getItem('sl_currency') || 'INR')
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
    }
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setInstallPrompt(null) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setIsInstalled(true); setInstallPrompt(null) }
  }

  const [showChangePw, setShowChangePw] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeletePw, setShowDeletePw] = useState(false)

  // Profile edit state
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [profileData, setProfileData] = useState({ displayName: '', phone: '', gender: '', dob: '', bio: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileFetched, setProfileFetched] = useState(false)

  // Load profile data on mount
  useEffect(() => {
    if (user && !profileFetched) {
      getUserProfile().then(data => {
        setProfileData({
          displayName: data?.displayName || user?.displayName || '',
          phone: data?.phone || '',
          gender: data?.gender || '',
          dob: data?.dob || '',
          bio: data?.bio || '',
        })
        setProfileFetched(true)
      }).catch(() => {
        setProfileData(p => ({ ...p, displayName: user?.displayName || '' }))
        setProfileFetched(true)
      })
    }
  }, [user, profileFetched, getUserProfile])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000)
  }

  useEffect(() => { localStorage.setItem('sl_dark', darkMode) }, [darkMode])
  useEffect(() => { localStorage.setItem('sl_currency', currency) }, [currency])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

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
      projects: projects.map(p => ({
        ...p,
        books: (booksByProject[p.id] || []).map(b => ({
          ...b,
          entries: entriesByBook[b.id] || [],
        })),
      })),
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arthaledger_export_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported successfully')
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteAccount(isPasswordUser ? deletePassword : undefined)
      // Account deleted — redirect to login
      window.location.href = '/login'
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openDeleteDialog = () => {
    setDeleteStep(1)
    setDeletePassword('')
    setDeleteError('')
    setShowDeletePw(false)
    setShowDeleteDialog(true)
  }

  const openEditProfile = async () => {
    setProfileError('')
    if (!profileFetched) {
      const data = await getUserProfile()
      setProfileData({
        displayName: data?.displayName || user?.displayName || '',
        phone: data?.phone || '',
        gender: data?.gender || '',
        dob: data?.dob || '',
        bio: data?.bio || '',
      })
      setProfileFetched(true)
    }
    setShowEditProfile(true)
  }
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    if (!profileData.displayName.trim()) { setProfileError('Name is required.'); return }
    if (profileData.phone && !/^\d{10}$/.test(profileData.phone.trim())) {
      setProfileError('Enter a valid 10-digit mobile number.')
      return
    }
    setProfileLoading(true)
    try {
      await updateUserProfile(profileData)
      setProfileFetched(false) // force re-fetch next time
      showToast('Profile updated ✓')
      setShowEditProfile(false)
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const totalProjects = projects.length
  const totalBooks = Object.values(booksByProject).flat().length
  const totalEntries = Object.values(entriesByBook).flat().length
  const isPasswordUser = user?.providerData?.some(p => p.providerId === 'password')

  return (
    <LayoutShell>
      <div className="space-y-3 pb-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="inline-flex items-center gap-1 rounded-xl border border-amber-100 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-amber-50 transition-colors">
            <ArrowLeft size={13} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-100 p-2"><Settings size={14} className="text-amber-700" /></div>
            <h1 className="font-serif text-xl font-semibold text-stone-800">Settings</h1>
          </div>
        </div>

        {/* Profile */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Profile</h2>
            <button
              onClick={openEditProfile}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Pencil size={11} /> Edit
            </button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 p-3">
              <User size={20} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-800 truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-stone-400 truncate">{user?.email}</p>
              <p className="text-[10px] text-stone-300 mt-0.5">
                {isPasswordUser ? 'Email & Password account' : 'Google account'}
              </p>
            </div>
          </div>

          {/* Profile details rows — same style as name/email */}
          <div className="space-y-1.5 mb-3">
            {profileData.phone && (
              <div className="flex items-center gap-2.5">
                <Phone size={12} className="flex-shrink-0 text-amber-600" />
                <span className="text-xs text-stone-600">+91 {profileData.phone}</span>
              </div>
            )}
            {profileData.gender && (
              <div className="flex items-center gap-2.5">
                <Users size={12} className="flex-shrink-0 text-amber-600" />
                <span className="text-xs text-stone-600 capitalize">{profileData.gender}</span>
              </div>
            )}
            {profileData.dob && (
              <div className="flex items-center gap-2.5">
                <Calendar size={12} className="flex-shrink-0 text-amber-600" />
                <span className="text-xs text-stone-600">
                  {new Date(profileData.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
            {profileData.bio && (
              <p className="text-xs text-stone-400 italic leading-relaxed pl-5">{profileData.bio}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Projects', value: totalProjects }, { label: 'Books', value: totalBooks }, { label: 'Entries', value: totalEntries }].map(s => (
              <div key={s.label} className="rounded-xl bg-amber-50/60 p-2 text-center">
                <p className="text-base font-bold text-stone-700">{s.value}</p>
                <p className="text-[10px] text-stone-400">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Appearance</h2>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {/* Light Devotional Mode Card */}
            <button
              type="button"
              onClick={() => setDarkMode(false)}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-300 focus:outline-none ${
                !darkMode 
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' 
                  : 'border-stone-200 hover:border-amber-200 bg-white'
              }`}
            >
              {/* Miniature Preview Window */}
              <div className="p-3 bg-gradient-to-br from-[#fff9ee] to-[#fdf6e7] border-b border-stone-100 flex flex-col gap-1.5 h-20 select-none">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-8 h-1 bg-stone-300 rounded" />
                </div>
                <div className="rounded-lg bg-white border border-amber-100/80 p-1.5 flex flex-col gap-1 shadow-sm">
                  <div className="w-10 h-1.5 bg-stone-400 rounded" />
                  <div className="w-5 h-1 bg-stone-200 rounded" />
                </div>
              </div>
              
              {/* Card info */}
              <div className="p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-700">Light Devotional</p>
                  <p className="text-[10px] text-stone-400">Warm saffron tones</p>
                </div>
                {!darkMode && (
                  <CheckCircle2 size={14} className="text-amber-600 flex-shrink-0" />
                )}
              </div>
            </button>

            {/* Saffron Dark Mode Card */}
            <button
              type="button"
              onClick={() => setDarkMode(true)}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-300 focus:outline-none ${
                darkMode 
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-[#1e1812]/50' 
                  : 'border-stone-200 hover:border-amber-200 bg-white'
              }`}
            >
              {/* Miniature Preview Window */}
              <div className="p-3 bg-gradient-to-br from-[#14110e] to-[#201b15] border-b border-amber-900/20 flex flex-col gap-1.5 h-20 select-none">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-8 h-1 bg-amber-500/30 rounded" />
                </div>
                <div className="rounded-lg bg-[#1e1812] border border-amber-500/20 p-1.5 flex flex-col gap-1 shadow-sm">
                  <div className="w-10 h-1.5 bg-amber-200/60 rounded" />
                  <div className="w-5 h-1 bg-amber-500/30 rounded" />
                </div>
              </div>
              
              {/* Card info */}
              <div className="p-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-700">Saffron Dark</p>
                  <p className="text-[10px] text-stone-400">Luxury charcoal-brown</p>
                </div>
                {darkMode && (
                  <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0" />
                )}
              </div>
            </button>
          </div>
        </motion.section>

        {/* Income Vault Card */}
        <Link to="/vault" className="block no-underline">
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm hover:border-amber-200 hover:bg-amber-50/10 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 rounded-xl bg-amber-50 p-2">
                  <Lock size={15} className="text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-700 leading-tight">Income Vault</p>
                  <p className="text-xs text-stone-400 mt-0.5 truncate font-normal">Secure detailed private income analytics</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-stone-400 flex-shrink-0" />
            </div>
          </motion.section>
        </Link>


        {/* Install App */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Install App</h2>
          {isInstalled ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3">
              <div className="rounded-lg bg-emerald-100 p-2"><CheckCircle2 size={16} className="text-emerald-600" /></div>
              <div>
                <p className="text-sm font-medium text-emerald-700">App Installed</p>
                <p className="text-xs text-emerald-600">ArthaLedger is installed on your device</p>
              </div>
            </div>
          ) : installPrompt ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-400 leading-relaxed">
                Install ArthaLedger on your home screen for quick access — works like a native app.
              </p>
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm"
              >
                <Smartphone size={16} /> Install ArthaLedger
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-stone-500 leading-relaxed">
                To install on your device:
              </p>
              <div className="space-y-1.5 text-xs text-stone-400">
                <p> <span className="font-medium text-stone-600">Android (Chrome):</span> Tap ⋮ menu → "Add to Home Screen"</p>
                <p> <span className="font-medium text-stone-600">iOS (Safari):</span> Tap Share → "Add to Home Screen"</p>
                <p> <span className="font-medium text-stone-600">Desktop (Chrome):</span> Click the install icon in the address bar</p>
              </div>
            </div>
          )}
        </motion.section>

        {/* Currency */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Currency</h2>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-xl bg-amber-50 p-2">
              <DollarSign size={15} className="text-amber-700" />
            </div>
            <select
              value={currency}
              onChange={e => { setCurrency(e.target.value); showToast('Currency updated') }}
              className="flex-1 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-700 focus:border-amber-300 focus:bg-white transition-colors"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
              ))}
            </select>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Security & Privacy</h2>

          {/* Password security info */}
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
            <Shield size={14} className="flex-shrink-0 text-emerald-600 mt-0.5" />
            <p className="text-xs text-emerald-700 leading-relaxed">
              <span className="font-semibold">Your password is secure.</span> Passwords are hashed by Firebase Authentication using industry-standard bcrypt. We never store or see your password.
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
            <Database size={14} className="flex-shrink-0 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <span className="font-semibold">Your data is private.</span> Firebase security rules ensure only you can access your data. All connections use HTTPS/TLS encryption.
            </p>
          </div>

          {/* Change password */}
          {isPasswordUser && (
            <div className="rounded-xl border border-amber-100 overflow-hidden">
              <button
                onClick={() => { setShowChangePw(v => !v); setPwError(''); setPwSuccess(false) }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-amber-50 p-1.5"><Lock size={13} className="text-amber-700" /></div>
                  <span className="text-sm font-medium text-stone-700">Change Password</span>
                </div>
                <ChevronRight size={14} className={`text-stone-400 transition-transform ${showChangePw ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {showChangePw && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleChangePw}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-amber-50">
                      {[
                        { label: 'Current Password', val: oldPw, set: setOldPw, show: showOld, toggle: () => setShowOld(v => !v), ac: 'current-password' },
                        { label: 'New Password', val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(v => !v), ac: 'new-password' },
                      ].map(({ label, val, set, show, toggle, ac }) => (
                        <div key={label}>
                          <label className="block text-[11px] font-medium text-stone-500 mb-1">{label}</label>
                          <div className="relative">
                            <input type={show ? 'text' : 'password'} value={val}
                              onChange={e => { set(e.target.value); setPwError('') }}
                              className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 pr-9 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                              autoComplete={ac} />
                            <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                              {show ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div>
                        <label className="block text-[11px] font-medium text-stone-500 mb-1">Confirm New Password</label>
                        <input type="password" value={confirmPw}
                          onChange={e => { setConfirmPw(e.target.value); setPwError('') }}
                          className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                          autoComplete="new-password" />
                      </div>
                      {pwError && <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">{pwError}</p>}
                      {pwSuccess && <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5"><CheckCircle size={12} /> Changed!</p>}
                      <button type="submit" disabled={pwLoading}
                        className="w-full rounded-xl bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-60">
                        {pwLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.section>

        {/* Data & Account */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Data & Account</h2>
          <button onClick={handleExport}
            className="w-full flex items-center gap-3 rounded-xl border border-amber-100 px-3 py-2.5 text-sm text-stone-700 hover:bg-amber-50 transition-colors">
            <div className="rounded-lg bg-amber-50 p-1.5"><Download size={13} className="text-amber-700" /></div>
            <span className="flex-1 text-left">Export All Data (JSON)</span>
            <ChevronRight size={13} className="text-stone-400" />
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
            <div className="rounded-lg bg-red-100 p-1.5"><LogOut size={13} className="text-red-600" /></div>
            <span className="flex-1 text-left">Sign Out</span>
          </button>
          <button onClick={openDeleteDialog}
            className="w-full flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">
            <div className="rounded-lg bg-red-100 p-1.5"><Trash2 size={13} className="text-red-700" /></div>
            <span className="flex-1 text-left">Delete Account Permanently</span>
          </button>
        </motion.section>

        {/* FAQ */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-xl bg-amber-50 p-2"><HelpCircle size={14} className="text-amber-700" /></div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y divide-amber-50">
            {FAQ.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </motion.section>

        {/* About */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-xl bg-amber-50 p-2"><Info size={14} className="text-amber-700" /></div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">About ArthaLedger</h2>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <img src="/L.png" alt="ArthaLedger" className="h-14 w-14 rounded-2xl shadow-sm object-contain bg-amber-50 p-1 flex-shrink-0" />
            <div>
              <p className="text-base font-semibold text-stone-800 font-serif">ArthaLedger</p>
              <p className="text-xs text-stone-400">Where every rupee has meaning</p>
              <p className="text-[10px] text-stone-300 mt-0.5">Version 1.0.0</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-stone-500 leading-relaxed">
            <p>
              <span className="font-semibold text-stone-700">"Artha"</span> is a Sanskrit word meaning wealth, purpose, and meaning — one of the four goals of life in ancient Indian philosophy. ArthaLedger is built on the belief that mindful tracking of money leads to clarity, peace, and abundance.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { icon: Globe, label: 'Platform', value: 'Web + PWA' },
                { icon: Database, label: 'Database', value: 'Firebase Realtime DB' },
                { icon: Key, label: 'Auth', value: 'Firebase Auth' },
                { icon: Shield, label: 'Security', value: 'End-to-end encrypted' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-amber-50/50 p-2.5 flex items-start gap-2">
                  <Icon size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-stone-400">{label}</p>
                    <p className="text-xs font-medium text-stone-600">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2.5 mt-2">
              <p className="font-medium text-stone-600 mb-1">Tech Stack</p>
              <p className="text-stone-400">React · Tailwind CSS · Framer Motion · Firebase · FastAPI · jsPDF · Recharts</p>
            </div>

            <p className="text-center text-stone-300 italic pt-1">
              "Mindful spending creates peaceful living."
            </p>
          </div>
        </motion.section>

        {/* Developer */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="rounded-2xl border border-amber-100/80 bg-white/88 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-xl bg-amber-50 p-2"><User size={14} className="text-amber-700" /></div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">Developer</h2>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 p-3">
              <User size={18} className="text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">Javili Jashwanth</p>
              <p className="text-xs text-stone-400">Designer & Developer</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <a href="mailto:jashwanthjavili7@gmail.com"
              className="flex items-center gap-2.5 rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2 text-stone-600 hover:bg-amber-100 transition-colors">
              <span className="text-amber-600">✉</span>
              jashwanthjavili7@gmail.com
            </a>
            <a href="tel:+919160125245"
              className="flex items-center gap-2.5 rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2 text-stone-600 hover:bg-amber-100 transition-colors">
              <span className="text-amber-600">📞</span>
              +91 91601 25245
            </a>
          </div>
        </motion.section>

        {/* Copyright footer — single, clean */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="pb-2 text-center space-y-1">
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} ArthaLedger. All rights reserved.
          </p>
          <p className="text-[11px] text-stone-400">
            Designed & developed with care by <span className="font-medium text-amber-700">Javili Jashwanth</span>
          </p>
          <p className="text-[10px] text-stone-300">
            Your data is yours — always private, always secure.
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-stone-300 pt-0.5">
            <span>v1.0.0</span>
            <span>·</span>
            <span>Made in India</span>
            <span>·</span>
            <span>PWA</span>
          </div>
        </motion.div>

      </div>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* ── Edit Profile Modal ── */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditProfile(false) }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl border border-amber-100 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-amber-100 p-2"><User size={15} className="text-amber-700" /></div>
                  <h3 className="font-serif text-lg font-semibold text-stone-800">Edit Profile</h3>
                </div>
                <button onClick={() => setShowEditProfile(false)} className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 transition-colors">
                  <ChevronDown size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Full Name <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={e => setProfileData(p => ({ ...p, displayName: e.target.value }))}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-amber-100 bg-amber-50/40 pl-8 pr-3 py-2.5 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email — read only */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Email <span className="text-stone-300 text-[10px]">(cannot be changed)</span></label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-400 cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm text-stone-500 select-none">
                      +91
                    </div>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={e => {
                        // Strip +91 prefix if user pastes full number
                        const val = e.target.value.replace(/^\+91\s?/, '').replace(/\D/g, '').slice(0, 10)
                        setProfileData(p => ({ ...p, phone: val }))
                      }}
                      placeholder="98765 43210"
                      maxLength={10}
                      className="flex-1 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                      autoComplete="off"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Gender</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Male', 'Female', 'Other', 'Prefer not to say'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setProfileData(p => ({ ...p, gender: g === 'Prefer not to say' ? '' : g.toLowerCase() }))}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          (g === 'Prefer not to say' ? profileData.gender === '' : profileData.gender === g.toLowerCase())
                            ? 'border-amber-400 bg-amber-100 text-amber-800'
                            : 'border-amber-100 bg-amber-50/40 text-stone-600 hover:bg-amber-50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Date of Birth</label>
                  <div className="relative">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="date"
                      value={profileData.dob}
                      onChange={e => setProfileData(p => ({ ...p, dob: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl border border-amber-100 bg-amber-50/40 pl-8 pr-3 py-2.5 text-sm focus:border-amber-300 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Short Bio <span className="text-stone-300 text-[10px]">(optional)</span></label>
                  <textarea
                    value={profileData.bio}
                    onChange={e => setProfileData(p => ({ ...p, bio: e.target.value }))}
                    placeholder="A few words about yourself..."
                    rows={2}
                    maxLength={150}
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 text-sm focus:border-amber-300 focus:bg-white transition-colors resize-none"
                  />
                  <p className="text-[10px] text-stone-300 text-right mt-0.5">{profileData.bio.length}/150</p>
                </div>

                {profileError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600"
                  >
                    {profileError}
                  </motion.p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(false)}
                    className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-60"
                  >
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Account Dialog ── */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteDialog(false) }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl border border-red-100 bg-white p-6 shadow-2xl"
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="rounded-2xl bg-red-100 p-4">
                  <Trash2 size={28} className="text-red-600" />
                </div>
              </div>

              <h3 className="text-center font-serif text-lg font-semibold text-stone-800 mb-1">
                Delete Account
              </h3>
              <p className="text-center text-xs text-stone-500 leading-relaxed mb-4">
                This will <span className="font-semibold text-red-600">permanently delete</span> your account
                and all your data — projects, books, and entries. This cannot be undone.
              </p>

              {/* Warning box */}
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 space-y-1">
                {[
                  `${totalProjects} project${totalProjects !== 1 ? 's' : ''}`,
                  `${totalBooks} book${totalBooks !== 1 ? 's' : ''}`,
                  `${totalEntries} entr${totalEntries !== 1 ? 'ies' : 'y'}`,
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-red-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {item} will be deleted
                  </div>
                ))}
              </div>

              {/* Password confirmation for password users */}
              {isPasswordUser && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Enter your password to confirm
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePw ? 'text' : 'password'}
                      value={deletePassword}
                      onChange={(e) => { setDeletePassword(e.target.value); setDeleteError('') }}
                      placeholder="Your current password"
                      className="w-full rounded-xl border border-red-200 bg-red-50/40 px-3 py-2.5 pr-10 text-sm placeholder-stone-400 focus:border-red-300 focus:bg-white transition-colors"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showDeletePw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {deleteError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600"
                >
                  {deleteError}
                </motion.p>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || (isPasswordUser && !deletePassword)}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deleteLoading}
                  className="w-full rounded-xl border border-stone-200 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutShell>
  )
}
