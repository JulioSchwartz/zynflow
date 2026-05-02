'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MENU = [
  { label: 'Principal', items: [
    { href: '/dashboard',  icon: '◉', nome: 'Dashboard' },
    { href: '/receitas',   icon: '↑', nome: 'Receitas' },
    { href: '/despesas',   icon: '↓', nome: 'Despesas' },
    { href: '/contas',     icon: '◈', nome: 'Contas' },
  ]},
  { label: 'Planejamento', items: [
    { href: '/reservas',   icon: '◎', nome: 'Reservas' },
    { href: '/metas',      icon: '◇', nome: 'Metas' },
    { href: '/checklist',  icon: '✓', nome: 'Checklist' },
    { href: '/historico',  icon: '≡', nome: 'Histórico' },
  ]},
]

export default function SistemaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  const mes = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase
        .from('usuarios_flow').select('nome').eq('user_id', user.id).single()
      if (data?.nome) setNomeUsuario(data.nome)
    }
    verificar()
  }, [router])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const iniciais = nomeUsuario.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07080F', fontFamily: 'system-ui, sans-serif' }}>

      {/* TOPBAR */}
      <div style={{
        height: 56, background: '#0D0F1A',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18, display: 'none' }}
            className="ham-btn"
          >☰</button>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: '#4F46E5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>Z</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Zynflow</span>
        </div>

        <span style={{
          fontSize: 12, color: '#6B7280',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '4px 12px', borderRadius: 100,
        }}>{mes}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>{nomeUsuario}</span>
          <div
            onClick={sair}
            title="Sair"
            style={{
              width: 32, height: 32, borderRadius: '50%', background: '#4F46E5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
            }}
          >{iniciais || 'Z'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* SIDEBAR */}
        <div style={{
          width: 200, background: '#0D0F1A',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          padding: '16px 0', flexShrink: 0,
        }}>
          {MENU.map(grupo => (
            <div key={grupo.label} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#374151',
                padding: '0 16px', marginBottom: 4,
              }}>{grupo.label}</div>
              {grupo.items.map(item => {
                const ativo = pathname === item.href
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px',
                      fontSize: 13,
                      color: ativo ? '#818CF8' : '#6B7280',
                      background: ativo ? 'rgba(79,70,229,0.1)' : 'transparent',
                      borderRight: ativo ? '2px solid #4F46E5' : '2px solid transparent',
                      textDecoration: 'none',
                      fontWeight: ativo ? 500 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
                    {item.nome}
                  </a>
                )
              })}
            </div>
          ))}
        </div>

        {/* CONTEÚDO */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}