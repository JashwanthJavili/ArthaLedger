import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, AnimatePresence, animate } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useState, useRef, useEffect } from 'react'
import {
  BookOpen, Shield, TrendingUp, FolderOpen,
  ArrowRight, Lock, BarChart2, Download,
  CheckCircle, Sparkles, Users, Star,
  ArrowUpRight, Eye, RefreshCw, Menu, X,
} from 'lucide-react'

/* ── Scroll-reveal wrapper ── */
function Reveal({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Animated stat counter ── */
function StatCard({ end, suffix = '', label, delay = 0 }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 })
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, end, {
      duration: 2.2, delay, ease: 'easeOut',
      onUpdate: (v) => setDisplay(end % 1 === 0 ? Math.round(v) : parseFloat(v.toFixed(1))),
    })
    return controls.stop
  }, [inView, end, delay])
  return (
    <div ref={ref} className="text-center px-4 py-6">
      <div className="font-serif text-3xl sm:text-4xl font-bold text-amber-700">
        {display.toLocaleString('en-IN')}{suffix}
      </div>
      <p className="text-xs text-stone-400 mt-1.5 font-medium uppercase tracking-widest">{label}</p>
    </div>
  )
}

/* ── Feature data ── */
const features = [
  { icon: FolderOpen, bg: 'bg-amber-50', fg: 'text-amber-700', title: 'Projects & Books', desc: 'Organise finances into projects — family, business, personal — each with multiple cashbooks.' },
  { icon: TrendingUp, bg: 'bg-emerald-50', fg: 'text-emerald-700', title: 'Real-time Tracking', desc: 'Every rupee recorded instantly. Running balances, cash in/out summaries at a glance.' },
  { icon: Lock, bg: 'bg-blue-50', fg: 'text-blue-700', title: 'PIN Protection', desc: 'Lock individual books or entire projects with a 4 or 6 digit PIN. Your data stays private.' },
  { icon: BarChart2, bg: 'bg-purple-50', fg: 'text-purple-700', title: 'Analytics', desc: 'Visual charts showing spending patterns, income trends, and category breakdowns.' },
  { icon: RefreshCw, bg: 'bg-teal-50', fg: 'text-teal-700', title: 'Book Transfers', desc: 'Move money between books within a project. Project totals stay accurate automatically.' },
  { icon: Download, bg: 'bg-rose-50', fg: 'text-rose-700', title: 'Export to PDF', desc: 'Download any cashbook as a formatted PDF — ready to share or archive.' },
]

const trust = ['No ads, ever', 'Free forever', 'Data encrypted in transit', 'Only you can access your data', 'Works offline (PWA)', 'Installable on Android & iOS']

const securityCards = [
  { icon: Shield, title: 'Firebase Security Rules', desc: 'Strict database rules ensure only you can read or write your own data.' },
  { icon: Lock, title: 'PIN Lock', desc: 'Add an extra layer of protection to individual books or entire projects.' },
  { icon: Eye, title: 'Hide Balances', desc: 'Instantly hide all financial values with one tap — perfect for shared screens.' },
  { icon: CheckCircle, title: 'bcrypt Passwords', desc: 'Firebase Authentication uses industry-standard hashing. We never see your password.' },
  { icon: RefreshCw, title: 'HTTPS / TLS', desc: 'All data is encrypted in transit using TLS. No plain-text transmission.' },
  { icon: Users, title: 'No Third-party Sharing', desc: 'Your data is never sold, shared, or used for advertising. Period.' },
]

const steps = [
  { num: '01', title: 'Create a Project', desc: 'Start by creating a project — name it "Home", "Business", or anything that fits your life.' },
  { num: '02', title: 'Add Cashbooks', desc: 'Inside each project, create cashbooks for different purposes: groceries, rent, salary, savings.' },
  { num: '03', title: 'Track Every Entry', desc: 'Log cash in and cash out entries. Watch your balance update in real time, always accurate.' },
]

