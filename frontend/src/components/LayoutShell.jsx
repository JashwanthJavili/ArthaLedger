import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BarChart3, Home, LogOut, Settings, UserCircle2, Wallet, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function LayoutShell({ children }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-3 sm:px-5 lg:px-6 pb-28 pt-3 sm:pt-4">
      {/* Top Header */}
      <header className="mb-4 flex items-center justify-between gap-3 rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-white/75 px-3 sm:px-5 py-2.5 sm:py-3 shadow-sm backdrop-blur-md">
        <Link to="/dashboard" className="inline-flex items-center gap-2.5 text-stone-800 min-w-0">
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 p-2 text-amber-700 shadow-sm">
            <Wallet size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800 leading-tight">ArthaLedger</p>
            <p className="text-[10px] text-stone-400 leading-tight hidden sm:block">Where every rupee has meaning</p>
          </div>
        </Link>

        {/* Desktop nav actions */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-1.5 text-xs text-stone-600">
            <UserCircle2 size={13} />
            <span className="max-w-[120px] truncate">{user?.displayName || user?.email?.split('@')[0] || 'Profile'}</span>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-100 px-3 py-1.5 text-xs text-stone-600 hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-all duration-200"
          >
            <LogOut size={13} /> Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="sm:hidden flex-shrink-0 rounded-xl border border-amber-100 p-2 text-stone-600"
          aria-label="Menu"
        >
          {menuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sm:hidden mb-3 rounded-2xl border border-amber-100 bg-white/90 p-3 shadow-lg backdrop-blur-md space-y-1"
          >
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-stone-600 border-b border-amber-50 mb-1">
              <UserCircle2 size={14} />
              <span className="truncate">{user?.displayName || user?.email || 'Profile'}</span>
            </div>
            {nav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      isActive ? 'bg-amber-100 text-amber-800 font-medium' : 'text-stone-600 hover:bg-amber-50'
                    }`
                  }
                >
                  <Icon size={16} /> {item.label}
                </NavLink>
              )
            })}
            <button
              onClick={() => { logout(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main>{children}</main>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[min(96vw,480px)] -translate-x-1/2 items-center justify-around rounded-2xl border border-amber-100/80 bg-white/90 px-1 py-1.5 shadow-xl backdrop-blur-md">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 rounded-xl px-4 sm:px-5 py-2 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-amber-50'
                }`
              }
            >
              <Icon size={18} />
              <span className="text-[10px] sm:text-xs">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
