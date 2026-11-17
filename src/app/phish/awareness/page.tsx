import { createClient } from '@supabase/supabase-js'

export default async function AwarenessPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get default awareness content
  const { data: content } = await supabase
    .from('awareness_content')
    .select('*')
    .eq('is_default', true)
    .single()

  const html = content?.body_html || `
    <div style="max-width:600px;margin:40px auto;font-family:system-ui,sans-serif;padding:20px;text-align:center">
      <div style="font-size:64px">🎣</div>
      <h1 style="color:#dc2626">¡Este fue un phishing simulado!</h1>
      <p style="color:#6b7280">Este ejercicio fue realizado por el equipo de Ciberseguridad para evaluar la concientización.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin:20px 0;text-align:left">
        <h3 style="color:#991b1b">Recordá:</h3>
        <ul style="color:#374151">
          <li>Verificá siempre el remitente</li>
          <li>No hagas clic en links sospechosos</li>
          <li>Nunca ingreses credenciales en sitios desconocidos</li>
          <li>Reportá emails sospechosos</li>
        </ul>
      </div>
      <p style="color:#6b7280;font-size:14px">— Equipo de Ciberseguridad, Accusys Technology</p>
    </div>
  `

  return (
    <html lang="es">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Aviso de seguridad</title>
      </head>
      <body style={{ margin: 0, background: '#f9fafb' }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </body>
    </html>
  )
}
