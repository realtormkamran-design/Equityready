import { Resend } from 'resend'
import { fmt } from './constants'

const resend = new Resend(process.env.RESEND_API_KEY)

const REALTOR_EMAIL  = process.env.REALTOR_EMAIL!
const REALTOR_NAME   = process.env.REALTOR_NAME!
const REALTOR_PHONE  = process.env.REALTOR_PHONE!
const CALENDLY       = process.env.REALTOR_CALENDLY!
const SITE           = process.env.NEXT_PUBLIC_SITE_URL || 'https://equityready.ca'

// ── Alert to Kamran when someone unlocks ─────────────────────────────────────
export async function sendRealtorAlert(data: {
  stage:    string
  address:  string
  name?:    string
  phone?:   string
  email?:   string
  assessed?: number
  equity?:  number
}) {
  await resend.emails.send({
    from:    `EquityReady <alerts@equityready.ca>`,
    to:      REALTOR_EMAIL,
    subject: `🔔 New lead — ${data.stage} — ${data.address}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;padding:24px">
        <h2 style="color:#0A1628;margin-bottom:16px">New EquityReady Lead</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#64748B;width:120px">Stage</td><td style="padding:8px 0;font-weight:bold;color:#0D9488">${data.stage}</td></tr>
          <tr><td style="padding:8px 0;color:#64748B">Address</td><td style="padding:8px 0;font-weight:bold">${data.address}</td></tr>
          ${data.name    ? `<tr><td style="padding:8px 0;color:#64748B">Name</td><td style="padding:8px 0">${data.name}</td></tr>` : ''}
          ${data.phone   ? `<tr><td style="padding:8px 0;color:#64748B">Phone</td><td style="padding:8px 0"><a href="tel:${data.phone}" style="color:#0D9488">${data.phone}</a></td></tr>` : ''}
          ${data.email   ? `<tr><td style="padding:8px 0;color:#64748B">Email</td><td style="padding:8px 0"><a href="mailto:${data.email}" style="color:#0D9488">${data.email}</a></td></tr>` : ''}
          ${data.assessed? `<tr><td style="padding:8px 0;color:#64748B">BCA Assessed</td><td style="padding:8px 0">${fmt(data.assessed)}</td></tr>` : ''}
          ${data.equity  ? `<tr><td style="padding:8px 0;color:#64748B">Equity</td><td style="padding:8px 0;color:#166534;font-weight:bold">${fmt(data.equity)}</td></tr>` : ''}
        </table>
        <a href="${SITE}/dashboard" style="display:inline-block;margin-top:20px;background:#0D9488;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">View in Dashboard</a>
      </div>
    `
  })
}

