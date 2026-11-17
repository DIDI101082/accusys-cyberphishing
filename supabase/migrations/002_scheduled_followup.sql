-- Migration 002: Scheduled campaigns + followup config
-- Run this in Supabase SQL Editor after schema.sql

-- Add followup fields to campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS followup_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_days INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS followup_max_times INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS followup_sent_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followup_last_sent_at TIMESTAMPTZ;

-- Add followup tracking to campaign_targets
ALTER TABLE campaign_targets
  ADD COLUMN IF NOT EXISTS followup_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followup_last_sent_at TIMESTAMPTZ;

-- Index for cron job: find scheduled campaigns ready to launch
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled
  ON campaigns (status, scheduled_at)
  WHERE status = 'scheduled';

-- Index for cron job: find targets eligible for followup
CREATE INDEX IF NOT EXISTS idx_campaign_targets_followup
  ON campaign_targets (campaign_id, sent_at, opened_at, followup_count)
  WHERE sent_at IS NOT NULL AND opened_at IS NULL;
