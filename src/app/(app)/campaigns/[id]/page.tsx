'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { Campaign, CampaignTarget, Target } from '@/types/database'
import { formatDate, statusColor, statusLabel, percentOf } from '@/lib/utils'
import { Send, Eye, MousePointer, KeyRound, Flag, Play, Square, CheckCircle2, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function CampaignDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [targets, setTargets] = useState<(CampaignTarget & { target: Target })[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: camp } = await supabase
        .from('campaigns')
        .select('*, email_template:email_templates(*), landing_page:landing_pages(name)')
        .eq('id', id)
        .single()

      if (camp) setCampaign(camp as any)

      const { data: cts } = await supabase
        .from('campaign_targets')
        .select('*, target:targets(*)')
        .eq('campaign_id', id)
        .order('status', { ascending: false })

      if (cts) setTargets(cts as any)
      setLoading(false)
    }
    load()
  }, [id])

  async function launchCampaign() {
    if (!campaign) return
    if (!confirm('¿Estás seguro de lanzar esta campaña? Se enviarán los emails a todos los targets.')) return

    setLaunching(true)
    try {
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id }),
      })
      const data = await res.json()

      if (data.success) {
        // Reload
        const { data: updated } = await supabase
          .from('campaigns')
          .select('*, email_template:email_templates(*), landing_page:landing_pages(name)')
          .eq('id', id)
          .single()
        if (updated) setCampaign(updated as any)

        const { data: cts } = await supabase
          .from('campaign_targets')
          .select('*, target:targets(*)')
          .eq('campaign_id', id)
          .order('status', { ascending: false })
        if (cts) setTargets(cts as any)

        alert(`Campaña lanzada. ${data.sent} emails enviados.`)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (err) {
      alert('Error al lanzar la campaña')
    }
    setLaunching(false)
  }

  async function completeCampaign() {
    if (!campaign) return
    await supabase.from('campaigns').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', campaign.id)
    setCampaign({ ...campaign, status: 'completed' })
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>
  if (!campaign) return <div className="p-8 text-center text-red-500">Campaña no encontrada</div>

  return (
    <div>
      <div className="mb-4">
        <Link href="/campaigns" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver a campañas
        </Link>
      </div>

      <PageHeader
        title={campaign.name}
        description={campaign.description || undefined}
        actions={
          <div className="flex items-center gap-2">
            {campaign.status === 'draft' && (
              <button className="btn-primary" onClick={launchCampaign} disabled={launching || targets.length === 0}>
                <Play className="h-4 w-4" /> {launching ? 'Lanzando...' : 'Lanzar campaña'}
              </button>
            )}
            {campaign.status === 'running' && (
              <button className="btn-secondary" onClick={completeCampaign}>
                <CheckCircle2 className="h-4 w-4" /> Finalizar
              </button>
            )}
            <span className={`badge ${statusColor(campaign.status)} text-sm px-3 py-1`}>
              {statusLabel(campaign.status)}
            </span>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Enviados" value={`${campaign.total_sent}/${campaign.total_targets}`} icon={Send} color="blue" />
        <StatCard
          label="Abiertos"
          value={`${percentOf(campaign.total_opened, campaign.total_sent)}%`}
          icon={Eye}
          color="cyan"
        />
        <StatCard
          label="Clics"
          value={`${percentOf(campaign.total_clicked, campaign.total_sent)}%`}
          icon={MousePointer}
          color="orange"
        />
        <StatCard
          label="Capturados"
          value={`${percentOf(campaign.total_submitted, campaign.total_sent)}%`}
          icon={KeyRound}
          color="red"
        />
        <StatCard
          label="Reportados"
          value={`${percentOf(campaign.total_reported, campaign.total_sent)}%`}
          icon={Flag}
          color="green"
        />
      </div>

      {/* Campaign info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Template de email</p>
          <p className="text-sm font-medium">{(campaign as any).email_template?.name || 'No asignado'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Landing page</p>
          <p className="text-sm font-medium">{(campaign as any).landing_page?.name || 'No asignada'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Lanzada</p>
          <p className="text-sm font-medium">{formatDate(campaign.started_at)}</p>
        </div>
      </div>

      {/* Targets table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Targets ({targets.length})</h3>
        </div>
        {targets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay targets asignados a esta campaña</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Enviado</th>
                  <th className="px-6 py-3">Abierto</th>
                  <th className="px-6 py-3">Clic</th>
                  <th className="px-6 py-3">Capturado</th>
                  <th className="px-6 py-3">Reportado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {targets.map((ct) => (
                  <tr key={ct.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {ct.target?.first_name} {ct.target?.last_name}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{ct.target?.email}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${statusColor(ct.status)}`}>{statusLabel(ct.status)}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{formatDate(ct.sent_at)}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {ct.opened_at ? `${formatDate(ct.opened_at)} (${ct.open_count}x)` : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {ct.clicked_at ? `${formatDate(ct.clicked_at)} (${ct.click_count}x)` : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {ct.submitted_at ? (
                        <span className="text-red-600 font-medium">{formatDate(ct.submitted_at)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {ct.reported_at ? (
                        <span className="text-green-600 font-medium">{formatDate(ct.reported_at)}</span>
                      ) : '—'}
                    </td>
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
