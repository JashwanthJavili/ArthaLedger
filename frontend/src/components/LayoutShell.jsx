import { NavLink } from 'react-router-dom'
import { BarChart3, Home, Settings } from 'lucide-react'

const nav = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function LayoutShell({ children }) {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-3 sm:px-5 lg:px-6 pb-24 pt-4 sm:pt-5">
      {/* Page content */}
      <main>{children}</main>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[min(96vw,400px)] -translate-x-1/2 items-center justify-around rounded-2xl border border-amber-100/80 bg-white/92 px-2 py-1.5 shadow-xl backdrop-blur-md">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex flex-col items-center gap-0.5 rounded-xl px-5 py-2 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-amber-50'
                }`
              }
            >
              <Icon size={19} />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
