'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import { EmailTemplate, LandingPage, TargetGroup } from '@/types/database'

export default function NewCampaignPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [landingPages, setLandingPages] = useState<LandingPage[]>([])
  const [groups, setGroups] = useState<(TargetGroup & { target_count: number })[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  const [form, setForm] = useState({
    name: '',
    description: '',
    email_template_id: '',
    landing_page_id: '',
    batch_size: 50,
    batch_delay_minutes: 5,
    // Programación
    send_mode: 'now' as 'now' | 'scheduled', // 'now' = lanzar manual, 'scheduled' = automático
    scheduled_at: '',
    // Followup
    followup_enabled: false,
    followup_days: 3,
    followup_max_times: 1,
  })

  useEffect(() => {
    async function load() {
      const [t, l, g] = await Promise.all([
        supabase.from('email_templates').select('*').eq('is_active', true).order('name'),
        supabase.from('landing_pages').select('*').eq('is_active', true).order('name'),
        supabase.from('target_groups').select('*, targets(count)').eq('is_active', true).order('name'),
      ])
      if (t.data) setTemplates(t.data)
      if (l.data) setLandingPages(l.data)
      if (g.data) {
        setGroups(
          g.data.map((gr: any) => ({
            ...gr,
            target_count: gr.targets?.[0]?.count || 0,
          }))
        )
      }
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: form.name,
        description: form.description || null,
        email_template_id: form.email_template_id || null,
        landing_page_id: form.landing_page_id || null,
        batch_size: form.batch_size,
        batch_delay_minutes: form.batch_delay_minutes,
        status: form.send_mode === 'scheduled' && form.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: form.send_mode === 'scheduled' && form.scheduled_at ? form.scheduled_at : null,
        followup_enabled: form.followup_enabled,
        followup_days: form.followup_days,
        followup_max_times: form.followup_max_times,
      })
      .select()
      .single()

    if (error || !campaign) {
      alert('Error al crear la campaña: ' + error?.message)
      setSaving(false)
      return
    }

    // Add targets from selected groups
    if (selectedGroups.length > 0) {
      const { data: targets } = await supabase
        .from('targets')
        .select('id')
        .in('group_id', selectedGroups)
        .eq('is_active', true)

      if (targets && targets.length > 0) {
        const campaignTargets = targets.map((t) => ({
          campaign_id: campaign.id,
          target_id: t.id,
        }))
        await supabase.from('campaign_targets').insert(campaignTargets)

        // Update campaign target count
        await supabase
          .from('campaigns')
          .update({ total_targets: targets.length })
          .eq('id', campaign.id)
      }
    }

    router.push(`/campaigns/${campaign.id}`)
  }

  return (
    <div>
      <PageHeader title="Nueva campaña" description="Configurá los detalles de la campaña de phishing simulado" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Información básica</h3>
          <div>
            <label className="label">Nombre de la campaña *</label>
            <input
              type="text"
              className="input"
              required
              placeholder="Ej: Simulación Q4 2024 - Microsoft 365"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Descripción opcional de la campaña..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        {/* Template & Landing */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Email y Landing Page</h3>
          <div>
            <label className="label">Template de email</label>
            <select
              className="input"
              value={form.email_template_id}
              onChange={(e) => setForm({ ...form, email_template_id: e.target.value })}
            >
              <option value="">Seleccionar template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category} - {t.difficulty})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Landing page</label>
            <select
              className="input"
              value={form.landing_page_id}
              onChange={(e) => setForm({ ...form, landing_page_id: e.target.value })}
            >
              <option value="">Seleccionar landing page...</option>
              {landingPages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.page_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target groups */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Grupos de targets</h3>
          <p className="text-xs text-gray-500">Seleccioná los grupos de usuarios a los que enviar la campaña</p>
          {groups.length === 0 ? (
            <p className="text-sm text-gray-400">
              No hay grupos todavía.{' '}
              <a href="/target-groups/new" className="text-brand-600 hover:underline">
                Crear grupo
              </a>
            </p>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-brand-600"
                    checked={selectedGroups.includes(g.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroups([...selectedGroups, g.id])
                      } else {
                        setSelectedGroups(selectedGroups.filter((id) => id !== g.id))
                      }
                    }}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">{g.name}</span>
                    {g.department && <span className="text-xs text-gray-500 ml-2">({g.department})</span>}
                  </div>
                  <span className="text-xs text-gray-400">{g.target_count} targets</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Send config */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Configuración de envío</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Emails por lote</label>
              <input
                type="number"
                className="input"
                min={1}
                max={500}
                value={form.batch_size}
                onChange={(e) => setForm({ ...form, batch_size: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Minutos entre lotes</label>
              <input
                type="number"
                className="input"
                min={1}
                max={60}
                value={form.batch_delay_minutes}
                onChange={(e) => setForm({ ...form, batch_delay_minutes: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Programación */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Programación</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="send_mode"
                value="now"
                checked={form.send_mode === 'now'}
                onChange={() => setForm({ ...form, send_mode: 'now' })}
              />
              <span className="text-sm text-gray-700">Lanzar manualmente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="send_mode"
                value="scheduled"
                checked={form.send_mode === 'scheduled'}
                onChange={() => setForm({ ...form, send_mode: 'scheduled' })}
              />
              <span className="text-sm text-gray-700">Programar fecha y hora</span>
            </label>
          </div>
          {form.send_mode === 'scheduled' && (
            <div>
              <label className="label">Fecha y hora de inicio</label>
              <input
                type="datetime-local"
                className="input"
                required={form.send_mode === 'scheduled'}
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                El sistema enviará los emails automáticamente en la fecha y hora indicada
              </p>
            </div>
          )}
        </div>

        {/* Followup automático */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Reenvío automático</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={form.followup_enabled}
              onChange={(e) => setForm({ ...form, followup_enabled: e.target.checked })}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Reenviar a quienes no abrieron el email</span>
              <p className="text-xs text-gray-400">El sistema reenvía automáticamente una vez por día a los destinatarios que no abrieron el email</p>
            </div>
          </label>
          {form.followup_enabled && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="label">Reenviar después de (días)</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={30}
                  value={form.followup_days}
                  onChange={(e) => setForm({ ...form, followup_days: Number(e.target.value) })}
                />
                <p className="text-xs text-gray-400 mt-1">Si no abrió el email en este plazo, se reenvía</p>
              </div>
              <div>
                <label className="label">Máximo de reenvíos</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={5}
                  value={form.followup_max_times}
                  onChange={(e) => setForm({ ...form, followup_max_times: Number(e.target.value) })}
                />
                <p className="text-xs text-gray-400 mt-1">Veces máximas que se reenvía a cada persona</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creando...' : 'Crear campaña'}
          </button>
        </div>
      </form>
    </div>
  )
}
