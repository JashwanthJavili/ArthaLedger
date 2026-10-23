import { motion } from 'framer-motion'
import { FolderPlus, MousePointerClick, FolderInput, PieChart, Lightbulb } from 'lucide-react'
import { Sheet, SheetHeader, SheetBody, SheetFooter, Button } from '../settings/ui'

const STEPS = [
  {
    Icon: FolderPlus,
    title: 'Create a group',
    text: 'Tap New group and give it a name, like “Goa trip”, “Wedding” or “New house”.',
  },
  {
    Icon: MousePointerClick,
    title: 'Pick transactions in any book',
    text: 'Open a book and tap Select, or press and hold a transaction. Tick every transaction that belongs to the group.',
  },
  {
    Icon: FolderInput,
    title: 'Tap Add to group',
    text: 'Choose the group, or make a new one right there. You can add from as many books and projects as you like.',
  },
  {
    Icon: PieChart,
    title: 'See it all in one place',
    text: 'Open the group to see the total, spending by category, and every transaction with the book it came from.',
  },
]

const TIPS = [
  'Your transactions stay in their books. A group links to them, so any edit you make in the book shows up in the group too.',
  'Removing a transaction from a group, or deleting the group, never deletes it from the book.',
  'Tap a transaction inside a group to open it in its original book.',
]

/** How Groups work, in four steps. */
export default function GroupsHelpSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} label="How groups work">
      <SheetHeader title="How groups work" subtitle="Bring related spending from different books together" onClose={onClose} />
      <SheetBody className="space-y-5">
        <ol className="relative space-y-4">
          <span className="absolute bottom-6 left-[19px] top-6 w-px bg-[var(--border-card)]" aria-hidden="true" />
          {STEPS.map(({ Icon, title, text }, i) => (
            <motion.li key={title} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
              className="relative flex gap-3.5">
              <span className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-page)] text-[var(--gold-primary)]">
                <Icon size={17} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">Step {i + 1}</p>
                <p className="mt-0.5 text-[14.5px] font-semibold text-[var(--text-main)]">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{text}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--gold-light)] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-main)]">
            <Lightbulb size={15} className="text-[var(--gold-primary)]" /> Good to know
          </p>
          <ul className="mt-2 space-y-1.5">
            {TIPS.map(t => (
              <li key={t} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[var(--gold-primary)]" />{t}
              </li>
            ))}
          </ul>
        </div>
      </SheetBody>
      <SheetFooter>
        <Button onClick={onClose}>Got it</Button>
      </SheetFooter>
    </Sheet>
  )
}
