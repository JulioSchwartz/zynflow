'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const MANUAL_URL = 'https://cpyvksnsfihybemvxvap.supabase.co/storage/v1/object/public/manuais/zynflow_pf_manual.pdf'

const MENU = [
  { label: 'Principal', items: [
    { href: '/pf/dashboard',     icon: '🏠', nome: 'Dashboard' },
    { href: '/pf/receitas',      icon: '💰', nome: 'Receitas' },
    { href: '/pf/despesas',      icon: '💸', nome: 'Despesas' },
    { href: '/pf/contas',        icon: '🏦', nome: 'Contas' },
  ]},
  { label: 'Planejamento', items: [
    { href: '/pf/reservas',      icon: '🛡️', nome: 'Reservas' },
    { href: '/pf/metas',         icon: '🎯', nome: 'Metas' },
    { href: '/pf/investimentos', icon: '📈', nome: 'Investimentos' },
    { href: '/pf/irpf',          icon: '📋', nome: 'IRPF' },
    { href: '/pf/checklist',     icon: '✅', nome: 'Checklist' },
    { href: '/pf/historico',     icon: '📂', nome: 'Histórico' },
  ]},
]

export default function PFLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [nomeUsuario, setNomeUsuario]           = useState('')
  const [diasTrial, setDiasTrial]               = useState<number | null>(null)
  const [menuAberto, setMenuAberto]             = useState(false)
  const [mostrarBannerPWA, setMostrarBannerPWA] = useState(false)
  const [isIOS, setIsIOS]                       = useState(false)
  const mes = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())

  useEffect(() => {
    setMenuAberto(false)
  }, [pathname])

  useEffect(() => {
    const jáInstalado = window.matchMedia('(display-mode: standalone)').matches
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    const jáFechou = localStorage.getItem('zynflow_pwa_banner') === 'fechado'
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIsIOS(ios)
    if (isMobile && !jáInstalado && !jáFechou) setMostrarBannerPWA(true)
  }, [])

  useEffect(() => {
    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('usuarios_flow')
        .select('nome, setup_concluido, status, trial_ends_at, perfil')
        .eq('user_id', user.id)
        .single()

      if (!data) { router.push('/auth/login'); return }

      if (data.perfil === 'autonomo') {
        router.push('/dashboard'); return
      }

      if (!data.setup_concluido && pathname !== '/pf/setup') {
        router.push('/pf/setup'); return
      }

      const statusBloqueado = ['cancelado', 'inadimplente']
      const trialExpirado = data.trial_ends_at
        ? new Date(data.trial_ends_at) < new Date()
        : false

      if ((statusBloqueado.includes(data.status) || (data.status === 'trial' && trialExpirado)) && pathname !== '/pf/setup') {
        router.push('/assinar'); return
      }

      if (data.status === 'trial' && data.trial_ends_at) {
        const diff = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        setDiasTrial(diff)
      }

      if (data.nome) setNomeUsuario(data.nome)
    }
    verificar()
  }, [router, pathname])

  function fecharBannerPWA() {
    localStorage.setItem('zynflow_pwa_banner', 'fechado')
    setMostrarBannerPWA(false)
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const iniciais = nomeUsuario.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  if (pathname === '/pf/setup') return <>{children}</>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07080F', fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .zf-sidebar {
          width: 200px;
          background: #0D0F1A;
          border-right: 1px solid rgba(255,255,255,0.07);
          padding: 16px 0;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        .zf-main {
          flex: 1;
          overflow: auto;
          padding: 24px;
        }
        .zf-hamburger { display: none; }
        .zf-overlay { display: none; }
        .zf-topbar-nome { display: block; }

        @media (max-width: 768px) {
          .zf-hamburger {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            cursor: pointer;
            flex-shrink: 0;
          }
          .zf-sidebar {
            position: fixed;
            top: 0;
            left: -220px;
            width: 220px;
            height: 100vh;
            z-index: 200;
            transition: left 0.25s ease;
            overflow-y: auto;
            padding-top: 60px;
          }
          .zf-sidebar.aberto {
            left: 0;
          }
          .zf-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 199;
          }
          .zf-main {
            padding: 16px;
            width: 100%;
            box-sizing: border-box;
          }
          .zf-topbar-nome { display: none; }
        }
      `}</style>

      {/* BANNER PWA */}
      {mostrarBannerPWA && (
        <div style={{ background: 'rgba(79,70,229,0.12)', borderBottom: '1px solid rgba(79,70,229,0.25)', padding: '10px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>📲</span>
            <div>
              <p style={{ color: '#818CF8', fontWeight: 700, fontSize: 13, margin: '0 0 2px' }}>
                Instale o Zynflow no seu celular!
              </p>
              <p style={{ color: '#4B5563', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                {isIOS
                  ? 'No Safari: toque em Compartilhar → "Adicionar à Tela de Início"'
                  : 'No Chrome: toque no menu ⋮ → "Adicionar à tela inicial"'}
              </p>
            </div>
          </div>
          <button onClick={fecharBannerPWA}
            style={{ background: 'transparent', border: 'none', color: '#4B5563', fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}>
            ✕
          </button>
        </div>
      )}

      {/* Banner trial */}
      {diasTrial !== null && diasTrial <= 7 && (
        <div style={{
          background: diasTrial <= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(79,70,229,0.15)',
          borderBottom: `1px solid ${diasTrial <= 2 ? 'rgba(239,68,68,0.3)' : 'rgba(79,70,229,0.3)'}`,
          padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 13,
        }}>
          <span style={{ color: diasTrial <= 2 ? '#FCA5A5' : '#818CF8' }}>
            {diasTrial <= 0 ? '⚠️ Seu trial expirou hoje!' : `⏰ Trial termina em ${diasTrial} dia${diasTrial !== 1 ? 's' : ''}.`}
          </span>
          <a href="/assinar" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none', background: diasTrial <= 2 ? '#ef4444' : '#4F46E5', padding: '4px 14px', borderRadius: 100, fontSize: 12 }}>
            Assinar agora →
          </a>
        </div>
      )}

      {/* TOPBAR */}
      <div style={{ height: 56, background: '#0D0F1A', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="zf-hamburger" onClick={() => setMenuAberto(v => !v)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect y="3" width="18" height="2" rx="1" fill="#9CA3AF"/>
              <rect y="8" width="18" height="2" rx="1" fill="#9CA3AF"/>
              <rect y="13" width="18" height="2" rx="1" fill="#9CA3AF"/>
            </svg>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>Z</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Zynflow</span>
        </div>
        <span style={{ fontSize: 12, color: '#6B7280', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: 100 }}>{mes}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="zf-topbar-nome" style={{ fontSize: 13, color: '#9CA3AF' }}>{nomeUsuario}</span>
          {/* Botão Sair visível */}
          <button onClick={sair}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>→</span> Sair
          </button>
          <div title={nomeUsuario} style={{ width: 32, height: 32, borderRadius: '50%', background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff' }}>
            {iniciais || 'Z'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {menuAberto && (
          <div className="zf-overlay" onClick={() => setMenuAberto(false)} />
        )}

        {/* SIDEBAR */}
        <div className={`zf-sidebar${menuAberto ? ' aberto' : ''}`}>
          {MENU.map(grupo => (
            <div key={grupo.label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151', padding: '0 16px', marginBottom: 4 }}>{grupo.label}</div>
              {grupo.items.map(item => {
                const ativo = pathname === item.href
                return (
                  <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, color: ativo ? '#818CF8' : '#6B7280', background: ativo ? 'rgba(79,70,229,0.1)' : 'transparent', borderRight: ativo ? '2px solid #4F46E5' : '2px solid transparent', textDecoration: 'none', fontWeight: ativo ? 500 : 400, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
                    {item.nome}
                  </a>
                )
              })}
            </div>
          ))}

          {diasTrial !== null && (
            <div style={{ margin: '16px 12px 0', padding: '12px', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: '#818CF8', fontWeight: 600, marginBottom: 6 }}>
                {diasTrial > 0 ? `${diasTrial} dia${diasTrial !== 1 ? 's' : ''} de trial restante${diasTrial !== 1 ? 's' : ''}` : 'Trial encerrado'}
              </div>
              <a href="/assinar" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#fff', background: '#4F46E5', textDecoration: 'none', padding: '7px 0', borderRadius: 7, textAlign: 'center' }}>
                Assinar Pro →
              </a>
            </div>
          )}

          <div style={{ margin: '12px 12px 0' }}>
            <a href={MANUAL_URL} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', fontSize: 13, color: '#6B7280', textDecoration: 'none', fontWeight: 400 }}>
              <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>📖</span>
              Manual
            </a>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="zf-main">
          {children}
        </div>

      </div>
    </div>
  )
}