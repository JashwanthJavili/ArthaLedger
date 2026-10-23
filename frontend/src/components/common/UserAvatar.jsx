import { useState } from 'react'

function initialsOf(name, email) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length) return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase()
  return (email?.[0] || 'U').toUpperCase()
}

/**
 * The signed-in user's picture, used everywhere the account appears so it
 * always looks the same: their Google photo when there is one, otherwise
 * their initials on gold. Falls back to initials if the photo fails to load.
 */
export default function UserAvatar({ user, name, className = 'h-10 w-10 text-[12px]' }) {
  const [broken, setBroken] = useState(false)
  if (user?.photoURL && !broken) {
    return (
      <img src={user.photoURL} alt="" referrerPolicy="no-referrer" draggable="false" onError={() => setBroken(true)}
        className={`${className} flex-shrink-0 rounded-full object-cover`} />
    )
  }
  return (
    <span className={`${className} flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold-primary)] font-bold text-white`}>
      {initialsOf(name ?? user?.displayName, user?.email)}
    </span>
  )
}
