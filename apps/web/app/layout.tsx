import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wazap — WhatsApp API Platform',
  description: 'WhatsApp API & Messaging Platform. Flat Pricing. No Surprises.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
