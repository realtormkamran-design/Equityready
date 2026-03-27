import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const MARKET = {
  avgPsf: 468, lowPsf: 451, highPsf: 481,
  avgDOM: 28, fastestDOM: 19, avgAboveBCA: 111500,
}

function extractStreetNumber(address: string): string | null {
  const match = address.match(/^\s*(\d+)/)
  return match ? match[1] : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, name, phone } = body

    const supabase = createClient(supabaseUrl, supabaseKey)

    // ── Find BCA record ──────────────────────────────────────────────────────
    let bcaRecord: any = null
    const streetNumber = extractStreetNumber(address || '')

    if (streetNumber) {
      // Try street number match — get a few candidates
      const { data } = await supabase
        .from('bca_data')
        .select('*')
        .ilike('civic_address', `${streetNumber} %`)
        .limit(5)

      if (data && data.length > 0) {
        if (data.length === 1) {
          bcaRecord = data[0]
        } else {
          // Pick best match by comparing street name fragment from input
          const inputLower = address.toLowerCase()
          // Try to match street name digits like "69a" or "201b"
          const streetRef = inputLower.match(/\b(\d+[a-z]?)\s+(ave|av|st|rd|dr|blvd|cres|pl|way|ct)/i)
          if (streetRef) {
            const ref = streetRef[1].toLowerCase()
            const found = data.find((r: any) =>
              r.civic_address.toLowerCase().includes(ref)
            )
            bcaRecord = found || data[0]
          } else {
            bcaRecord = data[0]
          }
        }
      }
    }

    // ── Update lead ──────────────────────────────────────────────────────────
    await supabase
      .from('leads')
      .update({
        stage: 'report_requested',
        bca_assessed: bcaRecord?.assessed_total || null,
      })
      .eq('address', address)

    // ── Build instant narrative from real data ───────────────────────────────
    const purchaseYear = bcaRecord?.purchase_date
      ? new Date(bcaRecord.purchase_date).getFullYear()
      : null
    const yearsOwned = purchaseYear
      ? new Date().getFullYear() - purchaseYear
      : null
    const purchasePrice = bcaRecord?.purchase_price
    const assessedTotal = bcaRecord?.assessed_total
    const equityGain = bcaRecord?.equity_gain
    const equityMultiple = bcaRecord?.equity_multiple
    const bedrooms = bcaRecord?.bedrooms || '3–4'
    const floorArea = bcaRecord?.floor_area

    const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

    // Estimate range based on actual assessed value
    const estimateLow  = assessedTotal ? Math.round(assessedTotal * 0.97 / 1000) * 1000 : 1353000
    const estimateHigh = assessedTotal ? Math.round(assessedTotal * 1.07 / 1000) * 1000 : 1522000

    // Build a solid instant narrative — uses real numbers, no AI wait
    let instantNarrative = ''
    if (bcaRecord && purchaseYear && purchasePrice && assessedTotal) {
      instantNarrative = `Your ${bedrooms}-bedroom home in Willoughby${floorArea && floorArea !== '-' ? ` (approx. ${Number(floorArea).toLocaleString()} sq ft)` : ''} was built in ${purchaseYear} as part of one of Langley's most established residential neighbourhoods. You purchased in ${purchaseYear} for ${fmt(purchasePrice)} — and in ${yearsOwned} years, the market has done the work for you.

Three comparable detached homes sold in Willoughby between September and October 2025 at an average of $${MARKET.avgPsf} per square foot, with two of three selling above their BC Assessment by an average of $${MARKET.avgAboveBCA.toLocaleString()}. Your 2026 BCA assessment of ${fmt(assessedTotal)} already reflects strong appreciation — but the actual market is paying above assessed for well-maintained homes like yours. Your realistic selling range today is ${fmt(estimateLow)} to ${fmt(estimateHigh)}.

The market is active right now. Average days on market is just ${MARKET.avgDOM} days, with the fastest recent sale closing in ${MARKET.fastestDOM} days. You have built ${equityGain ? fmt(equityGain) : 'over $1M'} in equity${equityMultiple ? ` — ${equityMultiple}x your original investment` : ''} — and every dollar of that gain is completely tax-free as your principal residence. The question is not whether the time is right. It is whether now is right for you.`
    } else {
      // Generic fallback for addresses not in database
      instantNarrative = `Your home in Willoughby sits in one of Langley's most sought-after residential neighbourhoods. Three comparable detached homes sold between September and October 2025 at an average of $${MARKET.avgPsf} per square foot, with two of three selling above their BC Assessment by an average of $${MARKET.avgAboveBCA.toLocaleString()}.

At the current market rate of $${MARKET.lowPsf}–$${MARKET.highPsf} per square foot, the actual selling price for a well-maintained Willoughby home is often higher than what your BCA notice shows. The assessment is not your ceiling — for most homes on your street, it has been the floor.

The market is active right now with an average of just ${MARKET.avgDOM} days on market for comparable homes. If you have been thinking about timing, the current supply of comparable detached homes in Willoughby is very limited — which consistently produces stronger offers for sellers who move first.`
    }

    // ── Try Claude for enhanced narrative (8 second timeout) ────────────────
    let finalNarrative = instantNarrative
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 280,
          system: `You are a Willoughby, Langley BC real estate expert. Write a personalized 3-paragraph equity report for a homeowner. 
Warm but data-driven tone. Sound like a knowledgeable local expert — never mention AI or templates.
Second person ("your home"). Under 260 words total.`,
          messages: [{
            role: 'user',
            content: `Write a 3-paragraph equity report:
Address: ${address}
Bedrooms: ${bedrooms}${floorArea && floorArea !== '-' ? `\nFloor area: ${floorArea} sqft` : ''}
${purchaseYear ? `Purchase year: ${purchaseYear}` : ''}
${purchasePrice ? `Purchase price: ${fmt(purchasePrice)}` : ''}
${assessedTotal ? `2026 BCA assessed: ${fmt(assessedTotal)}` : ''}
${equityGain ? `Equity gained: ${fmt(equityGain)} (${equityMultiple}x, tax-free)` : ''}
Market: $${MARKET.avgPsf}/sqft avg, $${MARKET.lowPsf}–$${MARKET.highPsf} range, ${MARKET.avgDOM} days avg DOM, 2 of 3 recent sales above BCA by avg $${MARKET.avgAboveBCA.toLocaleString()}`
          }]
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      if (aiRes.ok) {
        const aiData = await aiRes.json()
        const aiText = aiData.content?.[0]?.text
        if (aiText && aiText.length > 100) finalNarrative = aiText
      }
    } catch {
      // timeout — use instant narrative
    }

    return NextResponse.json({
      success: true,
      narrative: finalNarrative,
      bcaData: bcaRecord ? {
        address: bcaRecord.civic_address,
        purchasePrice: bcaRecord.purchase_price,
        purchaseDate: bcaRecord.purchase_date,
        assessedTotal: bcaRecord.assessed_total,
        equityGain: bcaRecord.equity_gain,
        equityMultiple: bcaRecord.equity_multiple,
        bedrooms: bcaRecord.bedrooms,
        yearsOwned: bcaRecord.years_owned,
        floorArea: bcaRecord.floor_area,
        estimateLow,
        estimateHigh,
      } : null,
    })
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
