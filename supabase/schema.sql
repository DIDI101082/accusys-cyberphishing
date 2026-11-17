-- ============================================
-- ACCUSYS CYBERPHISHING - Database Schema
-- Plataforma de campañas de phishing simulado
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. EMAIL TEMPLATES
-- ============================================
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  sender_name TEXT NOT NULL DEFAULT 'IT Department',
  sender_email TEXT NOT NULL DEFAULT 'it@company.com',
  category TEXT DEFAULT 'general', -- general, credential, malware, social, urgent
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
  variables JSONB DEFAULT '[]'::jsonb, -- [{key: "nombre", label: "Nombre del target"}]
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. LANDING PAGES
-- ============================================
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  page_type TEXT DEFAULT 'login', -- login, download, form, survey
  html_content TEXT NOT NULL,
  capture_credentials BOOLEAN DEFAULT true,
  capture_fields JSONB DEFAULT '["email","password"]'::jsonb,
  redirect_url TEXT DEFAULT '/awareness', -- Where to redirect after submission
  brand_name TEXT, -- Fake brand to impersonate (e.g., "Microsoft 365")
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TARGET GROUPS
-- ============================================
CREATE TABLE target_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TARGETS (employees/users to phish)
-- ============================================
CREATE TABLE targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  group_id UUID REFERENCES target_groups(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- ============================================
-- 5. CAMPAIGNS
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, scheduled, running, paused, completed
  email_template_id UUID REFERENCES email_templates(id),
  landing_page_id UUID REFERENCES landing_pages(id),

  -- Schedule
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Send config
  send_by_date TIMESTAMPTZ, -- All emails must be sent by this date
  batch_size INT DEFAULT 50, -- Emails per batch
  batch_delay_minutes INT DEFAULT 5, -- Minutes between batches

  -- SMTP config override (optional, per campaign)
  smtp_host TEXT,
  smtp_port INT,
  smtp_user TEXT,
  smtp_pass TEXT, -- In production, use Supabase Vault
  smtp_from_email TEXT,
  smtp_from_name TEXT,

  -- Stats (denormalized for fast dashboard)
  total_targets INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  total_submitted INT DEFAULT 0,
  total_reported INT DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CAMPAIGN TARGETS (junction)
-- ============================================
CREATE TABLE campaign_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES targets(id) ON DELETE CASCADE,

  -- Per-target tracking token (unique per campaign-target pair)
  tracking_token UUID DEFAULT uuid_generate_v4() UNIQUE,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, sent, opened, clicked, submitted, reported
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,     -- First open
  clicked_at TIMESTAMPTZ,    -- First click
  submitted_at TIMESTAMPTZ,  -- First form submission
  reported_at TIMESTAMPTZ,   -- Reported as phishing

  -- Metadata
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, target_id)
);

-- ============================================
-- 7. TRACKING EVENTS (detailed log)
-- ============================================
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_target_id UUID NOT NULL REFERENCES campaign_targets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- open, click, submit, report

  -- Context
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- For submit events
  submitted_data JSONB, -- Captured form data (credentials, etc.)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. AWARENESS CONTENT (shown after phishing)
