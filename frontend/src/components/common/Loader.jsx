// Startup / first-load placeholder. Instead of a logo or "loading" text it
// shows the outline of the app (greeting, balance card, a few rows) so the
// real screen simply fills in. It stays invisible for the first moment, so
// fast loads go straight to the content with nothing flashing.
import { useI18n } from '../../i18n/core'

export default function Loader({ text }) {
  const { t } = useI18n()
  return (
    <div
      role="status"
      aria-label={text || t('common.loading')}
      className="min-h-[100dvh] bg-[var(--bg-page)] px-4 pt-[max(env(safe-area-inset-top),20px)] opacity-0 animate-[loader-in_300ms_ease-out_250ms_forwards]"
    >
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-2">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-6 w-40 rounded-lg" />
          </div>
          <div className="skeleton h-10 w-10 rounded-full" />
        </div>
        <div className="skeleton mt-6 h-36 w-full rounded-3xl" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-11 w-11 flex-shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-1/2 rounded-full" />
                <div className="skeleton h-2.5 w-1/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
