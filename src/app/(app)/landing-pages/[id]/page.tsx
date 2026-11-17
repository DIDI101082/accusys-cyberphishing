'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import { LandingPage } from '@/types/database'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EditLandingPagePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    page_type: 'login',
    brand_name: '',
    capture_credentials: true,
    capture_fields_text: 'email,password',
    redirect_url: '/awareness',
    html_content: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        const lp = data as LandingPage
        setForm({
          name: lp.name,
          page_type: lp.page_type,
          brand_name: lp.brand_name || '',
          capture_credentials: lp.capture_credentials,
          capture_fields_text: Array.isArray(lp.capture_fields) ? lp.capture_fields.join(', ') : '',
          redirect_url: lp.redirect_url,
          html_content: lp.html_content,
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const capture_fields = form.capture_fields_text
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from('landing_pages')
      .update({
        name: form.name,
        page_type: form.page_type,
        brand_name: form.brand_name || null,
        capture_credentials: form.capture_credentials,
        capture_fields,
        redirect_url: form.redirect_url,
        html_content: form.html_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      alert('Error al guardar: ' + error.message)
      setSaving(false)
      return
    }

    router.push('/landing-pages')
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div>
      <div className="mb-4">
        <Link href="/landing-pages" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver a landing pages
        </Link>
      </div>

      <PageHeader title="Editar landing page" description={form.name} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Información básica</h3>
            <div>
              <label className="label">Nombre *</label>
              <input
                type="text"
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo de página</label>
                <select
                  className="input"
                  value={form.page_type}
                  onChange={(e) => setForm({ ...form, page_type: e.target.value })}
                >
                  <option value="login">Login</option>
                  <option value="download">Download</option>
                  <option value="form">Formulario</option>
                  <option value="survey">Encuesta</option>
                </select>
              </div>
              <div>
                <label className="label">Marca simulada</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Microsoft 365"
                  value={form.brand_name}
                  onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Configuración de captura</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="rounded text-brand-600"
                checked={form.capture_credentials}
                onChange={(e) => setForm({ ...form, capture_credentials: e.target.checked })}
              />
              <span className="text-sm text-gray-700">Capturar credenciales enviadas</span>
            </label>
            <div>
              <label className="label">Campos a capturar (separados por coma)</label>
              <input
                type="text"
                className="input"
                value={form.capture_fields_text}
                onChange={(e) => setForm({ ...form, capture_fields_text: e.target.value })}
              />
            </div>
            <div>
              <label className="label">URL de redirección post-captura</label>
              <input
                type="text"
                className="input"
                value={form.redirect_url}
                onChange={(e) => setForm({ ...form, redirect_url: e.target.value })}
              />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Contenido HTML</h3>
            <textarea
              className="input font-mono text-xs min-h-[400px]"
              value={form.html_content}
              onChange={(e) => setForm({ ...form, html_content: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => router.back()}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        {/* Vista previa */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Vista previa</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={form.html_content}
                sandbox="allow-same-origin"
                className="w-full h-[700px]"
                title="Vista previa de landing page"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
