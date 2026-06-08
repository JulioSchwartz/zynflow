'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERDE  = '#10b981'

const PLANOS = {
  autonomo: {
    preco:    'R$ 29,90/mês',
    precoNum: 'R$ 29,90',
    cor:      INDIGO,
    titulo:   'Zynflow Pro — Autônomo',
    itens: [
      'Dashboard com Método 3 Passos completo',
      'Teto semanal calculado automaticamente',
      'Fundo de Meses Fracos — exclusivo autônomo',
      'Receitas, despesas e contas ilimitadas',
      'Metas com aportes e histórico anual',
      'Checklist semanal interativo',
    ],
  },
  pf: {
    preco:    'R$ 34,90/mês',
    precoNum: 'R$ 34,90',
    cor:      VERDE,
    titulo:   'Zynflow Pro — CLT/Assalariado',
    itens: [
      'Dashboard financeiro completo para CLT',
      'Controle de salário e despesas mensais',
      'Módulo de investimentos com carteira completa',
      'IRPF — base para declaração do imposto de renda',
      'Receitas, despesas e contas ilimitadas',
      'Histórico anual detalhado',
    ],
  },
}

export default function AssinarClient() {
  const router   = useRouter()
  const params   = useSearchParams()
  const [nome, setNome]               = useState('')
  const [email, setEmail]             = useState('')
  const [userId, setUserId]           = useState('')
  const [perfil, setPerfil]           = useState<'autonomo' | 'pf'>('autonomo')
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [iniciando, setIniciando]     = useState(false)
  const sucesso = params.get('assinatura') === 'sucesso'

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('usuarios_flow')
        .select('nome, status, plano, perfil, trial_ends_at')
        .eq('user_id', user.id)
        .single()

      if (data?.status === 'ativo') {
        router.push(data?.perfil === 'pf' ? '/pf/dashboard' : '/dashboard')
        return
      }

      // Calcula dias restantes do trial
      if (data?.trial_ends_at) {
        const diff = new Date(data.trial_ends_at).getTime() - Date.now()
        const dias = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
        setDiasRestantes(dias)
      }

      setNome(data?.nome || '')
      setEmail(user.email || '')
      setUserId(user.id)
      setPerfil(data?.perfil === 'pf' ? 'pf' : 'autonomo')
      setLoading(false)
    }
    carregar()
  }, [router])

  async function assinar() {
    setIniciando(true)
    const res = await fetch('/api/criar-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, nome }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setIniciando(false)
  }

  const plano = PLANOS[perfil]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#6B7280', fontFamily: 'system-ui, sans-serif' }}>Carregando...</span>
    </div>
  )

  // Texto do trial restante
  const textoTrial = diasRestantes === null
    ? 'seu período gratuito de 30 dias'
    : diasRestantes === 0
    ? 'seu trial'
    : `seu trial (${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''})`

  const badgeTrial = diasRestantes !== null && diasRestantes > 0
    ? `⏳ ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} de trial restante${diasRestantes !== 1 ? 's' : ''}`
    : '⏰ Trial encerrado'

  return (
    <div style={{
      minHeight: '100vh', background: '#07080F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'system-ui, sans-serif',
      position: 'relative',
    }}>

      {/* BOTÃO VOLTAR */}
      {!sucesso && (
        <button onClick={() => router.push(perfil === 'pf' ? '/pf/dashboard' : '/dashboard')}
          style={{
            position: 'absolute', top: 20, left: 20,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#9CA3AF', padding: '8px 16px', borderRadius: 8,
            fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
          ← Voltar
        </button>
      )}

      <div style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: plano.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24, fontWeight: 800, color: '#fff' }}>Z</div>

        {sucesso ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Assinatura ativada!</h1>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 32 }}>
              Bem-vindo ao Zynflow Pro, {nome}! Seu controle financeiro começa agora.
            </p>
            <button onClick={() => router.push(perfil === 'pf' ? '/pf/dashboard' : '/dashboard')}
              style={{ background: plano.cor, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Ir para o dashboard →
            </button>
          </>
        ) : (
          <>
            {/* Badge dias restantes */}
            <div style={{
              display: 'inline-block', marginBottom: 20,
              background: diasRestantes !== null && diasRestantes > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${diasRestantes !== null && diasRestantes > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: 100, padding: '6px 16px',
              fontSize: 13, fontWeight: 600,
              color: diasRestantes !== null && diasRestantes > 0 ? '#fcd34d' : '#fca5a5',
            }}>
              {badgeTrial}
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              {diasRestantes === 0 ? 'Seu trial encerrou' : 'Assine o Zynflow Pro'}
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 36, lineHeight: 1.65 }}>
              {nome ? `${nome}, ` : ''}{diasRestantes === 0 ? `${textoTrial} chegou ao fim.` : `Aproveite ${textoTrial} ou assine agora.`} Continue usando o Zynflow por apenas <strong style={{ color: '#fff' }}>{plano.precoNum}</strong>.
            </p>

            {/* Card do plano */}
            <div style={{ background: '#0D0F1A', border: `1px solid ${plano.cor}4D`, borderRadius: 16, padding: '32px 28px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: plano.cor, marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                    {plano.titulo}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {plano.preco.split('/')[0]}
                    <span style={{ fontSize: 18, fontWeight: 400, color: '#6B7280' }}>/mês</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '4px 12px', borderRadius: 100, fontWeight: 600 }}>
                  Cancele quando quiser
                </span>
              </div>

              <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0 }}>
                {plano.itens.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14, color: '#E5E7EB', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <button onClick={assinar} disabled={iniciando} style={{
                width: '100%', background: plano.cor, color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700,
                cursor: iniciando ? 'not-allowed' : 'pointer', opacity: iniciando ? 0.7 : 1,
              }}>
                {iniciando ? 'Redirecionando...' : `Assinar agora por ${plano.precoNum} →`}
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#374151' }}>
              Sem taxa de cancelamento. Cancele quando quiser pelo dashboard.
            </p>

            <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
              style={{ marginTop: 20, background: 'none', border: 'none', color: '#4B5563', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
              Sair da conta
            </button>
          </>
        )}
      </div>
    </div>
  )
}