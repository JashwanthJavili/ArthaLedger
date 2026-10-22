import { useState, useEffect, useCallback } from 'react'
import { isDarkMode, setDarkMode as applyDarkMode } from '../lib/theme'
import {
  Moon, Coins, Download, FileText, LogOut, Lock, KeyRound, Bell, BellRing,
  Clock, Stethoscope, Smartphone, CheckCircle2, Trash2, HelpCircle, Info, ShieldCheck, Pencil,
} from 'lucide-react'
import {
  requestNotificationPermission, getNotificationPermissionState, sendNativeNotification,
  getDailyReminderSettings, saveDailyReminderSettings, isBudgetAlertsEnabled, setBudgetAlertsEnabled, syncReminderFromFirebase, testMobileNotification, ensurePushRegistration, getServerReminderStatus, enableDailyReminder,
} from '../lib/notifications'
import { requestFCMToken } from '../lib/firebase'
import { motion } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import Toast from '../components/common/Toast'
import ConfirmDialog from '../components/common/ConfirmDialog'
import DownloadModal from '../components/forms/DownloadModal'
import { Group, Row, Switch } from '../components/settings/ui'
import {
  EditProfileSheet, ChangePasswordSheet, CurrencySheet, RemindersSheet, DiagnosticsSheet,
  FaqSheet, AboutSheet, DeleteAccountSheet,
} from '../components/settings/SettingsSheets'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'

const APP_VERSION = '1.0.0'

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
    a: 'ArthaLedger never stores your password. Authentication is handled entirely by Firebase Authentication (Google\'s identity platform), which stores only a salted, industry-standard hash (scrypt). Your password is never visible to us — not even in logs.',
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
    a: 'Yes. Go to Settings → Export all data to download a complete JSON file of all your projects, books, and entries. You can also download PDF or spreadsheet reports from Settings → Download report.',
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
    a: 'Go to Settings → Delete account. This permanently removes your account and all of its data, so export your data first if you want to keep a copy.',
  },
  {
    q: 'Is ArthaLedger free?',
    a: 'Yes, ArthaLedger is completely free to use. There are no hidden charges, subscriptions, or premium tiers.',
  },
]

const EMPTY_PROFILE = { displayName: '', phone: '', gender: '', dob: '', bio: '' }

function toProfile(data, fallbackName) {
  return {
    displayName: data?.displayName || fallbackName || '',
    phone: data?.phone || '',
    gender: data?.gender || '',
    dob: data?.dob || '',
    bio: data?.bio || '',
  }
}

function initialsOf(name, email) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length) return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase()
  return (email?.[0] || 'U').toUpperCase()
}

