'use client'

import { useState } from 'react'
import { Sparkles, X, Loader2, AlertCircle } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TemplateResult {
  type: 'template'
  html: string
  subject: string
}

interface LandingResult {
  type: 'landing'
  html: string
}

type GenerateResult = TemplateResult | LandingResult

interface AIGenerateModalProps {
  mode: 'template' | 'landing'
  onResult: (result: GenerateResult) => void
  onClose: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AIGenerateModal({ mode, onResult, onClose }: AIGenerateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Template fields
  const [scenario, setScenario] = useState('')
  const [brand, setBrand] = useState('')
  const [language, setLanguage] = useState('es')
  const [urgency, setUrgency] = useState('high')
  const [category, setCategory] = useState('credential')
  const [difficulty, setDifficulty] = useState('medium')

  // Landing fields
  const [pageType, setPageType] = useState('login')
  const [style, setStyle] = useState('modern')
  const [extra, setExtra] = useState('')

  async function handleGenerate() {
    setError('')
    setLoading(true)

    try {
      if (mode === 'template') {
        if (!scenario.trim()) {
          setError('El escenario es requerido')
          setLoading(false)
          return
        }

        const res = await fetch('/api/ai/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer client' },
          body: JSON.stringify({ scenario, brand, language, urgency, category, difficulty }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al generar')

        onResult({ type: 'template', html: data.html, subject: data.subject })
      } else {
        if (!brand.trim()) {
          setError('La marca es requerida')
          setLoading(false)
          return
        }

        const res = await fetch('/api/ai/generate-landing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer client' },
          body: JSON.stringify({ brand, page_type: pageType, style, language, extra }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al generar')

        onResult({ type: 'landing', html: data.html })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Generar {mode === 'template' ? 'email de phishing' : 'landing page'} con IA
              </h2>
              <p className="text-xs text-gray-500">Powered by Google Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── TEMPLATE FIELDS ── */}
          {mode === 'template' && (
            <>
              <div>
                <label className="label">Escenario / descripción *</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Ej: Email del banco informando que la cuenta fue bloqueada por actividad sospechosa y necesita verificar identidad"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Marca / empresa simulada</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Microsoft 365, Banco Galicia, MercadoPago"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Idioma</label>
                  <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
                <div>
                  <label className="label">Urgencia</label>
                  <select className="input" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="credential">Credenciales</option>
                    <option value="general">General</option>
                    <option value="malware">Malware / Descarga</option>
                    <option value="social">Ingeniería Social</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="label">Dificultad</label>
                  <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option value="easy">Fácil (errores visibles)</option>
                    <option value="medium">Media</option>
                    <option value="hard">Difícil (muy convincente)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── LANDING FIELDS ── */}
          {mode === 'landing' && (
            <>
              <div>
                <label className="label">Marca a imitar *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Microsoft 365, Google, Banco Galicia, MercadoPago"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo de página</label>
                  <select className="input" value={pageType} onChange={(e) => setPageType(e.target.value)}>
                    <option value="login">Login / Inicio de sesión</option>
                    <option value="form">Formulario de datos</option>
                    <option value="download">Descarga de archivo</option>
                    <option value="survey">Encuesta</option>
                  </select>
                </div>
                <div>
                  <label className="label">Estilo visual</label>
                  <select className="input" value={style} onChange={(e) => setStyle(e.target.value)}>
                    <option value="modern">Moderno / Minimalista</option>
                    <option value="corporate">Corporativo clásico</option>
                    <option value="microsoft">Estilo Microsoft</option>
                    <option value="google">Estilo Google</option>
                  </select>
                </div>
                <div>
                  <label className="label">Idioma</label>
                  <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Instrucciones adicionales</label>
                <textarea
                  className="input min-h-[60px] resize-none"
                  placeholder="Ej: Incluir logo de empresa, agregar campo de número de empleado, fondo azul marino"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            El contenido generado es editable antes de guardar
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary btn-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
