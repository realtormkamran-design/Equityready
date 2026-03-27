export const MARKET = {
  avgPpsf:       468,
  lowPpsf:       451,
  highPpsf:      481,
  avgDom:        28,
  fastestDom:    19,
  avgAboveBca:   111500,
  dateRange:     'Sept–Oct 2025',
  area:          'Willoughby, Langley BC',
}

export const COMPS = [
  { street: '69A Ave, Willoughby', date: 'Sep 2025', bca: 1543000, sold: 1650000, dom: 19 },
  { street: '69 Ave, Willoughby',  date: 'Sep 2025', bca: 1486000, sold: 1480000, dom: 28 },
  { street: '70A Ave, Willoughby', date: 'Oct 2025', bca: 1239000, sold: 1355000, dom: 38 },
]

export const RENOS = [
  { label: 'Kitchen — full renovation',    low: 25000, high: 45000 },
  { label: 'Kitchen — partial update',     low: 10000, high: 20000 },
  { label: 'Primary bathroom — full',      low: 15000, high: 25000 },
  { label: 'Secondary bathroom',           low: 8000,  high: 15000 },
  { label: 'Flooring throughout',          low: 12000, high: 22000 },
  { label: 'Basement suite added',         low: 40000, high: 65000 },
  { label: 'Deck / outdoor space',         low: 8000,  high: 18000 },
  { label: 'New windows',                  low: 8000,  high: 15000 },
  { label: 'Fresh paint throughout',       low: 5000,  high: 10000 },
  { label: 'New roof / HVAC',              low: 5000,  high: 10000 },
]

export const WILLOUGHBY_POSTALS = ['V2Y']
export const LANGLEY_POSTALS    = ['V1M','V3A','V4W','V2Z','V1C','V2R','V1B','V1E']
export const LOWER_MAINLAND     = ['V5','V6','V7','V3','V4','V8','V9']

export type AreaType = 'willoughby' | 'langley' | 'lower_mainland' | 'outside_bc'

export function classifyPostal(postal: string): AreaType {
  const p = postal.toUpperCase().replace(/\s/g,'')
  if (WILLOUGHBY_POSTALS.some(x => p.startsWith(x))) return 'willoughby'
  if (LANGLEY_POSTALS.some(x => p.startsWith(x)))    return 'langley'
  if (LOWER_MAINLAND.some(x => p.startsWith(x)))     return 'lower_mainland'
  return 'outside_bc'
}

export function fmt(n: number) {
  return '$' + n.toLocaleString('en-CA')
}

export function calcNetInHand(assessed: number) {
  // After ~5.5% commission + $28K closing costs
  return Math.round(assessed * 0.945 - 28000)
}

export function calcMarketRange(sqftEst = 3000) {
  return {
    low:  Math.round(sqftEst * MARKET.lowPpsf  / 1000) * 1000,
    high: Math.round(sqftEst * MARKET.highPpsf / 1000) * 1000,
  }
}
