import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json()

    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!lead) return NextResponse.json({ narrative: '' })

    const { data: bca } = await supabaseAdmin
      .from('bca_data')
      .select('*')
      .ilike('civic_address', `%${lead.address.split(' ').slice(0,2).join(' ')}%`)
      .limit(1)
      .single()

    const bedrooms = bca?.bedrooms || '3'
    const isSuite = (bca?.actual_land_use || '').toUpperCase().includes('SUITE')
    const isMorningstar = bca?.plan_number === 'BCP1655'

    const prompt = `You are a Willoughby, Langley BC real estate specialist. Write a 3-paragraph market analysis (150 words max) for a homeowner. Be specific, warm, data-driven. No AI mentions. No "I".

Property: ${lead.address}, ${bedrooms}-bedroom${isSuite ? ' with suite' : ''}, ${isMorningstar ? 'Morningstar subdivision, ' : ''}built 2004
Purchased: ${lead.purchase_date} for $${lead.purchase_price?.toLocaleString()}
BCA assessed 2026: $${lead.bca_assessed?.toLocaleString()}
Equity: $${lead.equity_gain?.toLocaleString()}+ (${lead.equity_multiple}x)
Market: $468/sqft avg, 28 days DOM, 2 of 3 homes sold above BCA by avg $111,500

Write 3 short paragraphs: 1) property context 2) what market data means for this home 3) timing and options.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(15000)
    })

    const data = await response.json()
    const narrative = data.content?.[0]?.text || ''

    await supabaseAdmin
      .from('leads')
      .update({ narrative })
      .eq('id', leadId)

    return NextResponse.json({ narrative })
  } catch (err) {
    console.error('Report error:', err)
    return NextResponse.json({ narrative: '' })
  }
}
