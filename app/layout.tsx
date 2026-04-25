import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Banter – Snakk med folk i nærheten',
  description: 'Anonym live walkie-talkie for folk i nærheten',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  )
}
