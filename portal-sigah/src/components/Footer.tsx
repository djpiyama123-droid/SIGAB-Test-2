import { IconMail, IconMapPin, IconBrandLinkedin, IconLock } from '@tabler/icons-react'
import { NAV_LINKS } from '../data/navLinks'

interface Props {
  onLoginClick: () => void
}

export default function Footer({ onLoginClick }: Props) {
  return (
    <footer className="bg-sigah-blue-dark">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-12 pb-12 border-b border-white/20">
          <div>
            <span
              className="font-sans font-medium text-xl text-white block mb-4"
              style={{ letterSpacing: '-1px' }}
            >
              SIGAH
            </span>
            <p className="font-data font-normal text-sm text-white/65 leading-relaxed mb-4">
              Sistema Integral de Gestión de Activos Biomédicos. Plataforma SaaS B2B para la gestión inteligente de equipos biomédicos en instituciones de salud mexicanas.
            </p>
            <p className="font-data font-normal text-xs text-white/40">
              SIGAH, S. de R.L. de C.V.
            </p>
          </div>

          <div>
            <p className="font-data font-medium text-xs text-white/40 uppercase tracking-wider mb-6">
              NAVEGACIÓN
            </p>
            <ul className="space-y-3">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="font-data font-normal text-sm text-white/65 hover:text-white transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-data font-medium text-xs text-white/40 uppercase tracking-wider mb-6">
              CONTACTO
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <IconMail size={15} className="text-white/40 flex-shrink-0" />
                <span className="font-data font-normal text-sm text-white/65">
                  contacto@sigah.mx
                </span>
              </li>
              <li className="flex items-center gap-3">
                <IconMapPin size={15} className="text-white/40 flex-shrink-0" />
                <span className="font-data font-normal text-sm text-white/65">
                  Tijuana, Baja California, México
                </span>
              </li>
              <li className="flex items-center gap-3">
                <IconBrandLinkedin size={15} className="text-white/40 flex-shrink-0" />
                <a
                  href="#"
                  className="font-data font-normal text-sm text-white/65 hover:text-white transition-colors duration-150"
                >
                  SIGAH en LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="font-data font-normal text-xs text-white/40">
            2026 SIGAH. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onLoginClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/20 text-white/60 font-sans font-medium text-xs transition-all duration-200 hover:border-white/40 hover:text-white hover:-translate-y-0.5 active:scale-[0.97] select-none"
            >
              <IconLock size={12} />
              Acceder al panel
            </button>
            <p className="font-data font-normal text-xs text-white/30 hidden md:block">
              Escuela de Bioingeniería — Universidad Xochicalco
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
