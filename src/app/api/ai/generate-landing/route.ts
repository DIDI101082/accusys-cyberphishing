import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 })
  }

  const body = await request.json()
  const { brand, page_type = 'login', style = 'modern', language = 'es', extra = '' } = body

  if (!brand) {
    return NextResponse.json({ error: 'El campo brand es requerido' }, { status: 400 })
  }

  const pageTypeMap: Record<string, string> = {
    login: 'página de inicio de sesión con campos de email y contraseña',
    form: 'formulario de captura de datos personales (nombre, email, teléfono)',
    download: 'página de descarga de un archivo/documento con botón de descarga',
    survey: 'encuesta/formulario de satisfacción con múltiples campos',
  }

  const styleMap: Record<string, string> = {
    modern: 'diseño moderno, minimalista, con gradientes sutiles',
    corporate: 'diseño corporativo clásico, formal, con colores neutros',
    microsoft: 'estilo idéntico a Microsoft/Office 365, fondo blanco con azul corporativo',
    google: 'estilo similar a Google, limpio y simple',
  }

  const prompt = `Sos un experto en ciberseguridad diseñando una landing page de phishing SIMULADA para entrenar empleados.
Creá una página HTML completa y realista con las siguientes características:

- Marca a imitar: ${brand}
- Tipo de página: ${pageTypeMap[page_type] || pageTypeMap.login}
- Estilo visual: ${styleMap[style] || styleMap.modern}
- Idioma: ${language === 'es' ? 'Español (Argentina)' : 'English'}
- Notas adicionales: ${extra || 'ninguna'}

REGLAS IMPORTANTES:
1. Debe ser un documento HTML COMPLETO con <!DOCTYPE html>, <html>, <head>, <body>
2. Todos los estilos CSS deben ir en un bloque <style> en el <head> (NO inline, NO archivos externos)
3. El formulario debe tener id="phish-form" y method="POST"
4. Los campos de email deben tener name="email", los de contraseña name="password"
5. Usá colores, tipografías y elementos visuales que imiten a la marca indicada
6. Incluí elementos de confianza: logo placeholder (texto con estilo), copyright footer, links falsos
7. Hacé la página visualmente convincente y profesional
8. NO incluyas JavaScript (el sistema lo agrega automáticamente)

Respondé ÚNICAMENTE con el HTML completo, sin explicaciones ni markdown. Solo el HTML puro.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `Error de Gemini API: ${err}` }, { status: 500 })
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Limpiar markdown si Gemini lo agrega
    const html = generatedText
      .replace(/^```html\n?/i, '')
      .replace(/^```\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Error generando landing page:', error)
    return NextResponse.json({ error: 'Error interno al generar la landing page' }, { status: 500 })
  }
}
