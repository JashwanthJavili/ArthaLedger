import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { APK_URL, CONTACT } from './constants'
import { Logo } from './ui'

function FooterCol({ title, children }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>{title}</p>
      <ul className="mt-4 space-y-1">{children}</ul>
    </div>
  )
}

function FooterLink({ to, href, download, children }) {
  const cls = 'inline-flex min-h-9 items-center text-[14px] transition-colors hover:text-[var(--text-main)]'
  const style = { color: 'var(--text-muted)' }
  return <li>{to ? <Link to={to} className={cls} style={style}>{children}</Link> : <a href={href} download={download} className={cls} style={style}>{children}</a>}</li>
}

export default function SiteFooter() {
  const [year] = useState(() => new Date().getFullYear())
  const onHome = useLocation().pathname === '/'
  // Section links scroll on the landing page and navigate there from elsewhere
  const sec = (id) => (onHome ? { href: `#${id}` } : { to: `/#${id}` })
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'color-mix(in srgb, var(--gold-primary) 3%, var(--bg-page))' }}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-xs lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-serif-luxury text-[18px] font-semibold" style={{ color: 'var(--text-main)' }}>ArthaLedger</span>
          </div>
          <p className="font-serif-luxury mt-3 text-[14px] italic" style={{ color: 'var(--text-muted)' }}>Where every rupee has meaning.</p>
          <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-subtle)' }}>A simple, private money notebook for personal, family and business use.</p>
        </div>
        <FooterCol title="Product">
          <FooterLink {...sec('how')}>How it works</FooterLink>
          <FooterLink {...sec('features')}>Features</FooterLink>
          <FooterLink to="/pricing">Pricing</FooterLink>
          <FooterLink {...sec('faq')}>FAQ</FooterLink>
          <FooterLink href={APK_URL} download>Download for Android</FooterLink>
        </FooterCol>
        <FooterCol title="Account">
          <FooterLink to="/register">Create account</FooterLink>
          <FooterLink to="/login">Sign in</FooterLink>
          <FooterLink to="/forgot-password">Reset password</FooterLink>
        </FooterCol>
        <FooterCol title="Company">
          <FooterLink to="/privacy">Privacy policy</FooterLink>
          <FooterLink href={`mailto:${CONTACT}`}>Contact us</FooterLink>
          <FooterLink href={`mailto:${CONTACT}?subject=Collaboration%20with%20ArthaLedger`}>Collaborate</FooterLink>
        </FooterCol>
      </div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-[13px] sm:flex-row sm:justify-between sm:px-6" style={{ color: 'var(--text-subtle)' }}>
          <span>© {year} ArthaLedger. All rights reserved.</span>
          <span>Made with care in India</span>
        </div>
      </div>
    </footer>
  )
}
