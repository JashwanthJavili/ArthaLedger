import { motion } from 'framer-motion'
import { FolderPlus, MousePointerClick, FolderInput, PieChart, Lightbulb } from 'lucide-react'
import { Sheet, SheetHeader, SheetBody, SheetFooter, Button } from '../settings/ui'
import { useI18n } from '../../i18n/core'

// Icons for each step; the text is in groups.help.steps (same order).
const STEP_ICONS = [FolderPlus, MousePointerClick, FolderInput, PieChart]

/** How Groups work, in four steps. */
export default function GroupsHelpSheet({ open, onClose }) {
  const { t } = useI18n()
  const steps = t('groups.help.steps')
  const tips = t('groups.help.tips')
  return (
    <Sheet open={open} onClose={onClose} label={t('groups.help.title')}>
      <SheetHeader title={t('groups.help.title')} subtitle={t('groups.help.subtitle')} onClose={onClose} />
      <SheetBody className="space-y-5">
        <ol className="relative space-y-4">
          <span className="absolute bottom-6 left-[19px] top-6 w-px bg-[var(--border-card)]" aria-hidden="true" />
          {steps.map((step, i) => ({ ...step, Icon: STEP_ICONS[i] })).map(({ Icon, title, text }, i) => (
            <motion.li key={title} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
              className="relative flex gap-3.5">
              <span className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-page)] text-[var(--gold-primary)]">
                <Icon size={17} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">{t('groups.help.step', { n: i + 1 })}</p>
                <p className="mt-0.5 text-[14.5px] font-semibold text-[var(--text-main)]">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{text}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--gold-light)] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-main)]">
            <Lightbulb size={15} className="text-[var(--gold-primary)]" /> {t('groups.help.tipsTitle')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {tips.map(tip => (
              <li key={tip} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[var(--gold-primary)]" />{tip}
              </li>
            ))}
          </ul>
        </div>
      </SheetBody>
      <SheetFooter>
        <Button onClick={onClose}>{t('groups.help.gotIt')}</Button>
      </SheetFooter>
    </Sheet>
  )
}
