import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ThemeScript } from '@/components/ThemeScript'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AI Todo List',
  description: 'Manage your todo lists with AI assistance',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI Todos',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased bg-surface-50 text-surface-900 dark:bg-surface-900 dark:text-surface-100">
        <ThemeScript />
        <Providers googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
