'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import { EmailTemplate } from '@/types/database'
import Link from 'next/link'
import { ArrowLeft, Eye, Code } from 'lucide-react'

export default function EditTemplatePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  const [form, setForm] = useState({
    name: '',
    subject: '',
    sender_name: '',
    sender_email: '',
    category: 'general',
    difficulty: 'medium',
    body_html: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setForm({
          name: data.name,
          subject: data.subject,
          sender_name: data.sender_name,
          sender_email: data.sender_email,
          category: data.category,
          difficulty: data.difficulty,
          body_html: data.body_html,
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (tab === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(form.body_html)
        doc.close()
      }
    }
  }, [tab, form.body_html])

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('email_templates')
      .update({
        name: form.name,
        subject: form.subject,
        sender_name: form.sender_name,
        sender_email: form.sender_email,
        category: form.category,
        difficulty: form.difficulty,
        body_html: form.body_html,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      alert('Error al guardar: ' + error.message)
      setSaving(false)
      return
    }

    router.push('/templates')
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div>
      <div className="mb-4">
        <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver a templates
        </Link>
      </div>

      <PageHeader title="Editar template" description={form.name} />

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
              value={form.subject}
              onChange={(e) => updateForm('subject', e.target.value)}
            />
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

        {/* Cuerpo HTML con tabs */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'edit'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setTab('edit')}
            >
              <Code className="h-4 w-4" /> Editor HTML
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'preview'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setTab('preview')}
            >
              <Eye className="h-4 w-4" /> Vista previa
            </button>
          </div>
          <div className="p-6">
            {tab === 'edit' ? (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}, {'{{phishing_url}}'}
                </p>
                <textarea
                  className="input font-mono text-xs min-h-[400px]"
                  required
                  value={form.body_html}
                  onChange={(e) => updateForm('body_html', e.target.value)}
                />
              </>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <iframe
                  ref={iframeRef}
                  className="w-full border-0"
                  style={{ minHeight: '500px' }}
                  sandbox="allow-same-origin"
                  title="Vista previa del email"
                />
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
