import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zynflow — Controle Financeiro do Autônomo',
  description: 'Nunca mais fique sem dinheiro antes do mês acabar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Zynflow" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#07080F', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}