import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { classifyPostal, calcNetInHand, calcMarketRange } from '../../../lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { address, postal, utmSource } = await req.json()

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    const area = classifyPostal(postal || '')

    // Look up BCA data
    const { data: bca } = await supabaseAdmin
      .from('bca_data')
      .select('*')
      .ilike('civic_address', `%${address.split(',')[0].trim()}%`)
      .limit(1)
      .single()

    // Log the lookup regardless of BCA match
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .insert({
        address,
        postal_code:   postal || '',
        stage:         'viewed',
        area_type:     area,
        utm_source:    utmSource || null,
        bca_assessed:  bca?.assessed_total  || null,
        purchase_price: bca?.purchase_price || null,
        purchase_date:  bca?.purchase_date  || null,
        equity_gain:    bca?.equity_gain    || null,
        equity_multiple: bca?.equity_multiple || null,
      })
      .select('id')
      .single()

    const mktRange  = calcMarketRange()
    const netInHand = bca ? calcNetInHand(bca.assessed_total) : null

    return NextResponse.json({
      leadId:       lead?.id,
      area,
      found:        !!bca,
      assessed:     bca?.assessed_total  || null,
      purchasePrice: bca?.purchase_price || null,
      purchaseDate:  bca?.purchase_date  || null,
      equity:        bca?.equity_gain    || null,
      multiple:      bca?.equity_multiple || null,
      mktLow:        mktRange.low,
      mktHigh:       mktRange.high,
      netInHand,
      bedrooms:      bca?.bedrooms       || null,
      yearsOwned:    bca?.years_owned    || null,
    })
  } catch (err) {
    console.error('Lookup error:', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
