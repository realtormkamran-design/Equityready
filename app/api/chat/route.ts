import { NextRequest, NextResponse } from 'next/server'
import { chatResponse } from '../../../lib/claude'
import { supabaseAdmin } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { messages, leadId, addressContext } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    const reply = await chatResponse(messages, addressContext)

    // Log chat to lead if we have a leadId
    if (leadId) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMsg) {
        await supabaseAdmin
          .from('chat_logs')
          .insert({
            lead_id:  leadId,
            question: lastUserMsg.content,
            answer:   reply,
          })
      }
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
