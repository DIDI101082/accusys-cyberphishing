import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

// Cron job: reenviar emails a targets que no abrieron después de N días
// Vercel Cron lo llama una vez por día

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  // Buscar campañas con followup habilitado que están running o completed
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      id, name, followup_days, followup_max_times, followup_sent_count,
      smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_email, smtp_from_name,
      email_templates (
        subject, body_html, sender_name, sender_email
      )
    `)
    .eq('followup_enabled', true)
    .in('status', ['running', 'completed'])

  if (campaignError || !campaigns) {
    return NextResponse.json({ error: campaignError?.message || 'Sin campañas' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  let totalSent = 0
  const results = []

  for (const campaign of campaigns) {
    const followupDays = campaign.followup_days || 3
    const maxTimes = campaign.followup_max_times || 1
    const cutoffDate = new Date(now.getTime() - followupDays * 24 * 60 * 60 * 1000).toISOString()

    // Buscar targets que: fueron enviados hace N días, no abrieron, y no superaron el máximo de followups
    const { data: targets, error: targetError } = await supabase
      .from('campaign_targets')
      .select(`
        id, tracking_token, followup_count,
        targets (first_name, last_name, email)
      `)
      .eq('campaign_id', campaign.id)
      .eq('status', 'sent')
      .is('opened_at', null)
      .lte('sent_at', cutoffDate)
      .lt('followup_count', maxTimes)
      .limit(100)

    if (targetError || !targets || targets.length === 0) continue

    // Configurar transporte SMTP
    const smtpConfig = {
      host: campaign.smtp_host || process.env.SMTP_HOST || '',
      port: Number(campaign.smtp_port || process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: campaign.smtp_user || process.env.SMTP_USER || '',
        pass: campaign.smtp_pass || process.env.SMTP_PASS || '',
      },
    }

    const transporter = nodemailer.createTransport(smtpConfig)

    const template = campaign.email_templates as any
    if (!template) continue

    const fromEmail = campaign.smtp_from_email || process.env.SMTP_FROM_EMAIL || template.sender_email
    const fromName = campaign.smtp_from_name || process.env.SMTP_FROM_NAME || template.sender_name

    let campaignSent = 0

    for (const ct of targets) {
      const target = ct.targets as any
      if (!target?.email) continue

      const trackingBase = `${appUrl}/api/tracking/${ct.tracking_token}`
      const pixelUrl = `${trackingBase}/open`
      const phishingUrl = `${trackingBase}/click`
      const reportUrl = `${trackingBase}/report`

      // Reemplazar variables en el template
      let html = template.body_html
        .replace(/\{\{first_name\}\}/g, target.first_name || '')
        .replace(/\{\{last_name\}\}/g, target.last_name || '')
        .replace(/\{\{email\}\}/g, target.email || '')
        .replace(/\{\{phishing_url\}\}/g, phishingUrl)

      // Agregar pixel de tracking + link de reporte
      html += `
        <img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />
        <p style="font-size:11px;color:#999;margin-top:20px;">
          ¿Este email te parece sospechoso?
          <a href="${reportUrl}" style="color:#999;">Reportar como phishing</a>
        </p>`

      const subject = `[Recordatorio] ${template.subject}`

      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: target.email,
          subject,
          html,
        })

        // Actualizar followup_count y timestamp
        await supabase
          .from('campaign_targets')
          .update({
            followup_count: (ct.followup_count || 0) + 1,
            followup_last_sent_at: now.toISOString(),
          })
          .eq('id', ct.id)

        campaignSent++
        totalSent++
      } catch (sendErr) {
        console.error(`Error enviando followup a ${target.email}:`, sendErr)
      }
    }

    // Actualizar stats de la campaña
    if (campaignSent > 0) {
      await supabase
        .from('campaigns')
        .update({
          followup_sent_count: (campaign.followup_sent_count || 0) + campaignSent,
          followup_last_sent_at: now.toISOString(),
        })
        .eq('id', campaign.id)
    }

    results.push({ campaign: campaign.name, sent: campaignSent })
  }

  return NextResponse.json({
    message: `Followups enviados: ${totalSent}`,
    totalSent,
    results,
  })
}
