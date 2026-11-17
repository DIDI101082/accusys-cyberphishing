'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewTemplatePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    subject: '',
    sender_name: 'IT Department',
    sender_email: 'it@company.com',
    category: 'general',
    difficulty: 'medium',
    body_html: '',
  })

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('email_templates').insert({
      name: form.name,
      subject: form.subject,
      sender_name: form.sender_name,
      sender_email: form.sender_email,
      category: form.category,
      difficulty: form.difficulty,
      body_html: form.body_html,
    })

    if (error) {
      alert('Error al crear el template: ' + error.message)
      setSaving(false)
      return
    }

    router.push('/templates')
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver a templates
        </Link>
      </div>

      <PageHeader title="Nuevo template de email" description="Creá una plantilla de correo para campañas de phishing" />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Info básica */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Información básica</h3>
          <div>
            <label className="label">Nombre del template *</label>
            <input
              type="text"
              className="input"
              required
              placeholder="Ej: Cambio de contraseña urgente"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Asunto del email *</label>
            <input
              type="text"
              className="input"
              required
              placeholder="Ej: Acción requerida: Tu contraseña expira en 24 horas"
              value={form.subject}
              onChange={(e) => updateForm('subject', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Podés usar variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}
            </p>
          </div>
        </div>

        {/* Remitente */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Remitente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre del remitente *</label>
              <input
                type="text"
                className="input"
                required
                placeholder="Ej: Microsoft 365"
                value={form.sender_name}
                onChange={(e) => updateForm('sender_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email del remitente *</label>
              <input
                type="email"
                className="input"
                required
                placeholder="Ej: noreply@microsoft-365.com"
                value={form.sender_email}
                onChange={(e) => updateForm('sender_email', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Clasificación */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Clasificación</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
                <option value="general">General</option>
                <option value="credential">Credenciales</option>
                <option value="malware">Malware</option>
                <option value="social">Ingeniería Social</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="label">Dificultad</label>
              <select className="input" value={form.difficulty} onChange={(e) => updateForm('difficulty', e.target.value)}>
                <option value="easy">Fácil</option>
                <option value="medium">Media</option>
                <option value="hard">Difícil</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cuerpo HTML */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Cuerpo del email (HTML)</h3>
          <p className="text-xs text-gray-400">
            Escribí el HTML del cuerpo del email. Variables disponibles: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}, {'{{phishing_url}}'}
          </p>
          <textarea
            className="input font-mono text-xs min-h-[400px]"
            required
            placeholder="<div>...</div>"
            value={form.body_html}
            onChange={(e) => updateForm('body_html', e.target.value)}
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear template'}
          </button>
        </div>
      </form>
    </div>
  )
}
