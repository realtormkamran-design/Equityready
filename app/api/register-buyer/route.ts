import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentName, brokerage, email, phone, budgetMin, budgetMax, bedrooms, timeline, notes } = body

    if (!agentName || !email || !phone) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    await supabaseAdmin.from('buyer_registry').insert({
      agent_name: agentName,
      brokerage,
      email,
      phone,
      budget_min:  budgetMin,
      budget_max:  budgetMax,
      bedrooms_min: parseInt(bedrooms) || 3,
      timeline,
      notes,
    })

    // Confirm to agent
    await resend.emails.send({
      from:    'EquityReady <kamran@equityready.ca>',
      to:      email,
      subject: 'Buyer registered — EquityReady Willoughby',
      html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:480px">
        <h2 style="color:#0A1628">Buyer registered</h2>
        <p style="color:#64748B">Hi ${agentName}, your buyer has been registered on EquityReady. You'll be notified when a matching Willoughby property becomes available — before it hits MLS.</p>
        <p style="color:#64748B">Questions? Contact Kamran Khan at <a href="tel:${process.env.REALTOR_PHONE}" style="color:#0D9488">${process.env.REALTOR_PHONE}</a></p>
      </div>`
    })

    // Alert Kamran
    await resend.emails.send({
      from:    'EquityReady <alerts@equityready.ca>',
      to:      process.env.REALTOR_EMAIL!,
      subject: `New buyer registered — ${agentName} · ${brokerage}`,
      html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:480px">
        <h2 style="color:#0A1628">New buyer agent registered</h2>
        <p><strong>Agent:</strong> ${agentName} · ${brokerage}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Budget:</strong> $${budgetMin?.toLocaleString()} – $${budgetMax?.toLocaleString()}</p>
        <p><strong>Beds:</strong> ${bedrooms}+</p>
        <p><strong>Timeline:</strong> ${timeline}</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      </div>`
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Buyer registry error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
