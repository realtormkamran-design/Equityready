import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { sendRealtorAlert } from '../../../lib/email'

export async function POST(req: NextRequest) {
  try {
    const { leadId, name, phone } = await req.json()

    if (!leadId || !name || !phone) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Update lead
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .update({ name, phone, stage: 'unlocked', updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select('*')
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Notify Kamran instantly
    await sendRealtorAlert({
      stage:    'UNLOCKED',
      address:  lead.address,
      name,
      phone,
      assessed: lead.bca_assessed,
      equity:   lead.equity_gain,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unlock error:', err)
    return NextResponse.json({ error: 'Unlock failed' }, { status: 500 })
  }
}
