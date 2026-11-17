import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
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
    const body = await request.json()

    // Process submit tracking with captured data
    await supabase.rpc('process_tracking_event', {
      p_token: token,
      p_event_type: 'submit',
      p_ip: ip,
      p_user_agent: userAgent,
      p_submitted_data: body,
    })

    return NextResponse.json({ success: true, redirect: '/phish/awareness' })
  } catch (error) {
    console.error('Tracking submit error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
