'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import { Mail, Plus, Trash2 } from 'lucide-react'
import { EmailTemplate } from '@/types/database'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

const categoryLabels: Record<string, string> = {
  general: 'General',
  credential: 'Credenciales',
  malware: 'Malware',
  social: 'Ing. Social',
  urgent: 'Urgente',
}

const difficultyLabels: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTemplates(data)
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el template "${name}"? Esta acción no se puede deshacer.`)) return
    await supabase.from('email_templates').delete().eq('id', id)
    setTemplates(templates.filter((t) => t.id !== id))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div>
      <PageHeader
        title="Templates de email"
        description="Plantillas de correo para campañas de phishing simulado"
        actions={
          <Link href="/templates/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Nuevo template
          </Link>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Sin templates"
          description="Creá tu primer template de email de phishing para usarlo en campañas."
          action={{ label: 'Crear template', href: '/templates/new' }}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Asunto</th>
                <th className="px-6 py-3">Remitente</th>
                <th className="px-6 py-3">Categoría</th>
                <th className="px-6 py-3">Dificultad</th>
                <th className="px-6 py-3">Creado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/templates/${t.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{t.subject}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {t.sender_name} &lt;{t.sender_email}&gt;
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge bg-gray-100 text-gray-700">
                      {categoryLabels[t.category] || t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${difficultyColors[t.difficulty] || 'bg-gray-100 text-gray-700'}`}>
                      {difficultyLabels[t.difficulty] || t.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(t.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/templates/${t.id}`} className="btn-ghost btn-sm">
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
