import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-head',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'EquityReady — Know Your Number Before You Call Anyone',
  description: 'Find out what your Willoughby home is really worth — based on actual MLS sales data, not just your BC Assessment.',
  keywords: 'Willoughby real estate, Langley home value, Willoughby homes for sale, BC Assessment vs market value',
  openGraph: {
    title: 'EquityReady — Willoughby Home Values',
    description: 'Before you call a realtor, know your number. Instant estimates based on real Willoughby sales data.',
    url: 'https://equityready.ca',
    siteName: 'EquityReady',
    locale: 'en_CA',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-navy text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
