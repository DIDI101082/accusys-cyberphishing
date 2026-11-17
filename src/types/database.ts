export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed'
export type EventType = 'open' | 'click' | 'submit' | 'report'
export type TargetStatus = 'pending' | 'sent' | 'opened' | 'clicked' | 'submitted' | 'reported'
export type TemplateCategory = 'general' | 'credential' | 'malware' | 'social' | 'urgent'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type PageType = 'login' | 'download' | 'form' | 'survey'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string | null
  sender_name: string
  sender_email: string
  category: TemplateCategory
  difficulty: Difficulty
  variables: { key: string; label: string }[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LandingPage {
  id: string
  name: string
  page_type: PageType
  html_content: string
  capture_credentials: boolean
  capture_fields: string[]
  redirect_url: string
  brand_name: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TargetGroup {
  id: string
  name: string
  description: string | null
  department: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  target_count?: number
}

export interface Target {
  id: string
  email: string
  first_name: string
  last_name: string
  position: string | null
  department: string | null
  group_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  group?: TargetGroup
}

export interface Campaign {
  id: string
  name: string
  description: string | null
  status: CampaignStatus
  email_template_id: string | null
  landing_page_id: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  send_by_date: string | null
  batch_size: number
  batch_delay_minutes: number
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_pass: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  total_targets: number
  total_sent: number
  total_opened: number
  total_clicked: number
  total_submitted: number
  total_reported: number
  created_by: string | null
  created_at: string
  updated_at: string
  email_template?: EmailTemplate
  landing_page?: LandingPage
}

export interface CampaignTarget {
  id: string
  campaign_id: string
  target_id: string
  tracking_token: string
  status: TargetStatus
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  submitted_at: string | null
  reported_at: string | null
  open_count: number
  click_count: number
  created_at: string
  target?: Target
}

export interface TrackingEvent {
  id: string
  campaign_target_id: string
  event_type: EventType
  ip_address: string | null
  user_agent: string | null
  referrer: string | null
  submitted_data: Record<string, unknown> | null
  created_at: string
}

export interface SmtpConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  from_email: string
  from_name: string
  use_tls: boolean
  is_default: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
