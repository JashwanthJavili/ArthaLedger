import { motion } from 'framer-motion'

export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="h-10 w-10 rounded-full border-2 border-amber-200 border-t-amber-600"
      />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-stone-500 font-medium"
      >
        {text}
      </motion.p>
    </div>
  )
}
