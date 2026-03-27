import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { generateReportNarrative } from '../../../lib/claude'

export async function POST(req: NextRequest) {
  try {
    const { leadId, renoNotes } = await req.json()

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
    }

    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const purchaseYear = lead.purchase_date
      ? new Date(lead.purchase_date).getFullYear()
      : 2004

    const narrative = await generateReportNarrative({
      address:       lead.address,
      purchaseYear,
      purchasePrice: lead.purchase_price || 342794,
      assessed:      lead.bca_assessed   || 1439000,
      equity:        lead.equity_gain    || 1096206,
      multiple:      lead.equity_multiple || 4.2,
      yearsOwned:    lead.years_owned    || 22,
      bedrooms:      lead.bedrooms       || '4',
      renoNotes,
    })

    // Save narrative to lead
    await supabaseAdmin
      .from('leads')
      .update({ narrative, reno_notes: renoNotes || null, stage: 'report_generated' })
      .eq('id', leadId)

    return NextResponse.json({ narrative })
  } catch (err) {
    console.error('Report error:', err)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
