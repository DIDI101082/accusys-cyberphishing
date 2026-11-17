'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import AIGenerateModal from '@/components/AIGenerateModal'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function NewLandingPagePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)

  const [form, setForm] = useState({
    name: '',
    page_type: 'login',
    brand_name: '',
    capture_credentials: true,
    capture_fields_text: 'email,password',
    redirect_url: '/awareness',
    html_content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iniciar sesión</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { background: white; padding: 40px; width: 400px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h2 { margin-bottom: 20px; }
    input { width: 100%; padding: 10px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    button { background: #0067b8; color: white; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Iniciar sesión</h2>
    <form id="phish-form" method="POST">
      <input type="email" name="email" placeholder="Correo electrónico" required>
      <input type="password" name="password" placeholder="Contraseña" required>
      <button type="submit">Continuar</button>
    </form>
  </div>
</body>
</html>`,
  })

  function handleAIResult(result: { type: string; html: string }) {
    if (result.type === 'landing') {
      setForm((prev) => ({ ...prev, html_content: result.html }))
    }
    setShowAIModal(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const capture_fields = form.capture_fields_text
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)

    const { error } = await supabase.from('landing_pages').insert({
      name: form.name,
      page_type: form.page_type,
      brand_name: form.brand_name || null,
      capture_credentials: form.capture_credentials,
      capture_fields,
      redirect_url: form.redirect_url,
      html_content: form.html_content,
    })

    if (error) {
      alert('Error al crear la landing page: ' + error.message)
      setSaving(false)
      return
    }

    router.push('/landing-pages')
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/landing-pages" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver a landing pages
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Nueva landing page" description="Creá una página de captura para campañas de phishing simulado" />
        <button
          type="button"
          onClick={() => setShowAIModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Generar con IA
        </button>
      </div>

      {showAIModal && (
        <AIGenerateModal
          mode="landing"
          onResult={handleAIResult}
          onClose={() => setShowAIModal(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 mt-0">
        {/* Info básica */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Información básica</h3>
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              className="input"
              required
              placeholder="Ej: Microsoft 365 Login"
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

        {/* Captura */}
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
              placeholder="email,password"
              value={form.capture_fields_text}
              onChange={(e) => setForm({ ...form, capture_fields_text: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Nombres de los campos del formulario HTML que se capturarán</p>
          </div>
          <div>
            <label className="label">URL de redirección post-captura</label>
            <input
              type="text"
              className="input"
              placeholder="/awareness"
              value={form.redirect_url}
              onChange={(e) => setForm({ ...form, redirect_url: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">A dónde redirigir al usuario después de enviar el formulario</p>
          </div>
        </div>

        {/* HTML */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Contenido HTML</h3>
          <div>
            <label className="label">HTML de la landing page</label>
            <textarea
              className="input font-mono text-xs min-h-[400px]"
              value={form.html_content}
              onChange={(e) => setForm({ ...form, html_content: e.target.value })}
            />
          </div>
          {/* Preview */}
          <div>
            <p className="label">Vista previa</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={form.html_content}
                sandbox="allow-same-origin"
                className="w-full h-[400px]"
                title="Vista previa de landing page"
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear landing page'}
          </button>
        </div>
      </form>
    </div>
  )
}
