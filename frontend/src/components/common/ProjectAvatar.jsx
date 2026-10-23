import { Lock } from 'lucide-react'
import { projectIcon, tintStyle } from '../../lib/projectIcons'

/**
 * A project's picture: its chosen icon on a soft tint, or its first letter.
 * A PIN-locked project keeps its picture and gets a small lock badge in the
 * corner instead of the lock replacing it.
 */
export default function ProjectAvatar({ project, className = 'h-10 w-10 rounded-xl', iconSize = 18 }) {
  const icon = projectIcon(project?.icon)
  const locked = Boolean(project?.pinHash)
  return (
    <span className={`relative flex flex-shrink-0 items-center justify-center ${className} ${icon ? '' : 'bg-[var(--gold-light)] text-[var(--gold-primary)]'}`}
      style={icon ? tintStyle(icon.tint) : undefined}>
      {icon ? <icon.Icon size={iconSize} strokeWidth={2} /> : (
        <span className="text-sm font-bold uppercase">{project?.name?.charAt(0) || '?'}</span>
      )}
      {locked && (
        <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-[var(--bg-page)] bg-[var(--text-main)] text-[var(--bg-page)]"
          aria-label="Locked">
          <Lock size={9} strokeWidth={2.75} />
        </span>
      )}
    </span>
  )
}
