import { WifiOff } from 'lucide-react'
import LayoutShell from '../LayoutShell'
import { useI18n } from '../../i18n/core'

function Bone({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}

/**
 * Placeholder that mirrors a detail page (header, summary card, grouped list)
 * while data loads. `slow` adds a gentle connection notice.
 */
export default function PageSkeleton({ slow = false, hideHeader = false, label }) {
  const { t } = useI18n()
  return (
    <LayoutShell hideHeader={hideHeader}>
      <div className="mx-auto max-w-2xl space-y-4 pb-36" aria-busy="true" aria-label={label || t('dialogs.skeleton.loading')}>
        {slow && (
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-4 py-3">
            <WifiOff size={16} className="mt-0.5 flex-shrink-0 text-[var(--gold-primary)]" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-main)]">{t('dialogs.skeleton.stillLoading')}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{t('dialogs.skeleton.slow')}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 !rounded-full" />
          <div className="flex-1 space-y-2">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-4 w-40" />
          </div>
          <Bone className="h-10 w-10 !rounded-full" />
          <Bone className="h-10 w-10 !rounded-full" />
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
            <div className="space-y-2">
              <Bone className="h-2.5 w-20" />
              <Bone className="h-6 w-36" />
            </div>
            <Bone className="h-5 w-16 !rounded-full" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5 px-4 py-3">
                <Bone className="h-2 w-12" />
                <Bone className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2">
          <Bone className="h-10 flex-1 !rounded-xl" />
          <Bone className="h-10 w-10 !rounded-xl" />
        </div>

        {/* List */}
        {[3, 2].map((rows, g) => (
          <div key={g}>
            <Bone className="mb-2 ml-1 h-2.5 w-16" />
            <div className="divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Bone className="h-9 w-9 flex-shrink-0 !rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-3 w-1/2" />
                    <Bone className="h-2.5 w-3/4" />
                  </div>
                  <Bone className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LayoutShell>
  )
}