function formatTime12(t) {
  const [h, m] = String(t || '').split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return t
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function readCurrency() {
  try { return localStorage.getItem('sl_currency') || 'INR' } catch { return 'INR' }
}

const STATUS_PILL = {
  on: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  off: 'bg-[var(--border-subtle)] text-[var(--text-muted)]',
  blocked: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

function StatusPill({ tone, children }) {
  return (
    <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_PILL[tone]}`}>
      {children}
    </span>
  )
}

export default function SettingsPage() {
  const { user, logout, changePassword, deleteAccount, updateUserProfile, getUserProfile } = useAuth()
  const { projects, booksByProject, entriesByBook } = useAppData()

  const isPasswordUser = user?.providerData?.some(p => p.providerId === 'password')

  // ── Preferences ──
  const [darkMode, setDarkModeState] = useState(isDarkMode)
  const [currency, setCurrency] = useState(readCurrency)
  const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const currencySymbol = currencyInfo.symbol

  // ── Toast ──
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000)
  }, [])

  // ── Which sheet / dialog is open ──
  const [sheet, setSheet] = useState(null) // 'profile' | 'password' | 'currency' | 'reminders' | 'diagnostics' | 'install' | 'faq' | 'about' | 'delete' | 'download' | 'logout'
  const closeSheet = useCallback(() => setSheet(null), [])

  // ── PWA install ──
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e) }
    const onInstalled = () => { setIsInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) {
      // The browser hasn't offered its install prompt (iOS, or already dismissed)
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      showToast(ios ? 'In Safari, tap Share → Add to Home Screen' : 'Open the browser menu (⋮) → Install app', 'info')
      return
    }
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
  }

  // ── Notifications & reminders ──
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermissionState())
  const [dailyReminder, setDailyReminder] = useState(() => getDailyReminderSettings())
  const reminderTimes = dailyReminder.times?.length ? dailyReminder.times : [dailyReminder.time || '19:00']

  useEffect(() => {
    let cancelled = false
    syncReminderFromFirebase().then((cloudData) => {
      if (cloudData && !cancelled) {
        const times = cloudData.times?.length ? cloudData.times : [cloudData.time || '19:00']
        setDailyReminder({ enabled: Boolean(cloudData.enabled), times, time: times[0] })
      }
    })
    return () => { cancelled = true }
  }, [])

  // Budget alerts: switching on asks the phone for notification permission
  const [budgetAlertsPref, setBudgetAlertsPref] = useState(() => isBudgetAlertsEnabled())
  const budgetAlertsOn = budgetAlertsPref && notifPermission === 'granted'
  const toggleBudgetAlerts = async () => {
    if (budgetAlertsOn) {
      setBudgetAlertsEnabled(false)
      setBudgetAlertsPref(false)
      showToast('Budget alerts off', 'info')
      return
    }
    if (notifPermission === 'denied') {
      showToast('Notifications are blocked. Allow them in phone Settings → Apps → ArthaLedger / Chrome → Notifications.', 'error')
      return
    }
    const perm = notifPermission === 'granted' ? 'granted' : await requestNotificationPermission()
    setNotifPermission(perm)
    if (perm !== 'granted') {
      showToast(perm === 'denied' ? 'Notifications were blocked on this device' : 'Notification permission not given', 'error')
      return
    }
    setBudgetAlertsEnabled(true)
    setBudgetAlertsPref(true)
    ensurePushRegistration()
    showToast('Budget alerts on ✓')
    sendNativeNotification('Budget alerts are on', { body: 'You’ll be alerted when a category reaches 80% and 100% of its budget.' })
  }

  // Daily reminder: on = system permission dialog + save + device registration
  // + server confirmation (shared with the Home prompt via enableDailyReminder).
  const [reminderBusy, setReminderBusy] = useState(false)
  const toggleDailyReminder = async () => {
    if (reminderBusy) return
    const next = !dailyReminder.enabled
    setReminderBusy(true)
    try {
      if (next) {
        const { status } = await enableDailyReminder(reminderTimes)
        setNotifPermission(getNotificationPermissionState())
        setDailyReminder(prev => ({ ...prev, enabled: true, times: reminderTimes, time: reminderTimes[0] }))
        showToast(`Daily reminder on · next ${status?.next_reminder || reminderTimes.map(formatTime12).join(', ')} ✓`)
      } else {
        await saveDailyReminderSettings({ enabled: false, times: reminderTimes })
        setDailyReminder(prev => ({ ...prev, enabled: false }))
        showToast('Daily reminder off', 'info')
      }
    } catch (err) {
      setNotifPermission(getNotificationPermissionState())
      if (err?.code === 'no-device') setDailyReminder(prev => ({ ...prev, enabled: true }))
      showToast(err?.message || 'Couldn’t update the reminder.', 'error')
    } finally {
      setReminderBusy(false)
    }
  }

  const updateReminderTimes = (times, msg) => {
    setDailyReminder(prev => ({ ...prev, times, time: times[0] }))
    saveDailyReminderSettings({ enabled: true, times })
      .then(() => { if (msg) showToast(msg) })
      .catch(() => showToast('Couldn’t save reminder times. Check your connection.', 'error'))
  }

  const sendTestNotification = async () => {
    const result = await testMobileNotification()
    showToast(result.ok ? `Push sent ✓ ${result.message}` : `Shown locally only — ${result.message}`, result.ok ? undefined : 'error')
    return result
  }

  const copyFcmToken = async () => {
    const token = localStorage.getItem('al_fcm_token') || await requestFCMToken()
    if (!token) { showToast('Failed to retrieve FCM Token', 'error'); return }
    try {
      await navigator.clipboard.writeText(token)
      showToast('FCM token copied to clipboard ✓')
    } catch {
      showToast('Could not access the clipboard', 'error')
    }
  }

  const runDiagnostic = async () => {
    const logs = []
    logs.push(`1. Notification API: ${'Notification' in window ? 'Supported ✓' : 'Unsupported ✗'}`)
    logs.push(`2. Permission: ${typeof Notification !== 'undefined' ? Notification.permission : 'N/A'}`)
    logs.push(`3. Service Worker: ${'serviceWorker' in navigator ? 'Supported ✓' : 'Unsupported ✗'}`)
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      logs.push(`4. Active ServiceWorkers: ${regs.length}`)
      regs.forEach(r => logs.push(`   • ${r.active ? r.active.scriptURL.split('/').pop() : 'registering...'}`))
    }
    try {
      const token = await requestFCMToken()
      logs.push(token ? `5. FCM Push Token: Ready ✓ (${token.slice(0, 15)}...)` : '5. FCM Push Token: Failed ✗')
    } catch (e) {
      logs.push(`5. FCM Error: ${e?.message || String(e)}`)
    }
    try {
      const st = await getServerReminderStatus()
      logs.push(`6. Server: reminder ${st.enabled ? 'ON ✓' : 'OFF ✗'} · ${st.devices} device${st.devices === 1 ? '' : 's'} registered`)
      logs.push(`   • Times: ${(st.times || []).map(formatTime12).join(', ')} (${st.timezone})`)
      logs.push(`   • Next: ${st.next_reminder || '—'} · server time ${st.server_time}`)
    } catch (e) {
      logs.push(`6. Server check failed: ${e?.message || String(e)} (it may be waking up — try again in a minute)`)
    }
    return logs
  }

  // ── Profile ──
  const [profileData, setProfileData] = useState(EMPTY_PROFILE)
  const [profileFetched, setProfileFetched] = useState(false)

  useEffect(() => {
    if (!user || profileFetched) return
    let cancelled = false
    getUserProfile()
      .then(data => { if (!cancelled) { setProfileData(toProfile(data, user?.displayName)); setProfileFetched(true) } })
      .catch(() => { if (!cancelled) { setProfileData(p => ({ ...p, displayName: user?.displayName || '' })); setProfileFetched(true) } })
    return () => { cancelled = true }
  }, [user, profileFetched, getUserProfile])

  const openEditProfile = async () => {
    if (!profileFetched) {
      try {
        const data = await getUserProfile()
        setProfileData(toProfile(data, user?.displayName))
        setProfileFetched(true)
      } catch { /* open with what we have */ }
    }
    setSheet('profile')
  }

  const saveProfile = async (draft) => {
    await updateUserProfile(draft) // throws → shown inside the sheet
    setProfileData(toProfile(draft, user?.displayName))
    setProfileFetched(false) // force re-fetch so we mirror what was stored
    showToast('Profile updated ✓')
    setSheet(null)
  }

  // ── Password ──
  const submitPasswordChange = async (oldPw, newPw) => {
    await changePassword(oldPw, newPw)
    showToast('Password changed successfully ✓')
  }

  // ── Preferences handlers ──
  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkModeState(next)
    // Apply only on an actual change, so opening Settings doesn't override the system theme
    if (next !== isDarkMode()) applyDarkMode(next)
  }

  const selectCurrency = (code) => {
    if (code !== currency) {
      setCurrency(code)
      try { localStorage.setItem('sl_currency', code) } catch { /* storage unavailable */ }
      showToast('Currency updated')
    }
    setSheet(null)
  }

  // ── Data ──
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
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToast('Data exported successfully')
  }

  const handleDeleteAccount = async (password) => {
    await deleteAccount(password) // throws → shown inside the sheet
    window.location.href = '/login'
  }

  const totalProjects = projects.length
  const totalBooks = Object.values(booksByProject).flat().length
  const totalEntries = Object.values(entriesByBook).flat().length

  const displayName = profileData.displayName || user?.displayName || 'User'
  const canTest = dailyReminder.enabled
  const canDebug = notifPermission === 'granted'

  return (
    <LayoutShell>
      <div className="mx-auto w-full max-w-2xl space-y-6 pt-1 pb-4">

        {/* ── Header ── */}
        <header>
          <h1 className="font-serif-luxury text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-main)]">Settings</h1>
          <p className="font-serif-luxury mt-0.5 text-[14px] italic text-[var(--text-muted)]">Your account & preferences</p>
        </header>

        {/* ── Profile card ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]"
        >
          <div className="flex items-center gap-3.5 p-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-light)] font-serif-luxury text-[20px] font-semibold text-[var(--gold-primary)]">
              {initialsOf(displayName === 'User' ? '' : displayName, user?.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold text-[var(--text-main)]">{displayName}</p>
              <p className="truncate text-[13px] text-[var(--text-muted)]">{user?.email}</p>
              {profileData.bio && (
                <p className="mt-0.5 line-clamp-2 text-[12px] italic leading-snug text-[var(--text-subtle)]">{profileData.bio}</p>
              )}
            </div>
            <button type="button" onClick={openEditProfile} aria-label="Edit profile"
              className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--gold-primary)] transition-colors hover:bg-[var(--gold-light)]">
              <Pencil size={12} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {[{ label: 'Projects', value: totalProjects }, { label: 'Books', value: totalBooks }, { label: 'Entries', value: totalEntries }].map(s => (
              <div key={s.label} className="px-2 py-3 text-center">
                <p className="text-[16px] font-semibold tabular-nums text-[var(--text-main)]">{s.value}</p>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--text-subtle)]">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Account ── */}
        <Group title="Account" delay={0.03}>
          {isPasswordUser && <Row icon={KeyRound} label="Change password" onClick={() => setSheet('password')} />}
          <Row icon={ShieldCheck} tint="neutral" label="Sign-in method" value={isPasswordUser ? 'Email & password' : 'Google'} />
        </Group>

        {/* ── Preferences ── */}
        <Group title="Preferences" delay={0.06}>
          <Row icon={Moon} label="Dark mode" hint={darkMode ? 'Obsidian dark' : 'Warm cream & gold'}
            trailing={<Switch checked={darkMode} onChange={toggleDarkMode} label="Dark mode" />} />
          <Row icon={Coins} label="Currency" value={`${currencyInfo.symbol} ${currencyInfo.code}`} onClick={() => setSheet('currency')} />
          {isInstalled ? (
            <Row icon={Smartphone} label="Install app" trailing={<StatusPill tone="on"><CheckCircle2 size={11} className="mr-1" />Installed</StatusPill>} />
          ) : (
            <Row icon={Smartphone} label="Install app" hint="Use ArthaLedger like a phone app"
              trailing={
                <button type="button" onClick={handleInstallClick}
                  className="flex-shrink-0 rounded-full bg-[var(--gold-primary)] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--gold-hover)] active:scale-95 transition cursor-pointer">
                  Install
                </button>
              } />
          )}
        </Group>

        {/* ── Notifications ── */}
        <Group
          title="Notifications"
          delay={0.09}
          footer={notifPermission === 'denied'
            ? 'Notifications are blocked for this site. Allow them from your browser’s site settings, then reload.'
            : 'Budget alerts fire when a category reaches 80% (warning) or 100% (limit) of its budget.'}
        >
          <Row icon={Bell} tint="emerald" label="Budget alerts"
            hint={notifPermission === 'denied' ? 'Blocked in phone settings' : 'Alert me at 80% and 100% of a budget'}
            trailing={<Switch checked={budgetAlertsOn} onChange={toggleBudgetAlerts} label="Budget alerts" />} />
          <Row icon={BellRing} tint="emerald" label="Daily reminder" hint="A nudge to log the day's expenses"
            trailing={<Switch checked={dailyReminder.enabled} onChange={toggleDailyReminder} label="Daily reminder" disabled={reminderBusy} />} />
          {dailyReminder.enabled && (
            <Row icon={Clock} tint="emerald" label="Reminder times" value={reminderTimes.map(formatTime12).join(', ')}
              onClick={() => setSheet('reminders')} />
          )}
          {(canTest || canDebug) && (
            <Row icon={Stethoscope} tint="neutral" label="Test & diagnostics" onClick={() => setSheet('diagnostics')} />
          )}
        </Group>

        {/* ── Data & privacy ── */}
        <Group
          title="Data & privacy"
          delay={0.12}
          footer="Only you can access your data — it’s protected by Firebase security rules and encrypted in transit and at rest. Your password is handled by Firebase Authentication; we never see or store it."
        >
          <Row icon={Lock} tint="sky" label="Deep Analytics & Vault" hint="Password-protected insights & private income" to="/vault" />
          <Row icon={FileText} tint="sky" label="Download report" hint="PDF or spreadsheet, filtered by book & date" onClick={() => setSheet('download')} />
          <Row icon={Download} tint="sky" label="Export all data" hint="Complete backup as JSON" onClick={handleExport} trailing={null} />
        </Group>

        {/* ── Support ── */}
        <Group title="Support" delay={0.15}>
          <Row icon={HelpCircle} tint="violet" label="Help & FAQ" onClick={() => setSheet('faq')} />
          <Row icon={Info} tint="violet" label="About ArthaLedger" value={`v${APP_VERSION}`} onClick={() => setSheet('about')} />
          <Row icon={ShieldCheck} tint="violet" label="Privacy policy" to="/privacy" />
        </Group>

        {/* ── Danger zone ── */}
        <Group delay={0.18}>
          <Row icon={LogOut} danger label="Log out" onClick={() => setSheet('logout')} trailing={null} />
          <Row icon={Trash2} danger label="Delete account" hint="Permanently remove your account and data" onClick={() => setSheet('delete')} trailing={null} />
        </Group>

        <footer className="space-y-1 pt-2 text-center">
          <p className="font-serif-luxury text-[13px] italic text-[var(--text-muted)]">Where every rupee has meaning</p>
          <p className="text-[11px] text-[var(--text-subtle)]">
            ArthaLedger v{APP_VERSION} · Made in India by Javili Jashwanth
          </p>
        </footer>
      </div>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />

      {/* ── Sheets & dialogs ── */}
      <DownloadModal
        open={sheet === 'download'}
        onClose={closeSheet}
        user={user}
        projects={projects}
        booksByProject={booksByProject}
        entriesByBook={entriesByBook}
        currencySymbol={currencySymbol}
      />
      <EditProfileSheet open={sheet === 'profile'} onClose={closeSheet} initial={profileData} email={user?.email} onSave={saveProfile} />
      <ChangePasswordSheet open={sheet === 'password'} onClose={closeSheet} onSubmit={submitPasswordChange} />
      <CurrencySheet open={sheet === 'currency'} onClose={closeSheet} currencies={CURRENCIES} value={currency} onSelect={selectCurrency} />
      <RemindersSheet open={sheet === 'reminders'} onClose={closeSheet} times={reminderTimes} onChange={updateReminderTimes} />
      <DiagnosticsSheet open={sheet === 'diagnostics'} onClose={closeSheet} canTest={canTest} canDebug={canDebug}
        onTest={sendTestNotification} onCopyToken={copyFcmToken} onRunDiagnostic={runDiagnostic} />
      <FaqSheet open={sheet === 'faq'} onClose={closeSheet} items={FAQ} />
      <AboutSheet open={sheet === 'about'} onClose={closeSheet} version={APP_VERSION} />
      <DeleteAccountSheet open={sheet === 'delete'} onClose={closeSheet} needsPassword={Boolean(isPasswordUser)}
        counts={{ projects: totalProjects, books: totalBooks, entries: totalEntries }} onConfirm={handleDeleteAccount} />
      <ConfirmDialog
        open={sheet === 'logout'}
        onClose={closeSheet}
        onConfirm={logout}
        danger={false}
        title="Log out?"
        message="You’ll need to sign in again to access your ledger on this device."
      />
    </LayoutShell>
  )
}
