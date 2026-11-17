'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { Send, Eye, MousePointer, KeyRound, Flag, Users } from 'lucide-react'
import { Campaign } from '@/types/database'
import { formatDate, statusColor, statusLabel, percentOf } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState({ sent: 0, opened: 0, clicked: 0, submitted: 0, reported: 0, targets: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: camps } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (camps) {
        setCampaigns(camps)
        const totals = camps.reduce(
          (acc, c) => ({
            sent: acc.sent + c.total_sent,
            opened: acc.opened + c.total_opened,
            clicked: acc.clicked + c.total_clicked,
            submitted: acc.submitted + c.total_submitted,
            reported: acc.reported + c.total_reported,
            targets: acc.targets + c.total_targets,
          }),
          { sent: 0, opened: 0, clicked: 0, submitted: 0, reported: 0, targets: 0 }
        )
        setStats(totals)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen de campañas de phishing simulado"
        actions={
          <Link href="/campaigns/new" className="btn-primary">
            <Send className="h-4 w-4" /> Nueva campaña
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Enviados" value={stats.sent} icon={Send} color="blue" />
        <StatCard label="Abiertos" value={stats.opened} icon={Eye} color="cyan" />
        <StatCard label="Clics" value={stats.clicked} icon={MousePointer} color="orange" />
        <StatCard label="Capturados" value={stats.submitted} icon={KeyRound} color="red" />
        <StatCard label="Reportados" value={stats.reported} icon={Flag} color="green" />
        <StatCard label="Targets" value={stats.targets} icon={Users} color="purple" />
      </div>

      {/* Funnel visual */}
      {stats.sent > 0 && (
        <div className="card p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Embudo de conversión global</h3>
          <div className="flex items-end gap-2 h-32">
            {[
              { label: 'Enviados', value: stats.sent, color: 'bg-blue-500' },
              { label: 'Abiertos', value: stats.opened, color: 'bg-cyan-500' },
              { label: 'Clics', value: stats.clicked, color: 'bg-orange-500' },
              { label: 'Capturados', value: stats.submitted, color: 'bg-red-500' },
              { label: 'Reportados', value: stats.reported, color: 'bg-green-500' },
            ].map((item) => {
              const pct = percentOf(item.value, stats.sent)
              return (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-700">{pct}%</span>
                  <div
                    className={`w-full rounded-t-lg ${item.color} transition-all`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className="text-[10px] text-gray-500 text-center">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent campaigns */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Campañas recientes</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay campañas todavía</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Campaña</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Enviados</th>
                  <th className="px-6 py-3">Abiertos</th>
                  <th className="px-6 py-3">Clics</th>
                  <th className="px-6 py-3">Capturados</th>
                  <th className="px-6 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/campaigns/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`badge ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{c.total_sent}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {c.total_opened} <span className="text-gray-400">({percentOf(c.total_opened, c.total_sent)}%)</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {c.total_clicked} <span className="text-gray-400">({percentOf(c.total_clicked, c.total_sent)}%)</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {c.total_submitted} <span className="text-gray-400">({percentOf(c.total_submitted, c.total_sent)}%)</span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