const testimonials = [
  { name: 'Priya S.', role: 'Homemaker', text: 'Finally a cashbook app that feels calm and not overwhelming. I track all family expenses here.' },
  { name: 'Ravi K.', role: 'Small Business Owner', text: 'The PIN lock for projects is brilliant. I can keep business and personal finances separate and secure.' },
  { name: 'Ananya M.', role: 'Freelancer', text: 'The PDF export is so clean. I send it to my accountant every month. Saves so much time.' },
]

/* ── Floating app mockup ── */
function MockupCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[290px]"
    >
      <div className="absolute inset-0 rounded-3xl bg-amber-300/25 blur-3xl scale-110 pointer-events-none" />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="rounded-3xl border border-amber-200/70 bg-white/95 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-2">
              <img src="/L.png" alt="ArthaLedger" className="h-6 w-6 rounded-lg object-contain" />
              <span className="text-xs font-semibold text-stone-700 font-serif">ArthaLedger</span>
            </div>
            <span className="text-[10px] text-stone-400">Dashboard</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10px] text-stone-400">Good morning,</p>
              <p className="text-sm font-serif font-semibold text-stone-800">Jashwanth 🙏</p>
            </div>
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider">Net Balance</span>
                <span className="text-sm font-bold font-serif text-stone-800">₹1,24,500</span>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-1">
                  <TrendingUp size={9} className="text-emerald-500" />
                  <span className="text-[9px] text-stone-400">In</span>
                  <span className="text-[9px] font-semibold text-emerald-700 ml-1">₹2,10,000</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={9} className="text-red-400 rotate-180" />
                  <span className="text-[9px] text-stone-400">Out</span>
                  <span className="text-[9px] font-semibold text-red-600 ml-1">₹85,500</span>
                </div>
              </div>
            </div>
            {[{ name: 'Family Expenses', books: 3, net: '+₹45,200' }, { name: 'Business', books: 5, net: '+₹79,300' }].map((p) => (
              <div key={p.name} className="rounded-xl border border-amber-100 bg-white p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-1"><FolderOpen size={9} className="text-amber-700" /></div>
                  <div>
                    <p className="text-[10px] font-semibold text-stone-700">{p.name}</p>
                    <p className="text-[9px] text-stone-400">{p.books} books</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700">{p.net}</span>
              </div>
            ))}
            <div className="rounded-xl border border-amber-100 bg-white p-2.5">
              <p className="text-[9px] text-stone-400 mb-2 uppercase tracking-wider">This month</p>
              <div className="flex items-end gap-0.5 h-8">
                {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-amber-200" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="absolute -top-3 -right-3 rounded-xl bg-emerald-500 px-2.5 py-1.5 shadow-lg"
      >
        <p className="text-[10px] font-bold text-white">+₹12,400</p>
        <p className="text-[8px] text-emerald-100">Today</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        className="absolute -bottom-3 -left-3 rounded-xl bg-white border border-amber-100 px-2.5 py-1.5 shadow-lg"
      >
        <div className="flex items-center gap-1">
          <Shield size={9} className="text-amber-600" />
          <p className="text-[9px] font-semibold text-stone-700">PIN Protected</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <div className="min-h-screen bg-[#fdf8f0] text-stone-800 overflow-x-hidden">
      {/* ── Sticky Nav ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-amber-100/60 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <motion.div whileHover={{ rotate: 10, scale: 1.05 }}>
              <img src="/L.png" alt="ArthaLedger" className="h-10 w-10 rounded-xl shadow-sm object-contain bg-amber-50 p-0.5" />
            </motion.div>
            <span className="font-serif text-lg font-semibold text-stone-800">ArthaLedger</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-stone-500">
            <a href="#features" className="hover:text-amber-700 transition-colors">Features</a>
            <a href="#security" className="hover:text-amber-700 transition-colors">Security</a>
            <a href="#about" className="hover:text-amber-700 transition-colors">About</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-amber-50 transition-colors">Sign In</Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 transition-colors shadow-sm inline-flex items-center gap-1.5">
                Get Started <ArrowRight size={13} />
              </Link>
            </motion.div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-stone-600 hover:text-amber-700">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-amber-100 bg-white/95 backdrop-blur-md overflow-hidden"
            >
              <div className="px-4 py-4 space-y-3">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-stone-600 hover:text-amber-700">Features</a>
                <a href="#security" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-stone-600 hover:text-amber-700">Security</a>
                <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-stone-600 hover:text-amber-700">About</a>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-stone-600 hover:text-amber-700">Sign In</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-orange-200/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-100/20 blur-3xl" />
        </div>
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative w-full">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center py-16">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-medium text-amber-700 mb-6">
                  <Sparkles size={11} /> Mindful Financial Tracking
                </span>
              </motion.div>
              <motion.h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-stone-800 leading-[1.15] mb-5">
                {['Where', 'every', 'rupee', 'has', 'meaning'].map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                    className={word === 'rupee' ? 'text-amber-700' : ''}
                  >
                    {word}{' '}
                  </motion.span>
                ))}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="text-base sm:text-lg text-stone-500 leading-relaxed max-w-md mb-8">
                A peaceful, private cashbook app for individuals, families, and small businesses. Track income, expenses, and transfers — all in one place.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="flex items-center gap-3 flex-wrap mb-10">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl bg-amber-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-amber-800 transition-colors shadow-lg shadow-amber-200">
                    Start for free <ArrowRight size={15} />
                  </Link>
                </motion.div>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                  Sign in <ArrowUpRight size={13} />
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.8 }} className="flex flex-wrap gap-3">
                {['Free forever', 'No ads', 'Private & secure'].map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-xs text-stone-500">
                    <CheckCircle size={12} className="text-emerald-500" /> {t}
                  </span>
                ))}
              </motion.div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <MockupCard />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 border-y border-amber-100/60 bg-white/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 divide-x-0 sm:divide-x divide-amber-100">
              <StatCard end={10000} suffix="+" label="Entries Tracked" delay={0} />
              <StatCard end={500} suffix="+" label="Active Users" delay={0.1} />
              <StatCard end={99} suffix="%" label="Uptime" delay={0.2} />
              <StatCard end={4.9} suffix="★" label="User Rating" delay={0.3} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center mb-12">
          <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 mb-3">Features</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-800 mb-3">Everything you need</h2>
          <p className="text-stone-400 text-sm max-w-md mx-auto">Simple, focused tools that help you understand your money without overwhelming you.</p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <motion.div whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(185,147,78,0.12)' }} transition={{ duration: 0.2 }} className="rounded-2xl border border-amber-100/80 bg-white p-5 h-full">
                <div className={`rounded-xl p-2.5 w-fit mb-3 ${f.bg}`}>
                  <f.icon size={16} className={f.fg} />
                </div>
                <h3 className="text-sm font-semibold text-stone-800 mb-1.5">{f.title}</h3>
                <p className="text-xs text-stone-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 bg-gradient-to-b from-amber-50/50 to-white border-y border-amber-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal className="text-center mb-16">
            <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 mb-3">How It Works</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-800 mb-3">Three simple steps</h2>
            <p className="text-stone-400 text-sm max-w-md mx-auto">Start tracking your finances in under 2 minutes</p>
          </Reveal>
          <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <Reveal key={step.num} delay={i * 0.12}>
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 w-16 h-16 flex items-center justify-center mb-4 shadow-lg">
                      <span className="font-serif text-xl font-bold text-amber-800">{step.num}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-stone-800 mb-2">{step.title}</h3>
                    <p className="text-xs text-stone-500 leading-relaxed max-w-xs">{step.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-amber-200 to-transparent" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="py-20 bg-gradient-to-br from-stone-900 to-stone-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }} />
          ))}
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal className="text-center mb-12">
            <span className="inline-block rounded-full border border-stone-600 bg-stone-700/50 px-3 py-1 text-xs font-medium text-stone-300 mb-3">Security & Privacy</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-3">Your data is yours. Always.</h2>
            <p className="text-stone-400 text-sm max-w-md mx-auto">Built with privacy-first principles. We never see your financial data.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {securityCards.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <div className="rounded-2xl border border-stone-700 bg-stone-800/50 p-5">
                  <div className="rounded-xl bg-stone-700/50 p-2.5 w-fit mb-3">
                    <item.icon size={15} className="text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="rounded-2xl border border-stone-700 bg-stone-800/30 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {trust.map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-stone-300">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section id="about" className="py-20 mx-auto max-w-4xl px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-8 text-center">
              <p className="font-serif text-5xl sm:text-6xl text-amber-700 mb-4">अर्थ</p>
              <p className="text-2xl font-serif text-amber-600 mb-3">"Artha"</p>
              <p className="text-xs text-stone-500 leading-relaxed">Wealth · Purpose · Meaning</p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div>
              <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 mb-4">Our Philosophy</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-800 mb-4 leading-snug">Money tracked with intention creates peace of mind</h2>
              <p className="text-sm text-stone-500 leading-relaxed mb-4">
                In ancient Indian philosophy, <span className="font-semibold text-stone-700">Artha</span> is one of the four goals of a fulfilling life — the pursuit of material well-being with wisdom and intention.
              </p>
              <p className="text-sm text-stone-500 leading-relaxed">
                ArthaLedger is built on the belief that when you track every rupee mindfully, you gain clarity, reduce anxiety about money, and move toward true abundance.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 bg-amber-50/50 border-y border-amber-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal className="text-center mb-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-800 mb-2">Loved by users</h2>
            <p className="text-xs text-stone-400">Real feedback from real people</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm min-w-[280px] sm:min-w-0 snap-center">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={12} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed mb-4 italic">"{t.text}"</p>
                  <div>
                    <p className="text-xs font-semibold text-stone-700">{t.name}</p>
                    <p className="text-[10px] text-stone-400">{t.role}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <div className="rounded-3xl bg-gradient-to-br from-amber-700 via-amber-700 to-amber-800 px-8 py-12 text-center shadow-2xl shadow-amber-200 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-8 w-32 h-32 rounded-full border-2 border-white" />
              <div className="absolute bottom-4 left-8 w-20 h-20 rounded-full border border-white" />
            </div>
            <div className="relative">
              <Sparkles size={24} className="text-amber-300 mx-auto mb-4" />
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white mb-3">Ready to track mindfully?</h2>
              <p className="text-sm text-amber-200 mb-7 leading-relaxed max-w-sm mx-auto">Free forever. No ads. No subscriptions.<br />Just your finances, clearly.</p>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 transition-colors shadow-lg">
                  Create your free account <ArrowRight size={15} />
                </Link>
              </motion.div>
              <p className="mt-4 text-xs text-amber-300">
                Already have an account?{' '}
                <Link to="/login" className="underline hover:text-white transition-colors">Sign in</Link>
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-amber-100 bg-white/70 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <img src="/L.png" alt="ArthaLedger" className="h-8 w-8 rounded-lg object-contain bg-amber-50 p-0.5" />
              <span className="font-serif text-sm font-semibold text-stone-700">ArthaLedger</span>
            </div>
            <div className="flex items-center gap-5 text-xs text-stone-400">
              <Link to="/login" className="hover:text-amber-700 transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-amber-700 transition-colors">Register</Link>
              <a href="#features" className="hover:text-amber-700 transition-colors">Features</a>
              <a href="#security" className="hover:text-amber-700 transition-colors">Security</a>
            </div>
          </div>
          <div className="pt-5 border-t border-amber-50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
            <p>© {new Date().getFullYear()} ArthaLedger · Designed & developed by <span className="text-amber-700 font-medium">Javili Jashwanth</span></p>
            <p className="italic text-stone-300">"Mindful spending creates peaceful living."</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
