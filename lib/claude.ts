import Anthropic from '@anthropic-ai/sdk'
import { MARKET, COMPS, fmt } from './constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── REPORT NARRATIVE ─────────────────────────────────────────────────────────
export async function generateReportNarrative(data: {
  address:       string
  purchaseYear:  number
  purchasePrice: number
  assessed:      number
  equity:        number
  multiple:      number
  yearsOwned:    number
  bedrooms:      string
  renoNotes?:    string
}): Promise<string> {
  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 350,
    system: `You are a seasoned Willoughby, Langley BC real estate specialist who has personally 
reviewed this property. Write as a knowledgeable human expert — specific, confident, and warm. 
Never mention AI, automation, or technology. Never use the words "generated" or "automated".
Do not give advice or tell them what to do. Give information and let them draw their own conclusions.
Stay within BCFSA guidelines — present facts, not recommendations.
Write exactly 3 short paragraphs with no headers or bullet points.
Use Canadian English spelling.`,
    messages: [{
      role: 'user',
      content: `Write a personalized market analysis for this Willoughby homeowner:

Address: ${data.address}
Year purchased: ${data.purchaseYear}
Purchase price: ${fmt(data.purchasePrice)}
2026 BCA assessed value: ${fmt(data.assessed)}
Equity gained: ${fmt(data.equity)} (${data.multiple}x their money)
Years owned: ${data.yearsOwned}
Bedrooms: ${data.bedrooms}
${data.renoNotes ? `Renovations noted: ${data.renoNotes}` : ''}

Market context:
- Recent Willoughby detached homes selling at $${MARKET.lowPpsf}–$${MARKET.highPpsf}/sqft
- Average days on market: ${MARKET.avgDom} days
- 2 of 3 recent comps sold above BCA by avg $${MARKET.avgAboveBca.toLocaleString()}
- Comp sales: ${COMPS.map(c => `${c.street} sold ${fmt(c.sold)} (${c.date})`).join(', ')}

Write 3 paragraphs: (1) their property context and what makes it strong in this market, 
(2) what the sales data shows and their realistic range, 
(3) what timing looks like — factual, not pushy.`
    }]
  })

  return (msg.content[0] as { type: string; text: string }).text
}

// ── CHATBOT ──────────────────────────────────────────────────────────────────
export async function chatResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  addressContext?: string
): Promise<string> {
  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `You are the EquityReady assistant — a knowledgeable, professional real estate 
market assistant specializing in Willoughby, Langley BC. 

Your role:
- Answer questions about the Willoughby real estate market factually
- Help homeowners understand their equity position
- Explain the selling process clearly
- Never give specific advice telling them what to do — present information only
- Never mention AI, Claude, or any technology
- When asked about fees, commission, or anything requiring a personal consultation, 
  say "Kamran Khan can walk you through the specifics — he's available at +1-236-660-2594 
  or you can book a free 15-minute call through this platform"
- Stay within BCFSA guidelines at all times
- Be warm, concise, and genuinely helpful
- If asked something outside your knowledge, say Kamran will follow up personally

Market facts you know:
- Recent Willoughby detached homes: $451–$481/sqft
- Average days on market: 28 days
- 2 of 3 recent comps sold above BCA assessment
- Average above BCA: $111,500
- Morningstar subdivision (CD-54 zone) is one of Willoughby's most established areas
- Original Morningstar homes built 2003–2007

${addressContext ? `The homeowner is asking about: ${addressContext}` : ''}

Keep responses under 120 words. Be conversational, not corporate.`,
    messages
  })

  return (msg.content[0] as { type: string; text: string }).text
}
