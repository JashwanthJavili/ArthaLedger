import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Bug, Heart, MessageCircle, Star, CheckCircle2, Loader2, CornerDownRight } from 'lucide-react'
import { Sheet, SheetHeader, SheetBody, SheetFooter, TextArea, ErrorNote, Button } from '../settings/ui'
import { api } from '../../lib/api'

const KINDS = [
  { key: 'suggestion', label: 'Idea', Icon: Lightbulb },
  { key: 'bug', label: 'Problem', Icon: Bug },
  { key: 'praise', label: 'Praise', Icon: Heart },
  { key: 'other', label: 'Other', Icon: MessageCircle },
]
const PLACEHOLDER = {
  suggestion: 'What would make ArthaLedger better for you?',
  bug: 'What happened, and what did you expect? Which screen were you on?',
  praise: 'What do you like about ArthaLedger?',
  other: 'Tell us anything.',
}
const STATUS = {
  new: { label: 'Sent', cls: 'bg-[var(--border-subtle)] text-[var(--text-muted)]' },
  seen: { label: 'Read', cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  planned: { label: 'Planned', cls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  done: { label: 'Done', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
}
const MAX = 2000

const fmtDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/** Send an idea, problem or praise to the team, and see earlier messages and replies. */
export default function FeedbackSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} label="Send feedback">
      {open && <FeedbackBody onClose={onClose} />}
    </Sheet>
  )
}

function FeedbackBody({ onClose }) {
  const [tab, setTab] = useState('write')
  const [kind, setKind] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [allowPublic, setAllowPublic] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState({ loading: true, items: [], error: '' })

  const loadHistory = useCallback(() => {
    api('/v1/feedback/mine')
      .then(d => setHistory({ loading: false, items: d.items || [], error: '' }))
      .catch(e => setHistory({ loading: false, items: [], error: e.message }))
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const submit = async () => {
    if (message.trim().length < 3 || sending) return
    setSending(true)
    setError('')
    try {
      await api('/v1/feedback', {
        method: 'POST',
        body: { kind, message: message.trim(), rating: rating || null, allow_public: kind === 'praise' && allowPublic },
      })
      setSent(true)
      loadHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const replies = history.items.filter(i => i.reply).length

  return (
    <>
      <SheetHeader title="Help us improve" subtitle="Ideas, problems or a kind word. We read every message." onClose={onClose} />

      <div className="flex flex-shrink-0 gap-1 px-5 pt-3">
        {[['write', 'Write'], ['mine', `Your messages${replies ? ` · ${replies} ${replies === 1 ? 'reply' : 'replies'}` : ''}`]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors cursor-pointer ${
              tab === k ? 'bg-[var(--text-main)] text-[var(--bg-page)]' : 'text-[var(--text-muted)] hover:bg-[var(--border-subtle)]'
            }`}>{l}</button>
        ))}
      </div>

      {tab === 'write' ? (
        sent ? (
          <SheetBody>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 size={30} className="text-emerald-600 dark:text-emerald-400" />
              </span>
              <p className="mt-4 text-[16px] font-semibold text-[var(--text-main)]">Thank you!</p>
              <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-[var(--text-muted)]">
                Your message reached us. If we reply, you’ll see it under “Your messages”.
              </p>
              <div className="mt-6 flex w-full gap-2">
                <Button variant="secondary" onClick={() => { setSent(false); setMessage(''); setRating(0); setAllowPublic(false) }}>Send another</Button>
                <Button onClick={onClose}>Done</Button>
              </div>
            </motion.div>
          </SheetBody>
        ) : (
          <>
            <SheetBody className="space-y-4">
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Type of message">
                {KINDS.map(({ key, label, Icon }) => {
                  const on = kind === key
                  return (
                    <button key={key} type="button" role="radio" aria-checked={on} onClick={() => setKind(key)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-[12px] font-medium transition-colors cursor-pointer ${
                        on ? 'border-[var(--gold-primary)] bg-[var(--gold-light)] text-[var(--text-main)]' : 'border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                      }`}>
                      <Icon size={17} className={on ? 'text-[var(--gold-primary)]' : ''} />
                      {label}
                    </button>
                  )
                })}
              </div>

              <div>
                <TextArea rows={5} value={message} maxLength={MAX} onChange={(e) => setMessage(e.target.value)}
                  placeholder={PLACEHOLDER[kind]} aria-label="Your message" />
                <p className="mt-1 text-right text-[10.5px] tabular-nums text-[var(--text-subtle)]">{message.length}/{MAX}</p>
              </div>

              <div>
                <p className="mb-1.5 text-[12px] font-medium text-[var(--text-muted)]">How do you like ArthaLedger so far? <span className="text-[var(--text-subtle)]">(optional)</span></p>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      onClick={() => setRating(rating === n ? 0 : n)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform active:scale-90 cursor-pointer">
                      <Star size={24} className={n <= rating ? 'fill-[var(--gold-primary)] text-[var(--gold-primary)]' : 'text-[var(--border-card)]'} strokeWidth={1.75} />
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {kind === 'praise' && (
                  <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] px-3.5 py-3">
                    <input type="checkbox" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--gold-primary)]" />
                    <span className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                      You may show this on the ArthaLedger website with my first name.
                    </span>
                  </motion.label>
                )}
              </AnimatePresence>

              <ErrorNote>{error}</ErrorNote>
            </SheetBody>
            <SheetFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={sending || message.trim().length < 3}>
                {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Send'}
              </Button>
            </SheetFooter>
          </>
        )
      ) : (
        <SheetBody>
          {history.loading ? (
            <div className="space-y-3 py-2">
              {[0, 1].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          ) : history.error ? (
            <ErrorNote>{history.error}</ErrorNote>
          ) : history.items.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-subtle)]">You haven’t sent anything yet.</p>
          ) : (
            <ul className="space-y-3">
              {history.items.map(item => {
                const st = STATUS[item.status] || STATUS.new
                const k = KINDS.find(x => x.key === item.kind) || KINDS[3]
                return (
                  <li key={item.id} className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-3.5">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-subtle)]">
                      <k.Icon size={13} />
                      <span>{k.label}</span>
                      <span>·</span>
                      <span>{fmtDate(item.createdAt)}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="selectable mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-main)]">{item.message}</p>
                    {item.reply && (
                      <div className="mt-3 flex gap-2 rounded-xl bg-[var(--gold-light)] px-3 py-2.5">
                        <CornerDownRight size={14} className="mt-0.5 flex-shrink-0 text-[var(--gold-primary)]" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[var(--text-main)]">Reply from ArthaLedger</p>
                          <p className="selectable mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--text-muted)]">{item.reply}</p>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SheetBody>
      )}
    </>
  )
}
