import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function AuthLayout({ children, footer }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-col items-center gap-3"
      >
        <img src="/L.png" alt="ArthaLedger" className="h-16 w-16 rounded-2xl shadow-md object-contain bg-amber-50 p-1" />
        <div className="text-center">
          <h1 className="font-serif text-2xl font-semibold text-stone-800">ArthaLedger</h1>
          <p className="mt-0.5 text-xs text-stone-400 tracking-wide">Where every rupee has meaning</p>
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-sm rounded-3xl border border-amber-100/80 bg-white/85 p-6 shadow-xl backdrop-blur-md"
      >
        {children}
        {footer && (
          <p className="mt-5 text-center text-xs text-stone-500">{footer}</p>
        )}
        <p className="mt-3 text-center text-[10px] text-stone-300 italic">
          ArthaLedger — Where every rupee has meaning
        </p>
      </motion.section>
    </main>
  )
}
