'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import { BarChart3, Download, Eye, MousePointer, KeyRound, Flag, Send } from 'lucide-react'
import { Campaign } from '@/types/database'
import { formatDate, statusColor, statusLabel, percentOf } from '@/lib/utils'
import Link from 'next/link'

export default function ReportsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .in('status', ['running', 'completed'])
        .order('created_at', { ascending: false })
      if (data) setCampaigns(data)
      setLoading(false)
    }
    load()
  }, [])

  const totals = campaigns.reduce(
    (acc, c) => ({
      targets: acc.targets + c.total_targets,
      sent: acc.sent + c.total_sent,
      opened: acc.opened + c.total_opened,
      clicked: acc.clicked + c.total_clicked,
      submitted: acc.submitted + c.total_submitted,
      reported: acc.reported + c.total_reported,
    }),
    { targets: 0, sent: 0, opened: 0, clicked: 0, submitted: 0, reported: 0 }
  )

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div>
      <PageHeader title="Reportes" description="Análisis y métricas de campañas de phishing simulado" />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos para reportar"
          description="Los reportes se generan automáticamente a medida que las campañas se lanzan y se recopilan datos."
          action={{ label: 'Ver campañas', href: '/campaigns' }}
        />
      ) : (
        <>
          {/* Global summary */}
          <div className="card p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumen global — todas las campañas</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { label: 'Enviados', value: totals.sent, icon: Send, color: 'text-blue-600 bg-blue-50' },
                { label: 'Abiertos', value: `${percentOf(totals.opened, totals.sent)}%`, icon: Eye, color: 'text-cyan-600 bg-cyan-50' },
                { label: 'Clics', value: `${percentOf(totals.clicked, totals.sent)}%`, icon: MousePointer, color: 'text-orange-600 bg-orange-50' },
                { label: 'Capturados', value: `${percentOf(totals.submitted, totals.sent)}%`, icon: KeyRound, color: 'text-red-600 bg-red-50' },
                { label: 'Reportados', value: `${percentOf(totals.reported, totals.sent)}%`, icon: Flag, color: 'text-green-600 bg-green-50' },
                { label: 'Campañas', value: campaigns.length, icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-campaign breakdown */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Detalle por campaña</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Campaña</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Enviados</th>
                    <th className="px-6 py-3">Apertura</th>
                    <th className="px-6 py-3">Clics</th>
                    <th className="px-6 py-3">Captura</th>
                    <th className="px-6 py-3">Reporte</th>
                    <th className="px-6 py-3">Fecha inicio</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4">
                        <span className={`badge ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.total_sent}/{c.total_targets}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percentOf(c.total_opened, c.total_sent)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{percentOf(c.total_opened, c.total_sent)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${percentOf(c.total_clicked, c.total_sent)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{percentOf(c.total_clicked, c.total_sent)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${percentOf(c.total_submitted, c.total_sent)}%` }} />
                          </div>
                          <span className="text-xs font-medium text-red-600">{percentOf(c.total_submitted, c.total_sent)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-green-600">{percentOf(c.total_reported, c.total_sent)}%</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{formatDate(c.started_at || c.created_at)}</td>
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
          </div>
        </>
      )}
    </div>
  )
}
