import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { APK_URL, CONTACT, scrollToSection } from './constants'
import { Logo } from './ui'
import { useI18n } from '../../i18n/core'

function FooterCol({ title, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-subtle)' }}>{title}</p>
      <ul className="mt-2.5">{children}</ul>
    </div>
  )
}

function FooterLink({ to, href, download, children }) {
  const cls = 'inline-flex min-h-8 items-center text-[13.5px] transition-colors hover:text-[var(--text-main)]'
  const style = { color: 'var(--text-muted)' }
  return <li>{to ? <Link to={to} className={cls} style={style}>{children}</Link> : <a href={href} download={download} onClick={href?.startsWith('#') ? (e) => scrollToSection(e, href.slice(1)) : undefined} className={cls} style={style}>{children}</a>}</li>
}

export default function SiteFooter() {
  const { t } = useI18n()
  const [year] = useState(() => new Date().getFullYear())
  const onHome = useLocation().pathname === '/'
  // Section links scroll on the landing page and navigate there from elsewhere
  const sec = (id) => (onHome ? { href: `#${id}` } : { to: `/#${id}` })
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'color-mix(in srgb, var(--gold-primary) 3%, var(--bg-page))' }}>
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-x-4 gap-y-7 px-4 py-9 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:py-12">
        <div className="col-span-3 max-w-sm lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-serif-luxury text-[18px] font-semibold" style={{ color: 'var(--text-main)' }}>ArthaLedger</span>
          </div>
          <p className="font-serif-luxury mt-2 text-[14px] italic" style={{ color: 'var(--text-muted)' }}>{t('site.footer.tagline')}</p>
        </div>
        <FooterCol title={t('site.footer.product')}>
          <FooterLink {...sec('how')}>{t('site.nav.how')}</FooterLink>
          <FooterLink {...sec('features')}>{t('site.nav.features')}</FooterLink>
          <FooterLink to="/pricing">{t('site.nav.pricing')}</FooterLink>
          <FooterLink {...sec('faq')}>{t('site.nav.faq')}</FooterLink>
          <FooterLink href={APK_URL} download>{t('common.androidApp')}</FooterLink>
        </FooterCol>
        <FooterCol title={t('site.footer.account')}>
          <FooterLink to="/register">{t('site.footer.signUp')}</FooterLink>
          <FooterLink to="/login">{t('common.signIn')}</FooterLink>
        </FooterCol>
        <FooterCol title={t('site.footer.company')}>
          <FooterLink to="/privacy">{t('site.footer.privacy')}</FooterLink>
          <FooterLink href={`mailto:${CONTACT}`}>{t('site.footer.contact')}</FooterLink>
          <FooterLink href={`mailto:${CONTACT}?subject=Collaboration%20with%20ArthaLedger`}>{t('site.footer.collaborate')}</FooterLink>
        </FooterCol>
      </div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-4 text-[12.5px] sm:flex-row sm:justify-between sm:px-6" style={{ color: 'var(--text-subtle)' }}>
          <span>{t('site.footer.rights', { year })}</span>
          <span>{t('site.footer.madeIn')}</span>
        </div>
      </div>
    </footer>
  )
}
