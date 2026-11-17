'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import { Globe, Plus, Trash2, ExternalLink } from 'lucide-react'
import { LandingPage } from '@/types/database'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('landing_pages')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setPages(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta landing page?')) return
    await supabase.from('landing_pages').delete().eq('id', id)
    setPages(pages.filter((p) => p.id !== id))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div>
      <PageHeader
        title="Landing Pages"
        description="Páginas de captura para campañas de phishing simulado"
        actions={
          <Link href="/landing-pages/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Nueva landing page
          </Link>
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Sin landing pages"
          description="Creá tu primera landing page para capturar credenciales en campañas de phishing simulado."
          action={{ label: 'Crear landing page', href: '/landing-pages/new' }}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Marca</th>
                <th className="px-6 py-3">Captura creds.</th>
                <th className="px-6 py-3">Creada</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/landing-pages/${p.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge bg-gray-100 text-gray-700">{p.page_type}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.brand_name || '—'}</td>
                  <td className="px-6 py-4">
                    {p.capture_credentials ? (
                      <span className="badge bg-red-100 text-red-700">Sí</span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link href={`/landing-pages/${p.id}`} className="btn-ghost btn-sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="btn-ghost btn-sm text-red-500 hover:text-red-700">
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
