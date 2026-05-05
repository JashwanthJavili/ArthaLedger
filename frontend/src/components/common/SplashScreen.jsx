import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Animated splash screen shown on first app load.
 * Shows logo → app name types in → tagline fades → exits.
 * Only shown when running as installed PWA (standalone mode).
 */
export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('logo')   // 'logo' | 'name' | 'tagline' | 'exit'
  const [typedName, setTypedName] = useState('')
  const [typedTag, setTypedTag] = useState('')

  const fullName = 'ArthaLedger'
  const fullTag = 'Where every rupee has meaning'

  useEffect(() => {
    // Phase 1: logo appears (0–600ms)
    const t1 = setTimeout(() => setPhase('name'), 600)

    // Phase 2: type app name (600–1400ms)
    let nameIdx = 0
    const nameInterval = setInterval(() => {
      nameIdx++
      setTypedName(fullName.slice(0, nameIdx))
      if (nameIdx >= fullName.length) {
        clearInterval(nameInterval)
        setPhase('tagline')
      }
    }, 70)

    // Phase 3: type tagline (1400–2600ms)
    let tagIdx = 0
    const t2 = setTimeout(() => {
      const tagInterval = setInterval(() => {
        tagIdx++
        setTypedTag(fullTag.slice(0, tagIdx))
        if (tagIdx >= fullTag.length) {
          clearInterval(tagInterval)
          // Phase 4: hold then exit
          setTimeout(() => {
            setPhase('exit')
            setTimeout(onDone, 600)
          }, 600)
        }
      }, 35)
    }, 1400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearInterval(nameInterval)
    }
  }, [onDone])

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #fff9ee 0%, #fdf6e7 40%, #f9efe0 100%)' }}
        >
          {/* Soft background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-200/30 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-orange-200/20 blur-3xl" />
          </div>

          <div className="relative flex flex-col items-center gap-5">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Glow ring */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.15, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute inset-0 rounded-3xl bg-amber-300/30 blur-xl"
              />
              <motion.img
                src="/L.png"
                alt="ArthaLedger"
                className="relative h-24 w-24 rounded-3xl shadow-2xl object-contain bg-white p-2"
                animate={phase === 'logo' ? { y: [0, -6, 0] } : { y: 0 }}
                transition={{ duration: 1.5, repeat: phase === 'logo' ? Infinity : 0, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* App name — typewriter */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: phase !== 'logo' ? 1 : 0, y: phase !== 'logo' ? 0 : 8 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <h1 className="font-serif text-3xl font-semibold text-stone-800 tracking-wide min-h-[2.5rem]">
                {typedName}
                {phase === 'name' && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-0.5 h-7 bg-amber-600 ml-0.5 align-middle"
                  />
                )}
              </h1>
            </motion.div>

            {/* Tagline — typewriter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'tagline' || phase === 'exit' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-center min-h-[1.25rem]"
            >
              <p className="text-xs text-stone-400 tracking-widest uppercase">
                {typedTag}
                {phase === 'tagline' && typedTag.length < fullTag.length && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                    className="inline-block w-0.5 h-3 bg-stone-400 ml-0.5 align-middle"
                  />
                )}
              </p>
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'tagline' || phase === 'exit' ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="flex gap-1.5 mt-2"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-amber-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
