import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zynflow — Controle Financeiro do Autônomo',
  description: 'Nunca mais fique sem dinheiro antes do mês acabar.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: '#07080F', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}