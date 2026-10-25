import { useState, useEffect, useCallback } from 'react'
import { isDarkMode, setDarkMode as applyDarkMode } from '../lib/theme'
import {
  Moon, Coins, Download, FileText, LogOut, Lock, KeyRound, Bell, BellRing,
  Clock, Stethoscope, Smartphone, CheckCircle2, Trash2, HelpCircle, Info, ShieldCheck, Pencil, MessageSquareHeart, LayoutDashboard, Languages,
} from 'lucide-react'
import {
  requestNotificationPermission, getNotificationPermissionState, sendNativeNotification,
  getDailyReminderSettings, saveDailyReminderSettings, isBudgetAlertsEnabled, setBudgetAlertsEnabled, syncReminderFromFirebase, testMobileNotification, ensurePushRegistration, getServerReminderStatus, enableDailyReminder, DEFAULT_REMINDER_TIMES, remindIn, nextReminderInfo, formatTimeLeft, thisDeviceId,
} from '../lib/notifications'
import { requestFCMToken } from '../lib/firebase'
import { motion } from 'framer-motion'
import LayoutShell from '../components/LayoutShell'
import Toast from '../components/common/Toast'
import ConfirmDialog from '../components/common/ConfirmDialog'
import UserAvatar from '../components/common/UserAvatar'
import FeedbackSheet from '../components/common/FeedbackSheet'
import { isAdminUser } from '../lib/admin'
import DownloadModal from '../components/forms/DownloadModal'
import { Group, Row, Switch } from '../components/settings/ui'
import {
  EditProfileSheet, ChangePasswordSheet, CurrencySheet, RemindersSheet, DiagnosticsSheet,
  FaqSheet, AboutSheet, DeleteAccountSheet, LanguageSheet,
} from '../components/settings/SettingsSheets'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { useI18n, LANGS } from '../i18n/core'
import useChangeLanguage from '../hooks/useChangeLanguage'

const APP_VERSION = '1.0.0'

