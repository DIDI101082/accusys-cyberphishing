# Accusys CyberPhishing

Plataforma de campañas de phishing simulado para concientización en seguridad. Desarrollada para **Accusys Technology**.

## Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Base de datos**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Email**: Nodemailer (SMTP configurable)
- **Estilos**: Tailwind CSS

---

## Funcionalidades

- 📧 **Templates de email**: editor HTML con variables dinámicas (`{{first_name}}`, `{{phishing_url}}`, etc.)
- 🌐 **Landing pages**: páginas de phishing clonadas con captura de credenciales
- 👥 **Grupos de targets**: importación individual o masiva por CSV
- 🚀 **Campañas**: lanzamiento con envío por lotes y configuración SMTP por campaña
- 📊 **Tracking automático**: pixel de apertura, redirect de clics, captura de formularios, reportes
- 📈 **Dashboard y reportes**: embudo de conversión con tasas de apertura, clic, captura y reporte
- 🛡️ **Página de awareness**: mostrada al target después del phishing

---

## Setup en Supabase

### 1. Crear proyecto en Supabase

Ir a [supabase.com](https://supabase.com) y crear un nuevo proyecto.

### 2. Ejecutar el schema

En el SQL Editor de Supabase, ejecutar el archivo completo:

```
supabase/schema.sql
```

Esto crea todas las tablas, índices, políticas RLS, funciones y datos de ejemplo.

### 3. Crear usuario administrador

En **Authentication → Users → Add user**:
- Email: `admin@accusys.com.ar` (o el que prefieras)
- Password: una contraseña segura

---

## Variables de entorno

Copiar `.env.local.example` a `.env.local` y completar:

```env
# Supabase (encontrás estos valores en Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# URL pública de la app (para los links de tracking en los emails)
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app

# SMTP por defecto (se puede sobreescribir por campaña)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM_EMAIL=security@accusys.com.ar
SMTP_FROM_NAME=Accusys IT
```

> **Nota SMTP con Gmail**: activar "Contraseñas de aplicación" en la cuenta de Google (requiere 2FA activado). Ir a Cuenta de Google → Seguridad → Contraseñas de aplicaciones.

---

## Deploy en Vercel

### Opción A: desde GitHub

1. Subir el proyecto a un repositorio GitHub
2. En [vercel.com](https://vercel.com) → **New Project** → importar el repo
3. Agregar todas las variables de entorno en **Settings → Environment Variables**
4. Deploy 🚀

### Opción B: CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
# Completar las variables en .env.local

npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Variables en templates de email

Los templates soportan las siguientes variables que se reemplazan al enviar:

| Variable | Descripción |
|---|---|
| `{{first_name}}` | Nombre del target |
| `{{last_name}}` | Apellido del target |
| `{{email}}` | Email del target |
| `{{position}}` | Cargo del target |
| `{{department}}` | Área del target |
| `{{phishing_url}}` | URL del link de phishing (con tracking) |
| `{{report_url}}` | URL para reportar el email como phishing |
| `{{sender_name}}` | Nombre del remitente del template |
| `{{tracking_id}}` | ID corto para seguimiento (8 caracteres) |

---

## Flujo de tracking

```
Email enviado → Target abre el mail
      ↓
Pixel de tracking 1x1 → /api/tracking/[token]/open  → registra "open"
      ↓
Target hace clic en el link
      ↓
/api/tracking/[token]/click → registra "click" → redirect a /phish/[token]
      ↓
Target ve la landing page falsa y envía el formulario
      ↓
/api/tracking/[token]/submit → registra "submit" + credenciales → redirect a /phish/awareness
      ↓
Target ve la página de concientización 🛡️
```

También se incluye un link "Reportar como phishing" en cada email:
```
/api/tracking/[token]/report → registra "report" → muestra página de felicitaciones
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/              # Rutas del panel admin (requieren auth)
│   │   ├── dashboard/
│   │   ├── campaigns/
│   │   ├── templates/
│   │   ├── landing-pages/
│   │   ├── target-groups/
│   │   └── reports/
│   ├── api/
│   │   ├── send-campaign/  # Endpoint de lanzamiento de campaña
│   │   └── tracking/[token]/
│   │       ├── open/       # Pixel de apertura
│   │       ├── click/      # Redirect con tracking
│   │       ├── submit/     # Captura de formulario
│   │       └── report/     # Reporte como phishing
│   ├── phish/
│   │   ├── [token]/        # Landing page dinámica
│   │   └── awareness/      # Página de concientización
│   └── login/
├── components/
├── lib/supabase/
└── types/
supabase/
└── schema.sql              # Schema completo + seed data
```

---

## Consideraciones legales y éticas

> ⚠️ Esta herramienta es **exclusivamente para uso interno** en campañas de concientización autorizadas por la organización.
>
> - Solo usar con consentimiento previo de la dirección de la empresa
> - Informar a RRHH antes de cada campaña
> - Los datos capturados (credenciales simuladas) NO deben almacenarse de forma permanente
> - Proporcionar formación posterior a los empleados afectados

---

Desarrollado por **Accusys Technology — Área de Ciberseguridad**
