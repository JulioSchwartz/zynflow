'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'

export default function AssinarClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [nome, setNome]         = useState('')
  const [email, setEmail]       = useState('')
  const [userId, setUserId]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [iniciando, setIniciando] = useState(false)
  const sucesso = params.get('assinatura') === 'sucesso'

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('usuarios_flow')
        .select('nome, status, plano')
        .eq('user_id', user.id)
        .single()

      // Se já é ativo, volta para dashboard
      if (data?.status === 'ativo') { router.push('/dashboard'); return }

      setNome(data?.nome || '')
      setEmail(user.email || '')
      setUserId(user.id)
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#6B7280', fontFamily: 'system-ui, sans-serif' }}>Carregando...</span>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#07080F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24, fontWeight: 800, color: '#fff' }}>Z</div>

        {sucesso ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Assinatura ativada!</h1>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 32 }}>Bem-vindo ao Zynflow Pro, {nome}! Seu controle financeiro começa agora.</p>
            <button onClick={() => router.push('/dashboard')} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Ir para o dashboard →
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Seu trial encerrou
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 36, lineHeight: 1.65 }}>
              {nome ? `${nome}, o` : 'O'} seu período gratuito de 30 dias chegou ao fim. Para continuar usando o Zynflow, ative sua assinatura por apenas <strong style={{ color: '#fff' }}>R$ 19,90/mês</strong>.
            </p>

            {/* Card do plano */}
            <div style={{ background: '#0D0F1A', border: '1px solid rgba(79,70,229,0.3)', borderRadius: 16, padding: '32px 28px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#818CF8', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Zynflow Pro</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>R$ 19<span style={{ fontSize: 18, fontWeight: 400, color: '#6B7280' }}>,90/mês</span></div>
                </div>
                <span style={{ fontSize: 12, color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '4px 12px', borderRadius: 100, fontWeight: 600 }}>Cancele quando quiser</span>
              </div>

              <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0 }}>
                {[
                  'Dashboard com Método 3 Passos completo',
                  'Teto semanal calculado automaticamente',
                  'Fundo de Meses Fracos — exclusivo autônomo',
                  'Receitas, despesas e contas ilimitadas',
                  'Metas com aportes e histórico anual',
                  'Checklist semanal interativo',
                ].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14, color: '#E5E7EB', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <button onClick={assinar} disabled={iniciando} style={{
                width: '100%', background: INDIGO, color: '#fff', border: 'none',
                borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700,
                cursor: iniciando ? 'not-allowed' : 'pointer', opacity: iniciando ? 0.7 : 1,
              }}>
                {iniciando ? 'Redirecionando...' : 'Assinar agora por R$ 19,90/mês →'}
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