import { NavLink } from 'react-router-dom'
import { Home, BarChart3, Compass, Settings } from 'lucide-react'
import { useI18n } from '../i18n/core'

const navItems = [
  { to: '/dashboard', labelKey: 'nav.home', icon: Home },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/trips', labelKey: 'nav.groups', icon: Compass },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

/**
 * App frame: page content + fixed bottom navigation (all screen sizes).
 * There is no top header; each page renders its own title.
 * `hideHeader` is accepted for backward compatibility and ignored.
 */
// eslint-disable-next-line no-unused-vars
export default function LayoutShell({ children, hideHeader }) {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-main)] transition-colors duration-300">
      <main
        className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pb-36"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        {children}
      </main>

      <nav
        aria-label={t('nav.primary')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-card)] bg-[var(--bg-page)]/95 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative flex h-16 flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-[var(--gold-primary)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-main)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className={`text-[10px] tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
