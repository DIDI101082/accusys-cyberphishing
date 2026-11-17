import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { campaign_id } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get campaign with template
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*, email_template:email_templates(*)')
      .eq('id', campaign_id)
      .single()

    if (campError || !campaign) {
      return NextResponse.json({ success: false, error: 'Campaña no encontrada' }, { status: 404 })
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'La campaña ya fue lanzada' }, { status: 400 })
    }

    const template = (campaign as any).email_template
    if (!template) {
      return NextResponse.json({ success: false, error: 'No hay template de email asignado' }, { status: 400 })
    }

    // Get pending campaign targets
    const { data: targets, error: targetError } = await supabase
      .from('campaign_targets')
      .select('*, target:targets(*)')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending')

    if (targetError || !targets || targets.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay targets pendientes' }, { status: 400 })
    }

    // Set up SMTP transport
    const smtpHost = campaign.smtp_host || process.env.SMTP_HOST
    const smtpPort = campaign.smtp_port || Number(process.env.SMTP_PORT) || 587
    const smtpUser = campaign.smtp_user || process.env.SMTP_USER
    const smtpPass = campaign.smtp_pass || process.env.SMTP_PASS

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ success: false, error: 'Configuración SMTP incompleta' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let sentCount = 0

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', campaign_id)

    // Send emails in batches
    for (const ct of targets) {
      const target = (ct as any).target
      if (!target) continue

      try {
        // Build tracking URLs
        const trackingPixel = `${appUrl}/api/tracking/${ct.tracking_token}/open`
        const phishingUrl = `${appUrl}/api/tracking/${ct.tracking_token}/click`
        const reportUrl = `${appUrl}/api/tracking/${ct.tracking_token}/report`

        // Replace variables in template
        let htmlBody = template.body_html
          .replace(/\{\{first_name\}\}/g, target.first_name)
          .replace(/\{\{last_name\}\}/g, target.last_name)
          .replace(/\{\{email\}\}/g, target.email)
          .replace(/\{\{position\}\}/g, target.position || '')
          .replace(/\{\{department\}\}/g, target.department || '')
          .replace(/\{\{phishing_url\}\}/g, phishingUrl)
          .replace(/\{\{report_url\}\}/g, reportUrl)
          .replace(/\{\{tracking_id\}\}/g, ct.tracking_token.substring(0, 8).toUpperCase())
          .replace(/\{\{sender_name\}\}/g, template.sender_name)

        // Add tracking pixel at the end
        htmlBody += `<img src="${trackingPixel}" width="1" height="1" style="display:none" alt="" />`

        // Add report phishing link at the bottom
        htmlBody += `<div style="margin-top:20px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center">
          <a href="${reportUrl}" style="color:#999;text-decoration:underline">Reportar como phishing</a>
        </div>`

        let subject = template.subject
          .replace(/\{\{first_name\}\}/g, target.first_name)
          .replace(/\{\{last_name\}\}/g, target.last_name)
          .replace(/\{\{sender_name\}\}/g, template.sender_name)

        const fromEmail = campaign.smtp_from_email || template.sender_email || process.env.SMTP_FROM_EMAIL
        const fromName = campaign.smtp_from_name || template.sender_name || process.env.SMTP_FROM_NAME

        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: target.email,
          subject: subject,
          html: htmlBody,
        })

        // Mark as sent
        await supabase
          .from('campaign_targets')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', ct.id)

        sentCount++
      } catch (emailError) {
        console.error(`Error sending to ${target.email}:`, emailError)
      }
    }

    // Update campaign stats
    await supabase.rpc('update_campaign_stats', { p_campaign_id: campaign_id })

    return NextResponse.json({ success: true, sent: sentCount, total: targets.length })
  } catch (error) {
    console.error('Send campaign error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
