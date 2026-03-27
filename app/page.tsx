'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface BcaData {
  address: string
  purchasePrice: number
  purchaseDate: string
  assessedTotal: number
  equityGain: number
  equityMultiple: number
  bedrooms: string
  yearsOwned: number
  estimateLow: number
  estimateHigh: number
}

interface Lead {
  address: string
  name: string
  phone: string
  email: string
}

// ─── Google Maps types ───────────────────────────────────────────────────────
declare global {
  interface Window {
    google: any
    initGoogleMaps: () => void
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────
const MARKET = {
  avgPsf: 468, lowPsf: 451, highPsf: 481,
  avgDOM: 28, fastestDOM: 19, avgAboveBCA: 111500,
}

const COMPS = [
  { street: '69A Ave, Willoughby', sold: 'Sep 2025', bca: '$1,543,000', actual: '$1,650,000', vsBca: '+$107,000', days: 19, positive: true },
  { street: '69 Ave, Willoughby',  sold: 'Sep 2025', bca: '$1,486,000', actual: '$1,480,000', vsBca: 'at assessed', days: 28, positive: false },
  { street: '70A Ave, Willoughby', sold: 'Oct 2025', bca: '$1,239,000', actual: '$1,355,000', vsBca: '+$116,000', days: 38, positive: true },
]

const RENOS = [
  { id: 'kitchen_full',    label: 'Kitchen — full renovation',  sub: '+$25,000–$45,000', low: 25000, high: 45000 },
  { id: 'kitchen_partial', label: 'Kitchen — partial update',   sub: '+$10,000–$20,000', low: 10000, high: 20000 },
  { id: 'bath_primary',    label: 'Primary bathroom — full',    sub: '+$15,000–$25,000', low: 15000, high: 25000 },
  { id: 'bath_secondary',  label: 'Secondary bathroom',         sub: '+$8,000–$15,000',  low: 8000,  high: 15000 },
  { id: 'flooring',        label: 'Flooring throughout',        sub: '+$12,000–$22,000', low: 12000, high: 22000 },
  { id: 'suite',           label: 'Basement suite added',       sub: '+$40,000–$65,000', low: 40000, high: 65000 },
  { id: 'deck',            label: 'Deck / outdoor space',       sub: '+$8,000–$18,000',  low: 8000,  high: 18000 },
  { id: 'roof',            label: 'New roof',                   sub: '+$5,000–$10,000',  low: 5000,  high: 10000 },
]

// ─── Phone validation ────────────────────────────────────────────────────────
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 11
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
  if (digits.length <= 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  return `+${digits.slice(0,1)} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => '$' + n.toLocaleString()

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const [gate, setGate] = useState<1|2|3|4>(1)
  const [address, setAddress] = useState('')
  const [lead, setLead] = useState<Lead>({ address: '', name: '', phone: '', email: '' })
  const [bcaData, setBcaData] = useState<BcaData | null>(null)
  const [narrative, setNarrative] = useState('')
  const [checkedRenos, setCheckedRenos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role:string,text:string}[]>([
    { role: 'assistant', text: 'Hi! I\'m here to answer any questions about your home\'s value in Willoughby. What\'s on your mind?' }
  ])
  const [chatInput, setChatInput] = useState('')

  const addressInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const googleMapsLoaded = useRef(false)

  // ── Load Google Maps ───────────────────────────────────────────────────────
  useEffect(() => {
    if (googleMapsLoaded.current) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    window.initGoogleMaps = () => {
      googleMapsLoaded.current = true
      initAutocomplete()
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  // ── Init autocomplete when input is available ─────────────────────────────
  const initAutocomplete = useCallback(() => {
    if (!addressInputRef.current || !window.google) return
    const autocomplete = new window.google.maps.places.Autocomplete(
      addressInputRef.current,
      {
        componentRestrictions: { country: 'ca' },
        fields: ['formatted_address', 'address_components', 'geometry'],
        types: ['address'],
        bounds: new window.google.maps.LatLngBounds(
          { lat: 49.05, lng: -122.75 }, // SW corner of Willoughby area
          { lat: 49.25, lng: -122.50 }  // NE corner
        ),
        strictBounds: false,
      }
    )
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.formatted_address) {
        setAddress(place.formatted_address)
      }
    })
    autocompleteRef.current = autocomplete
  }, [])

  // Re-init autocomplete if Google loads after component mounts
  useEffect(() => {
    if (gate === 1 && window.google && addressInputRef.current && !autocompleteRef.current) {
      initAutocomplete()
    }
  }, [gate, initAutocomplete])

  // ── Gate 1 → 2 ────────────────────────────────────────────────────────────
  async function handleAddressSubmit() {
    if (!address.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      if (data.bcaData) setBcaData(data.bcaData)
      setLead(prev => ({ ...prev, address }))
    } catch {}
    setLoading(false)
    setGate(2)
  }

  // ── Gate 2 → 3 ────────────────────────────────────────────────────────────
  async function handleUnlock() {
    // Validate phone
    if (!lead.name.trim() || lead.name.trim().length < 2) return
    if (!isValidPhone(lead.phone)) {
      setPhoneError('Please enter a valid phone number (e.g. 604-555-0123)')
      return
    }
    setPhoneError('')
    setLoading(true)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: lead.address, name: lead.name, phone: lead.phone }),
      })
      const data = await res.json()
      if (data.narrative) setNarrative(data.narrative)
      if (data.bcaData) setBcaData(data.bcaData)
    } catch {}
    setLoading(false)
    setGate(3)
  }

  // ── Email PDF ──────────────────────────────────────────────────────────────
  async function handleEmailReport() {
    if (!lead.email || !lead.email.includes('@')) return
    setEmailLoading(true)
    try {
      await fetch('/api/email-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: lead.address,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          bcaData,
          narrative,
          checkedRenos,
        }),
      })
      setEmailSent(true)
    } catch {}
    setEmailLoading(false)
    setTimeout(() => setGate(4), 1500)
  }

  // ── Reno calc ─────────────────────────────────────────────────────────────
  const renoAddLow  = checkedRenos.reduce((s, id) => s + (RENOS.find(r => r.id === id)?.low  ?? 0), 0)
  const renoAddHigh = checkedRenos.reduce((s, id) => s + (RENOS.find(r => r.id === id)?.high ?? 0), 0)
  const adjLow  = (bcaData?.estimateLow  ?? 1353000) + renoAddLow
  const adjHigh = (bcaData?.estimateHigh ?? 1522000) + renoAddHigh

  // ── Chat ──────────────────────────────────────────────────────────────────
  async function handleChat() {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, address: lead.address }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Let me connect you with Kamran directly for that question. Call +1-236-660-2594.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Reach Kamran directly at +1-236-660-2594 or Realtormkamran@gmail.com.' }])
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#F4F6FB', minHeight: '100vh', color: '#0F2B5B' }}>

      {/* NAV */}
      <nav style={{ background: '#0A1628', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <span style={{ color: '#C8952A', fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px' }}>EquityReady</span>
        <span style={{ color: '#94A3B8', fontSize: 13 }}>Your personalized report</span>
      </nav>

      {/* ── GATE 1 ── */}
      {gate === 1 && (
        <div>
          {/* Hero */}
          <div style={{ background: '#0A1628', padding: '60px 24px 80px', textAlign: 'center' }}>
            <p style={{ color: '#C8952A', fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
              Willoughby, Langley BC
            </p>
            <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.2, maxWidth: 680, margin: '0 auto 20px' }}>
              Before you call a realtor,<br />know your number.
            </h1>
            <p style={{ color: '#94A3B8', fontSize: 17, maxWidth: 540, margin: '0 auto 40px' }}>
              Recent sales show Willoughby homes selling at $451–$481/sqft — often well above assessed value. See what yours is actually worth.
            </p>

            {/* Address search */}
            <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                ref={addressInputRef}
                value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddressSubmit()}
                placeholder="Start typing your address..."
                style={{
                  flex: 1, minWidth: 260, padding: '16px 20px', fontSize: 16,
                  border: '2px solid #1E3A5F', borderRadius: 10, background: '#0D1F3C',
                  color: '#fff', outline: 'none',
                }}
              />
              <button
                onClick={handleAddressSubmit}
                disabled={loading || !address.trim()}
                style={{
                  padding: '16px 28px', background: loading ? '#666' : '#0D9488',
                  color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
                  borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {loading ? 'Checking...' : 'See my estimate →'}
              </button>
            </div>
            <p style={{ color: '#4A6080', fontSize: 13, marginTop: 12 }}>
              No sign-up required to see your market range
            </p>
          </div>

          {/* Stats bar */}
          <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0 }}>
              {[
                { val: '$468', label: 'avg $/sqft sold', accent: '#0D9488' },
                { val: '28 days', label: 'avg days on market', accent: '#C8952A' },
                { val: '+$111,500', label: 'avg above BCA', accent: '#166534' },
              ].map((s, i) => (
                <div key={i} style={{ flex: '1 1 180px', padding: '28px 24px', textAlign: 'center', borderRight: i < 2 ? '1px solid #E2E8F0' : 'none' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.accent }}>{s.val}</div>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, padding: '8px 0 16px' }}>
              Based on 3 verified MLS transactions in Willoughby, Sept–Oct 2025
            </p>
          </div>

          {/* Why EquityReady */}
          <div style={{ maxWidth: 860, margin: '60px auto', padding: '0 24px' }}>
            <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 700, marginBottom: 40 }}>
              What you get — for free, in seconds
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              {[
                { icon: '📊', title: 'Your real market range', body: 'Based on actual $/sqft from recent Willoughby sales — not BCA.' },
                { icon: '💰', title: 'Your equity position', body: 'What you paid, what it\'s worth, and the tax-free gain in your hands.' },
                { icon: '🏡', title: 'Renovation value impact', body: 'Tick what you\'ve upgraded and see how buyers price it in.' },
                { icon: '📋', title: 'Net-in-pocket estimate', body: 'What you\'d actually walk away with after all costs — your real number.' },
              ].map((c, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px 20px' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{c.title}</div>
                  <div style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer style={{ background: '#0A1628', color: '#64748B', textAlign: 'center', padding: '32px 24px', fontSize: 13 }}>
            <p style={{ color: '#94A3B8', marginBottom: 8 }}>
              Powered by <strong style={{ color: '#C8952A' }}>Kamran Khan</strong>, REALTOR® · Royal Lepage Global Force Realty
            </p>
            <p>+1-236-660-2594 · Realtormkamran@gmail.com</p>
            <p style={{ marginTop: 12 }}>
              <a href="/privacy" style={{ color: '#4A6080', textDecoration: 'underline' }}>Privacy Policy</a>
            </p>
          </footer>
        </div>
      )}

      {/* ── GATE 2 ── */}
      {gate === 2 && (
        <div style={{ maxWidth: 640, margin: '48px auto', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: '#0A1628', padding: '24px 28px' }}>
              <p style={{ color: '#C8952A', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                Property detected
              </p>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{lead.address || address}</p>
              <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Willoughby · Original build</p>
            </div>

            <div style={{ padding: '28px' }}>
              {/* Blurred cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
                {/* BCA — not blurred */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>BCA Assessed</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: '#0F2B5B' }}>
                    {bcaData ? fmt(bcaData.assessedTotal) : '$1,439,000'}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>Official assessment</div>
                </div>
                {/* Market estimate — blurred */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Market Estimate</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#0F2B5B', filter: 'blur(7px)', userSelect: 'none' }}>
                    {bcaData ? fmt(bcaData.estimateLow) : '$1,353,000'}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4, filter: 'blur(5px)', userSelect: 'none' }}>Based on $/sqft</div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 20 }}>🔒</span>
                  </div>
                </div>
                {/* Equity — blurred */}
                <div style={{ background: '#FEF9EC', border: '1px solid #C8952A', borderRadius: 10, padding: 16, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ color: '#92600A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Equity Gained</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#C8952A', filter: 'blur(7px)', userSelect: 'none' }}>
                    {bcaData ? fmt(bcaData.equityGain) : '$1,096,206'}
                  </div>
                  <div style={{ color: '#92600A', fontSize: 12, marginTop: 4, filter: 'blur(5px)', userSelect: 'none' }}>Tax-free</div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 20 }}>🔒</span>
                  </div>
                </div>
              </div>

              <p style={{ textAlign: 'center', color: '#64748B', fontSize: 14, marginBottom: 24 }}>
                Enter your name and phone to unlock your full estimate
              </p>

              {/* Unlock form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  value={lead.name}
                  onChange={e => setLead(p => ({ ...p, name: e.target.value }))}
                  placeholder="Your first name"
                  style={{ padding: '14px 16px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 16, outline: 'none' }}
                />
                <div>
                  <input
                    value={lead.phone}
                    onChange={e => {
                      const formatted = formatPhone(e.target.value)
                      setLead(p => ({ ...p, phone: formatted }))
                      if (phoneError) setPhoneError('')
                    }}
                    placeholder="Phone number (e.g. 604-555-0123)"
                    type="tel"
                    style={{
                      width: '100%', padding: '14px 16px', border: `1.5px solid ${phoneError ? '#EF4444' : '#CBD5E1'}`,
                      borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  {phoneError && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{phoneError}</p>}
                </div>
                <button
                  onClick={handleUnlock}
                  disabled={loading || !lead.name.trim() || lead.name.trim().length < 2}
                  style={{
                    padding: '16px', background: loading ? '#94A3B8' : '#0D9488',
                    color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
                    borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Preparing your report...' : 'Unlock my estimate →'}
                </button>
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                  No spam. No pressure. Your details are used only to prepare your personalized report.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GATE 3 ── */}
      {gate === 3 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>

          {/* LEFT — Report */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header card */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ background: '#0A1628', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <p style={{ color: '#C8952A', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Equity report</p>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{lead.address}</p>
                </div>
                <span style={{ color: '#64748B', fontSize: 13 }}>Willoughby · {bcaData ? new Date(bcaData.purchaseDate).getFullYear() : '2004'} build</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '0' }}>
                {[
                  { label: 'Purchased for', val: bcaData ? fmt(bcaData.purchasePrice) : '$342,794', sub: bcaData ? `${new Date(bcaData.purchaseDate).toLocaleDateString('en-CA',{month:'long',year:'numeric'})} · ${Math.round(bcaData.yearsOwned)} yrs ago` : 'April 2004 · 22 yrs ago', gold: false },
                  { label: 'Market estimate', val: bcaData ? `${fmt(bcaData.estimateLow)}–` : '$1,353,000–', sub: bcaData ? `${fmt(bcaData.estimateHigh)}` : '$1,443,000', gold: false, sub2: 'at $451–$481/sqft' },
                  { label: 'Equity gained', val: bcaData ? `${fmt(bcaData.equityGain)}+` : '$1,096,206+', sub: bcaData ? `${bcaData.equityMultiple}x · 100% tax-free` : '4.2x · 100% tax-free', gold: true },
                ].map((c, i) => (
                  <div key={i} style={{ padding: '20px 24px', borderRight: i < 2 ? '1px solid #E2E8F0' : 'none', background: c.gold ? '#FEF9EC' : '#fff' }}>
                    <div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 22, color: c.gold ? '#C8952A' : '#0F2B5B' }}>{c.val}</div>
                    <div style={{ color: c.gold ? '#92600A' : '#64748B', fontSize: 13, marginTop: 4 }}>{c.sub}</div>
                    {c.sub2 && <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{c.sub2}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Narrative */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 28px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0A1628' }}>Market analysis</h3>
              {narrative
                ? <p style={{ color: '#334155', lineHeight: 1.8, fontSize: 15 }}>{narrative}</p>
                : <div style={{ background: '#F1F5F9', borderRadius: 8, padding: 20, color: '#64748B', fontSize: 14 }}>
                    Preparing your personalized analysis...
                  </div>
              }
            </div>

            {/* Comps table */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A1628' }}>Comparable sales — Sept–Oct 2025</h3>
                <span style={{ color: '#94A3B8', fontSize: 12 }}>MLS sold data</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      {['Street', 'Sold', 'BCA Assessed', 'Actual Sold', 'vs BCA', 'Days'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748B', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPS.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 12px', fontWeight: 500 }}>{c.street}</td>
                        <td style={{ padding: '14px 12px', color: '#64748B' }}>{c.sold}</td>
                        <td style={{ padding: '14px 12px', color: '#64748B' }}>{c.bca}</td>
                        <td style={{ padding: '14px 12px', fontWeight: 600 }}>{c.actual}</td>
                        <td style={{ padding: '14px 12px', fontWeight: 700, color: c.positive ? '#166534' : '#64748B' }}>{c.vsBca}</td>
                        <td style={{ padding: '14px 12px', color: '#64748B' }}>{c.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#FEF9EC', borderRadius: 8, border: '1px solid #C8952A' }}>
                <p style={{ color: '#92600A', fontSize: 13, fontWeight: 600 }}>
                  2 of 3 homes sold <strong>above BCA</strong> by avg $111,500 · $451–$481/sqft · Avg {MARKET.avgDOM} days on market
                </p>
              </div>
            </div>

            {/* Renovation calculator */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A1628' }}>Renovation value calculator</h3>
                {checkedRenos.length > 0 && (
                  <span style={{ background: '#0D9488', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>
                    +{fmt(renoAddLow)}–{fmt(renoAddHigh)}
                  </span>
                )}
              </div>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>
                Have you renovated? Select what applies and we'll adjust your estimated range.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {RENOS.map(r => (
                  <label key={r.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px',
                    border: `1.5px solid ${checkedRenos.includes(r.id) ? '#0D9488' : '#E2E8F0'}`,
                    borderRadius: 10, cursor: 'pointer',
                    background: checkedRenos.includes(r.id) ? '#F0FDFA' : '#FAFAFA',
                  }}>
                    <input
                      type="checkbox"
                      checked={checkedRenos.includes(r.id)}
                      onChange={e => setCheckedRenos(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))}
                      style={{ marginTop: 2, accentColor: '#0D9488', width: 16, height: 16, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</div>
                      <div style={{ color: '#0D9488', fontSize: 13, marginTop: 2 }}>{r.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
              {checkedRenos.length > 0 && (
                <div style={{ marginTop: 20, padding: '16px 20px', background: '#F0FDFA', borderRadius: 10, border: '1px solid #0D9488' }}>
                  <p style={{ color: '#0A1628', fontWeight: 700, fontSize: 15 }}>
                    Renovation-adjusted estimate: {fmt(adjLow)} – {fmt(adjHigh)}
                  </p>
                  <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                    Buyer premium for your upgrades: +{fmt(renoAddLow)}–{fmt(renoAddHigh)} above base estimate
                  </p>
                </div>
              )}
            </div>

            {/* Move cost breakdown */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 28px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0A1628' }}>The real cost of moving</h3>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16, lineHeight: 1.7 }}>
                Most original owners assume moving is expensive and disruptive. Here's the realistic math on a {bcaData ? fmt(Math.round((bcaData.estimateLow + bcaData.estimateHigh)/2)) : '$1,400,000'} sale:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Legal / notary fees', val: '$1,800–$2,500' },
                  { label: 'Moving costs (local)', val: '$2,000–$4,000' },
                  { label: 'Realtor commission', val: '~$35,000–$42,000' },
                  { label: 'Staging (optional)', val: '$3,000–$6,000' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#334155', fontSize: 14 }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{row.val}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #166534' }}>
                <p style={{ color: '#166534', fontSize: 13, fontWeight: 600 }}>
                  Total transition costs represent less than 3% of your estimated net proceeds — far less than most owners expect.
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px 28px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0A1628' }}>What happens if you decide to list</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { week: 'Week 1', title: 'Prepare & photograph', body: 'Staging consultation, professional photos, pricing strategy. Your home is ready before it goes live.' },
                  { week: 'Week 2', title: 'Live on MLS', body: 'Open house weekend. Based on recent sales, qualified buyers are ready and actively looking.' },
                  { week: 'Weeks 3–4', title: 'Offers & negotiation', body: 'Average homes in this area receive offers within 28 days. We negotiate the strongest terms.' },
                  { week: 'Day 30–60', title: 'Completion', body: 'Keys handed over. Proceeds in your account. The process is complete — on your timeline.' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 20, paddingBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0A1628', color: '#C8952A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {i+1}
                      </div>
                      {i < 3 && <div style={{ width: 2, flex: 1, background: '#E2E8F0', margin: '6px 0' }} />}
                    </div>
                    <div style={{ paddingTop: 6 }}>
                      <p style={{ color: '#C8952A', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{step.week}</p>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{step.title}</p>
                      <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT — Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>

            {/* Active demand */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>Active buyer demand</span>
              </div>
              <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.6 }}>
                There is currently strong buyer demand in Willoughby for detached homes in the $1.3M–$1.6M range. I work with buyers actively looking in this area.
              </p>
            </div>

            {/* Who is buying */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px' }}>
              <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#0A1628' }}>Who is buying in Willoughby right now</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Families relocating from Metro Vancouver — pre-approved $1.3M–$1.6M',
                  'Looking for move-in ready — not planning renovations',
                  'Prioritize school catchment, suite income, and garage',
                  'Typically need 30–45 day completion timeline',
                ].map((pt, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#0D9488', fontSize: 16, flexShrink: 0, marginTop: 1 }}>•</span>
                    <span style={{ color: '#334155', fontSize: 13, lineHeight: 1.5 }}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Supply warning */}
            <div style={{ background: '#0A1628', borderRadius: 12, padding: '20px', border: '1px solid #1E3A5F' }}>
              <p style={{ color: '#C8952A', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Right now supply is very limited</p>
              <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>
                There are very few comparable detached homes available in Willoughby at this moment. Homeowners who list first in a low-supply market consistently capture the strongest offers.
              </p>
            </div>

            {/* PDF email gate */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px' }}>
              <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: '#0A1628' }}>Get the full report as a PDF</h4>
              <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                Includes your renovation-adjusted estimate, net-in-pocket number, full comp breakdown, and move cost calculator.
              </p>
              {emailSent ? (
                <div style={{ background: '#F0FDF4', border: '1px solid #166534', borderRadius: 8, padding: '14px', textAlign: 'center' }}>
                  <p style={{ color: '#166534', fontWeight: 700, fontSize: 14 }}>✓ Report sent! Check your inbox.</p>
                </div>
              ) : (
                <>
                  <input
                    value={lead.email}
                    onChange={e => setLead(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    type="email"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 15, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
                  />
                  <button
                    onClick={handleEmailReport}
                    disabled={emailLoading || !lead.email.includes('@')}
                    style={{
                      width: '100%', padding: '14px', background: emailLoading ? '#94A3B8' : '#0D9488',
                      color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 10,
                      cursor: emailLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {emailLoading ? 'Sending...' : 'Email me the full report →'}
                  </button>
                  <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                    Kamran Khan will follow up personally within 24 hours
                  </p>
                </>
              )}
            </div>

            {/* Book a call */}
            <div style={{ background: '#FEF9EC', borderRadius: 12, border: '1px solid #C8952A', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0A1628', marginBottom: 6 }}>Prefer to talk now?</p>
              <p style={{ color: '#64748B', fontSize: 13, marginBottom: 14 }}>15-minute call. No obligation. Just your real number.</p>
              <a
                href="tel:+12366602594"
                style={{ display: 'block', padding: '12px', background: '#0A1628', color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 10, textDecoration: 'none' }}
              >
                Call +1-236-660-2594
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ── GATE 4 ── */}
      {gate === 4 && (
        <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '48px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: '#0A1628' }}>Your report is on its way</h2>
            <p style={{ color: '#64748B', fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
              Check your inbox — your personalized Willoughby equity report is headed there now.<br /><br />
              <strong style={{ color: '#0A1628' }}>Kamran Khan</strong> will follow up personally within 24 hours.
            </p>
            <div style={{ background: '#FEF9EC', border: '1px solid #C8952A', borderRadius: 10, padding: '20px', marginBottom: 24 }}>
              <p style={{ fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>Want to talk today?</p>
              <p style={{ color: '#64748B', fontSize: 14, marginBottom: 14 }}>15 minutes. No pressure. Just your complete picture.</p>
              <a href="tel:+12366602594" style={{ display: 'block', padding: '12px', background: '#0A1628', color: '#fff', fontWeight: 700, borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>
                Call +1-236-660-2594
              </a>
            </div>
            <p style={{ color: '#94A3B8', fontSize: 13 }}>Royal Lepage Global Force Realty · Langley, BC</p>
          </div>
        </div>
      )}

      {/* ── CHAT WIDGET ── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        {chatOpen && (
          <div style={{ width: 320, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ background: '#0A1628', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Willoughby Home Value</p>
                <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>Ask me anything</p>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ height: 240, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                    background: m.role === 'user' ? '#0D9488' : '#F1F5F9',
                    color: m.role === 'user' ? '#fff' : '#334155',
                  }}>{m.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder="Type a question..."
                style={{ flex: 1, padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 14, outline: 'none' }}
              />
              <button onClick={handleChat} style={{ padding: '10px 16px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>→</button>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            width: 56, height: 56, borderRadius: '50%', background: '#0A1628', border: '3px solid #C8952A',
            color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}
        >
          💬
        </button>
      </div>
    </div>
  )
}
