import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Este endpoint es llamado por Vercel Cron cada 5 minutos
// Busca campañas con status='scheduled' cuyo scheduled_at ya pasó y las lanza

export async function GET(request: NextRequest) {
  // Verificar que la llamada viene del cron de Vercel o del sistema
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Buscar campañas programadas listas para lanzar
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(10)

  if (error) {
    console.error('Error buscando campañas programadas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ message: 'No hay campañas para lanzar', launched: 0 })
  }

  const results = []
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  for (const campaign of campaigns) {
    try {
      // Llamar al endpoint de envío existente
      const response = await fetch(`${appUrl}/api/send-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ campaign_id: campaign.id }),
      })

      const result = await response.json()
      results.push({ id: campaign.id, name: campaign.name, success: response.ok, result })
    } catch (err) {
      results.push({ id: campaign.id, name: campaign.name, success: false, error: String(err) })
    }
  }

  return NextResponse.json({
    message: `Procesadas ${results.length} campañas`,
    launched: results.filter((r) => r.success).length,
    results,
  })
}
