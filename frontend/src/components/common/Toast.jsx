import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const styles = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-amber-600 text-white',
}

export default function Toast({ message, type = 'success', visible }) {
  const Icon = icons[type] || CheckCircle
  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.94 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className={`fixed bottom-36 left-1/2 z-[70] flex w-[min(90vw,360px)] -translate-x-1/2 items-center gap-2.5 rounded-2xl px-4 py-3 shadow-xl ${styles[type]}`}
        >
          <Icon size={16} className="flex-shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
