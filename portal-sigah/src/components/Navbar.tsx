import { useState, useEffect } from 'react'
import { IconMenu2, IconX, IconLock } from '@tabler/icons-react'
import { NAV_LINKS } from '../data/navLinks'

interface Props {
  onLoginClick: () => void
}

export default function Navbar({ onLoginClick }: Props) {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-white transition-all duration-200 ${
        scrolled ? 'border-b border-border' : ''
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <span
          className="font-sans font-medium text-sigah-blue text-xl select-none cursor-default"
          style={{ letterSpacing: '-1px' }}
        >
          SIGAH
        </span>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(link => (
            <li key={link.href}>
              <a
                href={link.href}
                className="font-sans font-normal text-sm text-slate-500 hover:text-sigah-blue transition-colors duration-150"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA group */}
        <div className="hidden md:flex items-center gap-3">
          {/* Acceder — ghost */}
          <button
            onClick={onLoginClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-[1.5px] border-border text-slate-600 font-sans font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sigah-blue hover:text-sigah-blue active:scale-[0.97] select-none"
          >
            <IconLock size={13} />
            Acceder
          </button>
          {/* Solicitar demo — primary */}
          <a
            href="#planes"
            className="inline-flex items-center px-5 py-2 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm transition-all duration-200 hover:bg-sigah-blue-dark hover:-translate-y-0.5 active:scale-[0.97] select-none"
          >
            Solicitar demo
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-slate-500 hover:text-sigah-blue transition-colors rounded-lg"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-border px-6 py-5 flex flex-col gap-4">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="font-sans font-normal text-sm text-slate-600"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <button
              onClick={() => { setMenuOpen(false); onLoginClick() }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-[1.5px] border-sigah-blue text-sigah-blue font-sans font-medium text-sm"
            >
              <IconLock size={13} />
              Acceder al panel
            </button>
            <a
              href="#planes"
              className="flex items-center justify-center py-2.5 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm"
              onClick={() => setMenuOpen(false)}
            >
              Solicitar demo
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
