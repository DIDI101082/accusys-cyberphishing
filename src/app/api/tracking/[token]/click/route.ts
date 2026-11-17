import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  let redirectUrl = '/phish/awareness' // Default awareness page

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Process click tracking
    await supabase.rpc('process_tracking_event', {
      p_token: token,
      p_event_type: 'click',
      p_ip: ip,
      p_user_agent: userAgent,
    })

    // Get campaign landing page
    const { data: ct } = await supabase
      .from('campaign_targets')
      .select('campaign_id, campaigns(landing_page_id)')
      .eq('tracking_token', token)
      .single()

    if (ct && (ct as any).campaigns?.landing_page_id) {
      // Redirect to the phishing landing page with the token
      redirectUrl = `/phish/${token}`
    }
  } catch (error) {
    console.error('Tracking click error:', error)
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