-- ============================================
CREATE TABLE awareness_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body_html TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. SMTP CONFIGURATIONS (global)
-- ============================================
CREATE TABLE smtp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INT NOT NULL DEFAULT 587,
  username TEXT NOT NULL,
  password TEXT NOT NULL, -- Use Supabase Vault in production
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  use_tls BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_targets_email ON targets(email);
CREATE INDEX idx_targets_group ON targets(group_id);
CREATE INDEX idx_campaign_targets_campaign ON campaign_targets(campaign_id);
CREATE INDEX idx_campaign_targets_target ON campaign_targets(target_id);
CREATE INDEX idx_campaign_targets_token ON campaign_targets(tracking_token);
CREATE INDEX idx_tracking_events_ct ON tracking_events(campaign_target_id);
CREATE INDEX idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE awareness_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_configs ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can do everything (admin app)
CREATE POLICY "auth_full_access" ON email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON landing_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON target_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON campaign_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON tracking_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON awareness_content FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON smtp_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policy: anon can insert tracking events (for the tracking pixel/redirect)
CREATE POLICY "anon_insert_tracking" ON tracking_events FOR INSERT TO anon WITH CHECK (true);
-- Policy: anon can read campaign_targets (for token lookup)
CREATE POLICY "anon_read_ct" ON campaign_targets FOR SELECT TO anon USING (true);
-- Policy: anon can update campaign_targets (for status updates from tracking)
CREATE POLICY "anon_update_ct" ON campaign_targets FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- Policy: anon can read landing pages (for rendering)
CREATE POLICY "anon_read_landing" ON landing_pages FOR SELECT TO anon USING (true);
-- Policy: anon can read awareness content
CREATE POLICY "anon_read_awareness" ON awareness_content FOR SELECT TO anon USING (true);
-- Policy: anon can read campaigns (for tracking context)
CREATE POLICY "anon_read_campaigns" ON campaigns FOR SELECT TO anon USING (true);
-- Policy: anon can update campaign stats
CREATE POLICY "anon_update_campaigns" ON campaigns FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats(p_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE campaigns SET
    total_targets = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = p_campaign_id),
    total_sent = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = p_campaign_id AND sent_at IS NOT NULL),
    total_opened = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = p_campaign_id AND opened_at IS NOT NULL),
    total_clicked = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = p_campaign_id AND clicked_at IS NOT NULL),
    total_submitted = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = p_campaign_id AND submitted_at IS NOT NULL),
    total_reported = (SELECT COUNT(*) FROM campaign_targets WHERE campaign_id = p_campaign_id AND reported_at IS NOT NULL),
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process tracking event
CREATE OR REPLACE FUNCTION process_tracking_event(
  p_token UUID,
  p_event_type TEXT,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_submitted_data JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_ct campaign_targets%ROWTYPE;
  v_campaign_id UUID;
BEGIN
  -- Find campaign_target by token
  SELECT * INTO v_ct FROM campaign_targets WHERE tracking_token = p_token;

  IF v_ct.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid token');
  END IF;

  v_campaign_id := v_ct.campaign_id;

  -- Insert tracking event
  INSERT INTO tracking_events (campaign_target_id, event_type, ip_address, user_agent, submitted_data)
  VALUES (v_ct.id, p_event_type, p_ip, p_user_agent, p_submitted_data);

  -- Update campaign_target status
  IF p_event_type = 'open' THEN
    UPDATE campaign_targets SET
      opened_at = COALESCE(opened_at, NOW()),
      open_count = open_count + 1,
      status = CASE WHEN status = 'sent' THEN 'opened' ELSE status END
    WHERE id = v_ct.id;

  ELSIF p_event_type = 'click' THEN
    UPDATE campaign_targets SET
      opened_at = COALESCE(opened_at, NOW()),
      clicked_at = COALESCE(clicked_at, NOW()),
      click_count = click_count + 1,
      status = CASE WHEN status IN ('sent', 'opened') THEN 'clicked' ELSE status END
    WHERE id = v_ct.id;

  ELSIF p_event_type = 'submit' THEN
    UPDATE campaign_targets SET
      opened_at = COALESCE(opened_at, NOW()),
      clicked_at = COALESCE(clicked_at, NOW()),
      submitted_at = COALESCE(submitted_at, NOW()),
      status = CASE WHEN status IN ('sent', 'opened', 'clicked') THEN 'submitted' ELSE status END
    WHERE id = v_ct.id;

  ELSIF p_event_type = 'report' THEN
    UPDATE campaign_targets SET
      reported_at = COALESCE(reported_at, NOW()),
      status = 'reported'
    WHERE id = v_ct.id;
  END IF;

  -- Update campaign stats
  PERFORM update_campaign_stats(v_campaign_id);

  RETURN jsonb_build_object('success', true, 'campaign_id', v_campaign_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA: Default awareness content
-- ============================================
INSERT INTO awareness_content (title, body_html, category, is_default) VALUES (
  '¡Cuidado! Este fue un ejercicio de phishing simulado',
  '<div style="max-width:600px;margin:40px auto;font-family:system-ui,-apple-system,sans-serif;padding:20px">
    <div style="text-align:center;margin-bottom:30px">
      <div style="font-size:64px">🎣</div>
      <h1 style="color:#dc2626;margin:10px 0">¡Este fue un phishing simulado!</h1>
      <p style="color:#6b7280;font-size:18px">Este ejercicio fue realizado por el equipo de Ciberseguridad</p>
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:20px">
      <h3 style="color:#991b1b;margin-top:0">¿Qué pasó?</h3>
      <p>Recibiste un email de phishing simulado como parte de nuestro programa de concientización en seguridad. El objetivo es ayudarte a identificar este tipo de ataques.</p>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px">
      <h3 style="color:#166534;margin-top:0">¿Cómo identificar un phishing?</h3>
      <ul style="color:#374151">
        <li>Verificá siempre el remitente del email</li>
        <li>No hagas clic en links sospechosos</li>
        <li>Nunca ingreses tus credenciales en sitios desconocidos</li>
        <li>Si tenés dudas, contactá al equipo de Ciberseguridad</li>
        <li>Reportá emails sospechosos usando el botón de reporte</li>
      </ul>
    </div>
    <div style="text-align:center;color:#6b7280;font-size:14px;margin-top:30px">
      <p>Equipo de Ciberseguridad — Accusys Technology</p>
    </div>
  </div>',
  'general',
  true
);

-- SEED DATA: Sample email templates
INSERT INTO email_templates (name, subject, body_html, sender_name, sender_email, category, difficulty) VALUES
(
  'Cambio de contraseña urgente',
  'Acción requerida: Tu contraseña expira en 24 horas',
  '<div style="font-family:Segoe UI,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#0078d4;padding:20px;text-align:center">
      <span style="color:white;font-size:24px;font-weight:bold">Microsoft 365</span>
    </div>
    <div style="padding:30px;border:1px solid #e5e5e5">
      <p>Hola {{first_name}},</p>
      <p>Tu contraseña de Microsoft 365 expirará en <strong>24 horas</strong>. Para evitar perder acceso a tu cuenta, actualízala ahora.</p>
      <div style="text-align:center;margin:30px 0">
        <a href="{{phishing_url}}" style="background:#0078d4;color:white;padding:12px 30px;text-decoration:none;border-radius:4px;font-size:16px">Actualizar contraseña</a>
      </div>
      <p style="color:#666;font-size:13px">Si no actualizás tu contraseña, tu cuenta será suspendida temporalmente.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <p style="color:#999;font-size:12px">Microsoft Corporation, One Microsoft Way, Redmond, WA 98052</p>
    </div>
  </div>',
  'Microsoft 365',
  'noreply@microsoft-365.com',
  'credential',
  'easy'
),
(
  'Documento compartido',
  '{{sender_name}} compartió un documento contigo',
  '<div style="font-family:Segoe UI,sans-serif;max-width:600px;margin:0 auto">
    <div style="padding:30px;border:1px solid #e5e5e5;border-radius:8px">
      <div style="text-align:center;margin-bottom:20px">
        <span style="font-size:40px">📄</span>
      </div>
      <p>Hola {{first_name}},</p>
      <p><strong>{{sender_name}}</strong> compartió un documento de OneDrive contigo:</p>
      <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin:20px 0">
        <strong>📋 Informe Q4 - Revisión urgente.xlsx</strong>
        <p style="color:#666;font-size:13px;margin:5px 0 0">Requiere tu revisión antes del viernes</p>
      </div>
      <div style="text-align:center;margin:25px 0">
        <a href="{{phishing_url}}" style="background:#0078d4;color:white;padding:10px 25px;text-decoration:none;border-radius:4px">Abrir documento</a>
      </div>
      <p style="color:#999;font-size:12px">Microsoft OneDrive — Compartido de forma segura</p>
    </div>
  </div>',
  'OneDrive',
  'sharing@onedrive-notify.com',
  'credential',
  'medium'
),
(
  'Paquete no entregado',
  'No pudimos entregar tu paquete — Acción requerida',
  '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#ffc107;padding:15px;text-align:center">
      <strong style="font-size:20px;color:#333">📦 Servicio de Envíos</strong>
    </div>
    <div style="padding:25px;border:1px solid #ddd">
      <p>Estimado/a {{first_name}} {{last_name}},</p>
      <p>Intentamos entregar un paquete a tu nombre pero no fue posible. Para reprogramar la entrega, confirmá tus datos:</p>
      <div style="background:#fff3cd;padding:15px;border-radius:5px;margin:20px 0">
        <strong>Número de seguimiento:</strong> AR-{{tracking_id}}<br>
        <strong>Estado:</strong> Detenido en centro de distribución
      </div>
      <div style="text-align:center;margin:25px 0">
        <a href="{{phishing_url}}" style="background:#ffc107;color:#333;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold">Reprogramar entrega</a>
      </div>
      <p style="color:#999;font-size:11px">Si no reclamás tu paquete en 48hs será devuelto al remitente.</p>
    </div>
  </div>',
  'Servicio de Envíos',
  'envios@correo-seguimiento.com',
  'social',
  'easy'
);

-- SEED DATA: Sample landing page (Microsoft login clone)
INSERT INTO landing_pages (name, page_type, html_content, capture_credentials, capture_fields, brand_name) VALUES (
  'Microsoft 365 Login',
  'login',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iniciar sesión en tu cuenta</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", sans-serif; background: #f2f2f2; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .login-box { background: white; padding: 44px; width: 440px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    .logo { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .logo img { height: 24px; }
    h2 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
    .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
    input { width: 100%; padding: 8px 10px; border: none; border-bottom: 2px solid #666; font-size: 15px; outline: none; margin-bottom: 24px; }
    input:focus { border-bottom-color: #0067b8; }
    .btn { background: #0067b8; color: white; border: none; padding: 10px 20px; font-size: 15px; cursor: pointer; float: right; }
    .btn:hover { background: #005a9e; }
    .links { margin-top: 16px; font-size: 13px; }
    .links a { color: #0067b8; text-decoration: none; }
    .footer { clear: both; margin-top: 40px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="login-box">
    <div class="logo">Microsoft</div>
    <h2>Iniciar sesión</h2>
    <p class="subtitle">Continuar a Microsoft 365</p>
    <form id="phish-form" method="POST">
      <input type="email" name="email" placeholder="Correo electrónico" required>
      <input type="password" name="password" placeholder="Contraseña" required>
      <button type="submit" class="btn">Siguiente</button>
    </form>
    <div class="links">
      <a href="#">¿No podés acceder a tu cuenta?</a>
    </div>
    <div class="footer">© Microsoft 2024</div>
  </div>
</body>
</html>',
  true,
  '["email", "password"]',
  'Microsoft 365'
);
