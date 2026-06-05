import { useState } from 'react'
import { IconMail, IconBuilding, IconUser, IconMessage, IconSend, IconCircleCheck } from '@tabler/icons-react'

export default function ContactSection() {
  const [form, setForm] = useState({ nombre: '', institucion: '', email: '', mensaje: '' })
  const [sent, setSent] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`[SIGAH] Solicitud de información — ${form.institucion}`)
    const body = encodeURIComponent(
      `Nombre: ${form.nombre}\nInstitución: ${form.institucion}\nEmail: ${form.email}\n\nMensaje:\n${form.mensaje}`
    )
    window.open(`mailto:contacto@sigah.mx?subject=${subject}&body=${body}`, '_blank')
    setSent(true)
    setTimeout(() => setSent(false), 5000)
  }

  const fields = [
    { name: 'nombre',      label: 'Nombre completo',   icon: <IconUser size={15} />,     type: 'text',  placeholder: 'Ing. Carlos Ramírez' },
    { name: 'institucion', label: 'Institución',        icon: <IconBuilding size={15} />, type: 'text',  placeholder: 'HGR No. 1 IMSS Tijuana' },
    { name: 'email',       label: 'Correo electrónico', icon: <IconMail size={15} />,     type: 'email', placeholder: 'correo@hospital.gob.mx' },
  ]

  return (
    <section id="contacto" className="py-20 px-6 bg-bg-principal">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left */}
          <div>
            <p className="font-data font-normal text-xs text-sigah-blue uppercase tracking-wider mb-3">
              CONTACTO
            </p>
            <h2 className="font-sans font-medium text-3xl text-slate-900 mb-5">
              ¿Tu hospital necesita control de activos?
            </h2>
            <p className="font-data font-normal text-lg text-slate-500 leading-relaxed mb-8">
              Escríbenos para agendar una demo en tu institución. Sin compromiso —
              te mostramos SIGAB corriendo en producción real con datos del IMSS Tijuana.
            </p>

            <div className="space-y-5">
              {[
                { icon: '📍', title: 'Tijuana, Baja California, México', sub: 'Cobertura: BC, Sonora y expansión nacional' },
                { icon: '✉️', title: 'contacto@sigah.mx', sub: 'Respuesta en menos de 24 horas hábiles' },
                { icon: '🎓', title: 'Universidad Xochicalco', sub: 'Proyecto de Bioingeniería en Procesos de Manufactura' },
              ].map(i => (
                <div key={i.title} className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">{i.icon}</span>
                  <div>
                    <p className="font-sans font-medium text-sm text-slate-800">{i.title}</p>
                    <p className="font-data font-normal text-xs text-slate-400 mt-0.5">{i.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl card-border p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <IconCircleCheck size={48} className="text-esmeralda" />
                <p className="font-sans font-medium text-lg text-slate-900">¡Mensaje enviado!</p>
                <p className="font-data font-normal text-sm text-slate-500">
                  Se abrió tu cliente de correo. Te responderemos pronto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {fields.map(f => (
                  <div key={f.name}>
                    <label className="font-data font-normal text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      {f.label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{f.icon}</span>
                      <input
                        type={f.type}
                        name={f.name}
                        required
                        value={form[f.name as keyof typeof form]}
                        onChange={handleChange}
                        placeholder={f.placeholder}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border font-data font-normal text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-sigah-blue transition-colors bg-bg-principal"
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="font-data font-normal text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Mensaje
                  </label>
                  <div className="relative">
                    <IconMessage size={15} className="absolute left-3 top-3 text-slate-400" />
                    <textarea
                      name="mensaje"
                      required
                      rows={4}
                      value={form.mensaje}
                      onChange={handleChange}
                      placeholder="Cuéntanos sobre tu institución y qué necesitas…"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border font-data font-normal text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-sigah-blue transition-colors resize-none bg-bg-principal"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sigah-blue text-white font-sans font-medium text-sm hover:bg-sigah-blue-dark transition-colors duration-150 active:scale-[0.98]"
                >
                  <IconSend size={16} />
                  Solicitar demo
                </button>

                <p className="font-data font-normal text-xs text-slate-400 text-center">
                  Al enviar, se abrirá tu cliente de correo con los datos pre-llenados.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
