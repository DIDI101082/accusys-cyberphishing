'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import { Send, Plus, MoreHorizontal, Play, Pause, CheckCircle2 } from 'lucide-react'
import { Campaign } from '@/types/database'
import { formatDate, statusColor, statusLabel, percentOf } from '@/lib/utils'
import Link from 'next/link'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('campaigns')
        .select('*, email_template:email_templates(name), landing_page:landing_pages(name)')
        .order('created_at', { ascending: false })
      if (data) setCampaigns(data as any)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div>
      <PageHeader
        title="Campañas"
        description="Gestión de campañas de phishing simulado"
        actions={
          <Link href="/campaigns/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Nueva campaña
          </Link>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Sin campañas"
          description="Creá tu primera campaña de phishing simulado para evaluar la concientización de los usuarios."
          action={{ label: 'Crear campaña', href: '/campaigns/new' }}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Campaña</th>
                <th className="px-6 py-3">Template</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Progreso</th>
                <th className="px-6 py-3">Resultados</th>
                <th className="px-6 py-3">Creada</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {c.name}
                    </Link>
                    {c.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{c.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {(c as any).email_template?.name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${percentOf(c.total_sent, c.total_targets)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {c.total_sent}/{c.total_targets}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-xs">
                      <span title="Abiertos" className="text-cyan-600">{percentOf(c.total_opened, c.total_sent)}% abiertos</span>
                      <span title="Clics" className="text-orange-600">{percentOf(c.total_clicked, c.total_sent)}% clics</span>
                      <span title="Capturados" className="text-red-600">{percentOf(c.total_submitted, c.total_sent)}% capt.</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                  <td className="px-6 py-4">
                    <Link href={`/campaigns/${c.id}`} className="btn-ghost btn-sm">
                      Ver
                    </Link>
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