// ── PDF report email to homeowner ─────────────────────────────────────────────
export async function sendReportEmail(data: {
  toEmail:    string
  toName:     string
  address:    string
  assessed:   number
  mktLow:     number
  mktHigh:    number
  equity:     number
  multiple:   number
  netInHand:  number
  narrative:  string
}) {
  await resend.emails.send({
    from:    `Kamran Khan — EquityReady <kamran@equityready.ca>`,
    to:      data.toEmail,
    subject: `Your Willoughby equity report — ${data.address}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
        
        <!-- Header -->
        <div style="background:#0A1628;padding:24px 32px;border-radius:12px 12px 0 0">
          <div style="color:#F0C040;font-size:20px;font-weight:bold;margin-bottom:4px">EquityReady</div>
          <div style="color:#CBD5E1;font-size:13px">Willoughby, Langley BC — Personalized Equity Report</div>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:15px;color:#0A1628;margin-bottom:4px">Hi ${data.toName},</p>
          <p style="font-size:14px;color:#64748B;margin-bottom:24px">Here is your personalized equity report for <strong style="color:#0A1628">${data.address}</strong>.</p>

          <!-- Stat cards -->
          <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:20px">
            <tr>
              <td style="background:#F4F6FB;border:1px solid #E2E8F0;border-radius:10px;padding:14px;text-align:center;width:33%">
                <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">BCA Assessed</div>
                <div style="font-size:18px;font-weight:bold;color:#0A1628">${fmt(data.assessed)}</div>
              </td>
              <td style="background:#F4F6FB;border:1px solid #E2E8F0;border-radius:10px;padding:14px;text-align:center;width:33%">
                <div style="font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Market Estimate</div>
                <div style="font-size:15px;font-weight:bold;color:#0D9488">${fmt(data.mktLow)} – ${fmt(data.mktHigh)}</div>
              </td>
              <td style="background:#FEF9EC;border:1px solid #E8B84B;border-radius:10px;padding:14px;text-align:center;width:33%">
                <div style="font-size:10px;color:#C8952A;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Equity Gained</div>
                <div style="font-size:18px;font-weight:bold;color:#C8952A">${fmt(data.equity)}</div>
                <div style="font-size:11px;color:#C8952A;margin-top:3px">${data.multiple}x · 100% tax-free</div>
              </td>
            </tr>
          </table>

          <!-- Net in hand -->
          <div style="background:#DCFCE7;border:1px solid #86EFAC;border-radius:10px;padding:14px;margin-bottom:20px;display:flex;justify-content:space-between">
            <div style="font-size:13px;color:#166534;font-weight:600">Estimated net in hand after costs</div>
            <div style="font-size:18px;font-weight:bold;color:#166534">${fmt(data.netInHand)}</div>
          </div>

          <!-- Narrative -->
          <div style="font-size:13px;color:#64748B;line-height:1.8;margin-bottom:20px;padding:16px;background:#F4F6FB;border-radius:8px;border-left:3px solid #0D9488">
            ${data.narrative.replace(/\n\n/g,'</p><p style="margin:0 0 12px">').replace(/^/,'<p style="margin:0 0 12px">').replace(/$/,'</p>')}
          </div>

          <!-- Comp sales -->
          <div style="margin-bottom:20px">
            <div style="font-size:13px;font-weight:600;color:#0A1628;margin-bottom:8px">Recent comparable sales — Willoughby Sept–Oct 2025</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <tr style="background:#F4F6FB">
                <th style="padding:8px;text-align:left;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0">Street</th>
                <th style="padding:8px;text-align:right;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0">BCA</th>
                <th style="padding:8px;text-align:right;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0">Sold</th>
                <th style="padding:8px;text-align:right;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0">vs BCA</th>
              </tr>
              <tr><td style="padding:8px;border-bottom:1px solid #E2E8F0">69A Ave</td><td style="padding:8px;text-align:right;border-bottom:1px solid #E2E8F0">$1,543,000</td><td style="padding:8px;text-align:right;border-bottom:1px solid #E2E8F0;font-weight:600">$1,650,000</td><td style="padding:8px;text-align:right;border-bottom:1px solid #E2E8F0;color:#166534;font-weight:600">+$107,000</td></tr>
              <tr style="background:#F4F6FB"><td style="padding:8px;border-bottom:1px solid #E2E8F0">69 Ave</td><td style="padding:8px;text-align:right;border-bottom:1px solid #E2E8F0">$1,486,000</td><td style="padding:8px;text-align:right;border-bottom:1px solid #E2E8F0;font-weight:600">$1,480,000</td><td style="padding:8px;text-align:right;border-bottom:1px solid #E2E8F0;color:#64748B">at assessed</td></tr>
              <tr><td style="padding:8px">70A Ave</td><td style="padding:8px;text-align:right">$1,239,000</td><td style="padding:8px;text-align:right;font-weight:600">$1,355,000</td><td style="padding:8px;text-align:right;color:#166534;font-weight:600">+$116,000</td></tr>
            </table>
          </div>

          <!-- CTA -->
          <div style="background:#0A1628;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
            <div style="color:#F0C040;font-size:14px;font-weight:600;margin-bottom:6px">Ready to talk numbers?</div>
            <div style="color:#CBD5E1;font-size:12px;margin-bottom:14px">I prepare neighbourhood position reports personally for a limited number of Willoughby homeowners each month. No obligation. No pitch.</div>
            <a href="${CALENDLY}" style="display:inline-block;background:#0D9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">Book a free 15-min call</a>
          </div>

          <!-- Sign off -->
          <div style="border-top:1px solid #E2E8F0;padding-top:16px;font-size:13px;color:#64748B">
            <div style="font-weight:600;color:#0A1628;margin-bottom:2px">${REALTOR_NAME}</div>
            <div>REALTOR® · ${process.env.REALTOR_BROKERAGE}</div>
            <div><a href="tel:${REALTOR_PHONE}" style="color:#0D9488">${REALTOR_PHONE}</a> · <a href="mailto:${REALTOR_EMAIL}" style="color:#0D9488">${REALTOR_EMAIL}</a></div>
          </div>

          <div style="margin-top:20px;font-size:10px;color:#A0AEC0;line-height:1.6">
            Based on 3 MLS sold transactions in Willoughby, Sept–Oct 2025. Market values are estimates — verify with current MLS data before any transaction. This report was prepared exclusively for ${data.address}.
          </div>
        </div>
      </div>
    `
  })
}
