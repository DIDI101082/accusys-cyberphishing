import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 })
  }

  const body = await request.json()
  const { scenario, brand, language = 'es', urgency = 'high', category = 'credential', difficulty = 'medium' } = body

  if (!scenario) {
    return NextResponse.json({ error: 'El campo scenario es requerido' }, { status: 400 })
  }

  const urgencyMap: Record<string, string> = {
    low: 'tono informativo y sin urgencia',
    medium: 'tono moderadamente urgente',
    high: 'tono muy urgente, con llamado a la acción inmediata',
  }

  const difficultyMap: Record<string, string> = {
    easy: 'errores gramaticales leves, fácilmente identificable como phishing',
    medium: 'lenguaje profesional con algunos indicios sutiles de phishing',
    hard: 'extremadamente convincente, prácticamente indistinguible de un email legítimo',
  }

  const prompt = `Sos un experto en ciberseguridad diseñando un email de phishing SIMULADO para entrenar empleados.
Creá un email HTML realista con las siguientes características:

- Escenario: ${scenario}
- Marca/empresa simulada: ${brand || 'una empresa genérica'}
- Idioma: ${language === 'es' ? 'Español (Argentina)' : 'English'}
- Urgencia: ${urgencyMap[urgency] || urgencyMap.high}
- Dificultad: ${difficultyMap[difficulty] || difficultyMap.medium}
- Categoría: ${category}

REGLAS IMPORTANTES:
1. Usá estas variables en el HTML: {{first_name}}, {{last_name}}, {{email}}, {{phishing_url}}
2. El link de phishing SIEMPRE debe usar {{phishing_url}} como href
3. El HTML debe ser un bloque <div> completo con estilos inline, NO un documento HTML completo (sin <!DOCTYPE>, <html>, <head>, <body>)
4. Incluí elementos visuales realistas: logo placeholder, colores de marca, footer con disclaimers falsos
5. El estilo debe verse como un email corporativo real

Respondé ÚNICAMENTE con el bloque HTML, sin explicaciones ni markdown. Solo el HTML puro.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
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

    // Generar subject sugerido
    const subjectPrompt = `Basándote en este email de phishing simulado, generá SOLO el asunto del email (subject) en ${language === 'es' ? 'español' : 'inglés'}.
Debe ser convincente y urgente. Respondé ÚNICAMENTE con el texto del asunto, sin comillas ni explicaciones.

Email: ${html.substring(0, 500)}...`

    const subjectResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: subjectPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 100 },
        }),
      }
    )

    let suggestedSubject = ''
    if (subjectResponse.ok) {
      const subjectData = await subjectResponse.json()
      suggestedSubject = subjectData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    }

    return NextResponse.json({ html, subject: suggestedSubject })
  } catch (error) {
    console.error('Error generando template:', error)
    return NextResponse.json({ error: 'Error interno al generar el template' }, { status: 500 })
  }
}
