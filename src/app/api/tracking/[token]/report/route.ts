import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await supabase.rpc('process_tracking_event', {
      p_token: token,
      p_event_type: 'report',
      p_ip: ip,
      p_user_agent: userAgent,
    })
  } catch (error) {
    console.error('Tracking report error:', error)
  }

  // Show a thank-you page for reporting
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Reporte recibido</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0fdf4;margin:0}
.box{text-align:center;max-width:500px;padding:40px}h1{color:#166534;margin-bottom:10px}p{color:#374151}</style></head>
<body><div class="box">
<div style="font-size:64px">🛡️</div>
<h1>¡Excelente trabajo!</h1>
<p>Reportaste correctamente este email como sospechoso. Este fue un ejercicio de phishing simulado del equipo de Ciberseguridad.</p>
<p style="color:#166534;font-weight:600;margin-top:20px">Tu reporte ayuda a mantener segura a la organización.</p>
<p style="color:#6b7280;font-size:14px;margin-top:30px">— Equipo de Ciberseguridad, Accusys Technology</p>
</div></body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}