// Names are looked up at render (settings.currency.names.<code>)
const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'AED', symbol: 'د.إ' },
  { code: 'SGD', symbol: 'S$' },
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
  const { t, lang, intl } = useI18n()
  const timeOf = (d) => d.toLocaleTimeString(intl, { hour: 'numeric', minute: '2-digit' })

  const isPasswordUser = user?.providerData?.some(p => p.providerId === 'password')

  // ── Preferences ──
  const [darkMode, setDarkModeState] = useState(isDarkMode)
  const [currency, setCurrency] = useState(readCurrency)
  const currencyList = CURRENCIES.map(c => ({ ...c, name: t(`settings.currency.names.${c.code}`) }))
  const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const langInfo = LANGS.find(l => l.code === lang) || LANGS[0]
  const currencySymbol = currencyInfo.symbol

  // ── Toast ──
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false })
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, visible: true })
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000)
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
      showToast(ios ? t('settings.install.ios') : t('settings.install.other'), 'info')
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
  const reminderTimes = dailyReminder.times?.length ? dailyReminder.times : DEFAULT_REMINDER_TIMES

  useEffect(() => {
    let cancelled = false
    syncReminderFromFirebase().then((cloudData) => {
      if (cloudData && !cancelled) {
        const times = cloudData.times?.length ? cloudData.times : DEFAULT_REMINDER_TIMES
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
      showToast(t('settings.toast.budgetOff'), 'info')
      return
    }
    if (notifPermission === 'denied') {
      showToast(t('settings.toast.notifBlockedSettings'), 'error')
      return
    }
    const perm = notifPermission === 'granted' ? 'granted' : await requestNotificationPermission()
    setNotifPermission(perm)
    if (perm !== 'granted') {
      showToast(perm === 'denied' ? t('settings.toast.notifBlockedDevice') : t('settings.toast.notifNotGiven'), 'error')
      return
    }
    setBudgetAlertsEnabled(true)
    setBudgetAlertsPref(true)
    ensurePushRegistration()
    showToast(t('settings.toast.budgetOn'))
    sendNativeNotification(t('settings.budgetNotif.title'), { body: t('settings.budgetNotif.body') })
  }

  // Live clock for "in N min" countdowns (ticks every 30 s)
  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  // One-off "remind me in N minutes"
  const [quickAt, setQuickAt] = useState(null)
  const [quickBusy, setQuickBusy] = useState(0)
  const quickRemind = async (minutes) => {
    if (quickBusy) return
    setQuickBusy(minutes)
    try {
      const { at, minutesLeft } = await remindIn(minutes)
      setNotifPermission(getNotificationPermissionState())
      setQuickAt(at)
      showToast(t('settings.toast.remindAt', { time: timeOf(new Date(at)), left: formatTimeLeft(minutesLeft) }))
    } catch (err) {
      setNotifPermission(getNotificationPermissionState())
      showToast(err?.message || t('settings.toast.reminderFailed'), 'error')
    } finally {
      setQuickBusy(0)
    }
  }
  const quickPending = quickAt && quickAt > clock
  const nextDaily = dailyReminder.enabled ? nextReminderInfo(reminderTimes, new Date(clock)) : null

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
        showToast(t('settings.toast.dailyOn', { next: status?.next_reminder || reminderTimes.map(formatTime12).join(', ') }))
      } else {
        await saveDailyReminderSettings({ enabled: false, times: reminderTimes })
        setDailyReminder(prev => ({ ...prev, enabled: false }))
        showToast(t('settings.toast.dailyOff'), 'info')
      }
    } catch (err) {
      setNotifPermission(getNotificationPermissionState())
      if (err?.code === 'no-device') setDailyReminder(prev => ({ ...prev, enabled: true }))
      showToast(err?.message || t('settings.toast.reminderUpdateFailed'), 'error')
    } finally {
      setReminderBusy(false)
    }
  }

  const updateReminderTimes = (times, msg) => {
    setDailyReminder(prev => ({ ...prev, times, time: times[0] }))
    saveDailyReminderSettings({ enabled: true, times })
      .then(() => { if (msg) showToast(msg) })
      .catch(() => showToast(t('settings.toast.timesSaveFailed'), 'error'))
  }

  const sendTestNotification = async () => {
    const result = await testMobileNotification()
    showToast(result.ok ? t('settings.toast.pushSent', { message: result.message }) : t('settings.toast.localOnly', { message: result.message }), result.ok ? undefined : 'error')
    return result
  }

  const copyFcmToken = async () => {
    const token = localStorage.getItem('al_fcm_token') || await requestFCMToken()
    if (!token) { showToast(t('settings.toast.tokenFailed'), 'error'); return }
    try {
      await navigator.clipboard.writeText(token)
      showToast(t('settings.toast.tokenCopied'))
    } catch {
      showToast(t('settings.toast.clipboardFailed'), 'error')
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
      const mine = thisDeviceId()
      ;(st.device_list || []).forEach((d, i) => {
        const seen = d.updatedAt ? new Date(d.updatedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
        logs.push(`   • Device ${i + 1}: ${d.kind}${d.app ? ' (installed app)' : ' (browser)'} · seen ${seen}${d.id === mine ? '  ← this device' : ''}`)
      })
      if (mine && !(st.device_list || []).some(d => d.id === mine)) logs.push('   ⚠ This device is not registered on the server. Turn notifications off and on again.')
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
    showToast(t('settings.toast.profileUpdated'))
    setSheet(null)
  }

  // ── Password ──
  const submitPasswordChange = async (oldPw, newPw) => {
    await changePassword(oldPw, newPw)
    showToast(t('settings.toast.passwordChanged'))
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
      showToast(t('settings.toast.currencyUpdated'))
    }
    setSheet(null)
  }

  // Language: same as the header dropdown (applied here, saved to the account)
  const changeLanguage = useChangeLanguage()
  const selectLanguage = (code) => { setSheet(null); changeLanguage(code) }

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
    showToast(t('settings.toast.exported'))
  }

  const handleDeleteAccount = async (password) => {
    await deleteAccount(password) // throws → shown inside the sheet
    window.location.href = '/login'
  }

  const totalProjects = projects.length
  const totalBooks = Object.values(booksByProject).flat().length
  const totalEntries = Object.values(entriesByBook).flat().length

  const realName = profileData.displayName || user?.displayName || ''
  const displayName = realName || t('settings.profile.defaultName')
  const canTest = dailyReminder.enabled
  const canDebug = notifPermission === 'granted'

  return (
    <LayoutShell>
      <div className="mx-auto w-full max-w-2xl space-y-6 pt-1 pb-4">

        {/* ── Header ── */}
        <header>
          <h1 className="font-serif-luxury text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-main)]">{t('settings.title')}</h1>
          <p className="font-serif-luxury mt-0.5 text-[14px] italic text-[var(--text-muted)]">{t('settings.subtitle')}</p>
        </header>

        {/* ── Profile card ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]"
        >
          <div className="flex items-center gap-3.5 p-4">
            <UserAvatar user={user} name={realName} className="h-14 w-14 text-[18px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold text-[var(--text-main)]">{displayName}</p>
              <p className="truncate text-[13px] text-[var(--text-muted)]">{user?.email}</p>
              {profileData.bio && (
                <p className="mt-0.5 line-clamp-2 text-[12px] italic leading-snug text-[var(--text-subtle)]">{profileData.bio}</p>
              )}
            </div>
            <button type="button" onClick={openEditProfile} aria-label={t('settings.profile.editAria')}
              className="flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--gold-primary)] transition-colors hover:bg-[var(--gold-light)]">
              <Pencil size={12} /> {t('common.edit')}
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {[{ label: t('settings.profile.stats.projects'), value: totalProjects }, { label: t('settings.profile.stats.books'), value: totalBooks }, { label: t('settings.profile.stats.entries'), value: totalEntries }].map(s => (
              <div key={s.label} className="px-2 py-3 text-center">
                <p className="text-[16px] font-semibold tabular-nums text-[var(--text-main)]">{s.value}</p>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--text-subtle)]">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Account ── */}
        <Group title={t('settings.groups.account')} delay={0.03}>
          {isPasswordUser && <Row icon={KeyRound} label={t('settings.account.changePassword')} onClick={() => setSheet('password')} />}
          <Row icon={ShieldCheck} tint="neutral" label={t('settings.account.signInMethod')} value={isPasswordUser ? t('settings.account.emailPassword') : t('settings.account.google')} />
        </Group>

        {/* ── Preferences ── */}
        <Group title={t('settings.groups.preferences')} delay={0.06}>
          <Row icon={Moon} label={t('settings.prefs.darkMode')} hint={darkMode ? t('settings.prefs.darkHint') : t('settings.prefs.lightHint')}
            trailing={<Switch checked={darkMode} onChange={toggleDarkMode} label={t('settings.prefs.darkMode')} />} />
          <Row icon={Languages} label={t('settings.prefs.language')} value={langInfo.label} onClick={() => setSheet('language')} />
          <Row icon={Coins} label={t('settings.prefs.currency')} value={`${currencyInfo.symbol} ${currencyInfo.code}`} onClick={() => setSheet('currency')} />
          {isInstalled ? (
            <Row icon={Smartphone} label={t('settings.prefs.installApp')} trailing={<StatusPill tone="on"><CheckCircle2 size={11} className="mr-1" />{t('settings.prefs.installed')}</StatusPill>} />
          ) : (
            <Row icon={Smartphone} label={t('settings.prefs.installApp')} hint={t('settings.prefs.installHint')}
              trailing={
                <button type="button" onClick={handleInstallClick}
                  className="flex-shrink-0 rounded-full bg-[var(--gold-primary)] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--gold-hover)] active:scale-95 transition cursor-pointer">
                  {t('settings.prefs.install')}
                </button>
              } />
          )}
        </Group>

        {/* ── Notifications ── */}
        <Group
          title={t('settings.groups.notifications')}
          delay={0.09}
          footer={notifPermission === 'denied'
            ? t('settings.notif.footerBlocked')
            : t('settings.notif.footerInfo')}
        >
          <Row icon={Bell} tint="emerald" label={t('settings.notif.budgetAlerts')}
            hint={notifPermission === 'denied' ? t('settings.notif.budgetBlocked') : t('settings.notif.budgetHint')}
            trailing={<Switch checked={budgetAlertsOn} onChange={toggleBudgetAlerts} label={t('settings.notif.budgetAlerts')} />} />
          <Row icon={BellRing} tint="emerald" label={t('settings.notif.dailyReminder')}
            hint={nextDaily
              ? t('settings.notif.dailyNext', { left: formatTimeLeft(nextDaily.minutes), time: timeOf(nextDaily.at) })
              : t('settings.notif.dailyHint')}
            trailing={<Switch checked={dailyReminder.enabled} onChange={toggleDailyReminder} label={t('settings.notif.dailyReminder')} disabled={reminderBusy} />} />
          {dailyReminder.enabled && (
            <Row icon={Clock} tint="emerald" label={t('settings.notif.reminderTimes')} value={reminderTimes.map(formatTime12).join(', ')}
              onClick={() => setSheet('reminders')} />
          )}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Clock size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[var(--text-main)]">{t('settings.notif.quickReminder')}</span>
                <span className="block truncate text-[12px] text-[var(--text-muted)]">
                  {quickPending
                    ? t('settings.notif.quickComing', { time: timeOf(new Date(quickAt)), left: formatTimeLeft(Math.max(1, Math.ceil((quickAt - clock) / 60000))) })
                    : t('settings.notif.quickHint')}
                </span>
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 pl-11">
              {[5, 10, 30].map(m => (
                <button key={m} type="button" onClick={() => quickRemind(m)} disabled={Boolean(quickBusy)}
                  className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-page)] py-2 text-[12px] font-semibold tabular-nums text-[var(--text-main)] hover:border-[var(--gold-primary)] active:scale-95 transition disabled:opacity-50 cursor-pointer">
                  {quickBusy === m ? '…' : t('settings.notif.minutes', { count: m })}
                </button>
              ))}
            </div>
          </div>
          {/* Developer tools: only for the ArthaLedger team account */}
          {isAdminUser(user) && (canTest || canDebug) && (
            <Row icon={Stethoscope} tint="neutral" label={t('settings.notif.diagnostics')} onClick={() => setSheet('diagnostics')} />
          )}
        </Group>

        {/* ── Data & privacy ── */}
        <Group
          title={t('settings.groups.dataPrivacy')}
          delay={0.12}
          footer={t('settings.data.footer')}
        >
          <Row icon={Lock} tint="sky" label={t('settings.data.vault')} hint={t('settings.data.vaultHint')} to="/vault" />
          <Row icon={FileText} tint="sky" label={t('settings.data.report')} hint={t('settings.data.reportHint')} onClick={() => setSheet('download')} />
          <Row icon={Download} tint="sky" label={t('settings.data.export')} hint={t('settings.data.exportHint')} onClick={handleExport} trailing={null} />
        </Group>

        {/* ── Support ── */}
        {isAdminUser(user) && (
          <Group title={t('settings.groups.admin')} delay={0.14}>
            <Row icon={LayoutDashboard} tint="gold" label={t('settings.admin.dashboard')} hint={t('settings.admin.hint')} to="/admin" />
          </Group>
        )}

        <Group title={t('settings.groups.support')} delay={0.15}>
          <Row icon={MessageSquareHeart} tint="violet" label={t('settings.support.feedback')} hint={t('settings.support.feedbackHint')} onClick={() => setSheet('feedback')} />
          <Row icon={HelpCircle} tint="violet" label={t('settings.support.faq')} onClick={() => setSheet('faq')} />
          <Row icon={Info} tint="violet" label={t('settings.support.about')} value={`v${APP_VERSION}`} onClick={() => setSheet('about')} />
          <Row icon={ShieldCheck} tint="violet" label={t('settings.support.privacy')} to="/privacy" />
        </Group>

        {/* ── Danger zone ── */}
        <Group delay={0.18}>
          <Row icon={LogOut} danger label={t('settings.danger.logout')} onClick={() => setSheet('logout')} trailing={null} />
          <Row icon={Trash2} danger label={t('settings.danger.deleteAccount')} hint={t('settings.danger.deleteHint')} onClick={() => setSheet('delete')} trailing={null} />
        </Group>

        <footer className="space-y-1 pt-2 text-center">
          <p className="font-serif-luxury text-[13px] italic text-[var(--text-muted)]">{t('settings.footer.tagline')}</p>
          <p className="text-[11px] text-[var(--text-subtle)]">
            {t('settings.footer.madeBy', { version: APP_VERSION })}
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
      <CurrencySheet open={sheet === 'currency'} onClose={closeSheet} currencies={currencyList} value={currency} onSelect={selectCurrency} />
      <LanguageSheet open={sheet === 'language'} onClose={closeSheet} langs={LANGS} value={lang} onSelect={selectLanguage} />
      <RemindersSheet open={sheet === 'reminders'} onClose={closeSheet} times={reminderTimes} onChange={updateReminderTimes} />
      <DiagnosticsSheet open={sheet === 'diagnostics'} onClose={closeSheet} canTest={canTest} canDebug={canDebug}
        onTest={sendTestNotification} onCopyToken={copyFcmToken} onRunDiagnostic={runDiagnostic} />
      <FeedbackSheet open={sheet === 'feedback'} onClose={closeSheet} />
      <FaqSheet open={sheet === 'faq'} onClose={closeSheet} items={t('settings.faq.items')} />
      <AboutSheet open={sheet === 'about'} onClose={closeSheet} version={APP_VERSION} />
      <DeleteAccountSheet open={sheet === 'delete'} onClose={closeSheet} needsPassword={Boolean(isPasswordUser)}
        counts={{ projects: totalProjects, books: totalBooks, entries: totalEntries }} onConfirm={handleDeleteAccount} />
      <ConfirmDialog
        open={sheet === 'logout'}
        onClose={closeSheet}
        onConfirm={logout}
        danger={false}
        title={t('settings.logout.title')}
        message={t('settings.logout.message')}
      />
    </LayoutShell>
  )
}
