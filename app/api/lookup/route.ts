import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json()

    // Get lead data
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Get BCA match for bedrooms/details
    const { data: bca } = await supabaseAdmin
      .from('bca_data')
      .select('*')
      .ilike('civic_address', `%${lead.address.split(' ').slice(0,2).join(' ')}%`)
      .limit(1)
      .single()

    const bedrooms = bca?.bedrooms || 'several'
    const stories = bca?.stories || '2'
    const landUse = bca?.actual_land_use || 'single family home'
    const isSuite = landUse.toUpperCase().includes('SUITE')
    const isMorningstar = bca?.plan_number === 'BCP1655'

    const prompt = `You are a real estate market specialist for Willoughby, Langley BC. Write a personalized equity report narrative for a homeowner. Sound like a knowledgeable local expert who personally reviewed this property — warm, specific, and data-driven. Never mention AI or that this was generated.

Property details:
- Address: ${lead.address}
- Bedrooms: ${bedrooms}
- Stories: ${stories}
- ${isSuite ? 'Has a secondary suite' : 'Single family home'}
- ${isMorningstar ? 'Original Morningstar subdivision (BCP1655) — built 2004' : 'Willoughby area home'}
- Purchased: ${lead.purchase_date || 'approximately 2004'} for $${lead.purchase_price?.toLocaleString() || '350,000'}
- Years owned: ${lead.years_owned || 22} years
- 2026 BCA assessed: $${lead.bca_assessed?.toLocaleString() || '1,439,000'}
- Equity gained: $${lead.equity_gain?.toLocaleString() || '1,096,000'}+ (${lead.equity_multiple || '4.2'}x their money)

Market context:
- 3 comparable sales Sept-Oct 2025 averaged $468/sqft
- Price range: $451-$481/sqft
- Average days on market: 28 days (fastest: 19 days)
- 2 of 3 homes sold above BCA by average $111,500
- Sales ranged $1,355,000 to $1,650,000

Write 3 paragraphs (total ~180 words):
1. Their specific property context and what makes it valuable
2. What the market data means for their home specifically  
3. What their timing options look like and what this equity means for them

Do NOT mention AI, do NOT use salesy language, do NOT say "I" (write in third person market analysis style). Be specific to their ${bedrooms}-bedroom home.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })

    const narrative = message.content[0].type === 'text' ? message.content[0].text : ''

    // Save narrative to lead
    await supabaseAdmin
      .from('leads')
      .update({ narrative, stage: 'report_viewed' })
      .eq('id', leadId)

    return NextResponse.json({ narrative })
  } catch (err) {
    console.error('Report error:', err)
    return NextResponse.json({ narrative: '' }, { status: 200 })
  }
}
