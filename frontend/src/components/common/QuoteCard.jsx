import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function QuoteCard({ quote }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl sm:rounded-3xl border border-amber-100/80 bg-gradient-to-br from-amber-50/90 to-orange-50/60 p-4 sm:p-5 shadow-sm backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center gap-2 text-amber-600">
        <Sparkles size={14} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Daily Reflection</span>
      </div>
      <p className="font-serif text-sm sm:text-base text-stone-700 leading-relaxed italic">"{quote}"</p>
    </motion.div>
  )
}
