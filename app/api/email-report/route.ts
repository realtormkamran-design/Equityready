import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { sendReportEmail, sendRealtorAlert } from '../../../lib/email'
import { calcNetInHand, calcMarketRange } from '../../../lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { leadId, email } = await req.json()

    if (!leadId || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const mktRange  = calcMarketRange()
    const netInHand = calcNetInHand(lead.bca_assessed || 1439000)

    await sendReportEmail({
      toEmail:   email,
      toName:    lead.name || 'Homeowner',
      address:   lead.address,
      assessed:  lead.bca_assessed   || 1439000,
      mktLow:    mktRange.low,
      mktHigh:   mktRange.high,
      equity:    lead.equity_gain    || 1096206,
      multiple:  lead.equity_multiple || 4.2,
      netInHand,
      narrative: lead.narrative || 'Your personalized analysis is being prepared.',
    })

    // Update lead
    await supabaseAdmin
      .from('leads')
      .update({ email, stage: 'report_requested', updated_at: new Date().toISOString() })
      .eq('id', leadId)

    // Alert Kamran
    await sendRealtorAlert({
      stage:   'PDF REQUESTED',
      address: lead.address,
      name:    lead.name,
      phone:   lead.phone,
      email,
      assessed: lead.bca_assessed,
      equity:   lead.equity_gain,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email report error:', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
