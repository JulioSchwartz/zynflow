'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function OlhoIcon({ aberto }: { aberto: boolean }) {
  return aberto ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function LoginClient() {
  const router = useRouter()
  const [email, setEmail]             = useState('')
  const [senha, setSenha]             = useState('')
  const [verSenha, setVerSenha]       = useState(false)
  const [erro, setErro]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [telaReset, setTelaReset]     = useState(false)
  const [emailReset, setEmailReset]   = useState('')
  const [resetOk, setResetOk]         = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetErro, setResetErro]     = useState('')

  async function handleLogin() {
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('usuarios_flow')
        .select('perfil')
        .eq('user_id', user.id)
        .single()

      if (data?.perfil === 'pf') {
        router.push('/pf/dashboard')
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }

  async function handleReset() {
  setResetErro('')
  if (!emailReset.trim()) { setResetErro('Informe seu e-mail.'); return }
  setResetLoading(true)

  const res = await fetch('/api/reset-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailReset }),
  })

  setResetLoading(false)

  if (!res.ok) {
    setResetErro('Erro ao enviar e-mail. Verifique o endereço e tente novamente.')
    return
  }

  setResetOk(true)
}

  const inp: React.CSSProperties = {
    width: '100%', background: '#07080F',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '11px 14px',
    fontSize: 14, color: '#fff', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07080F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 700, color: '#fff' }}>Z</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Zynflow</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>Controle financeiro inteligente</p>
        </div>

        {/* ── TELA RESET ── */}
        {telaReset ? (
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px' }}>
            {resetOk ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>E-mail enviado!</h2>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
                <button onClick={() => { setTelaReset(false); setResetOk(false); setEmailReset('') }}
                  style={{ width: '100%', background: '#4F46E5', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  Voltar ao login
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Redefinir senha</h2>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>E-mail</label>
                  <input
                    type="email" value={emailReset}
                    onChange={e => setEmailReset(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                    placeholder="seu@email.com" style={inp} autoFocus />
                </div>

                {resetErro && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>{resetErro}</div>
                )}

                <button onClick={handleReset} disabled={resetLoading}
                  style={{ width: '100%', background: '#4F46E5', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: resetLoading ? 'not-allowed' : 'pointer', opacity: resetLoading ? 0.7 : 1, marginBottom: 12 }}>
                  {resetLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>

                <button onClick={() => { setTelaReset(false); setResetErro('') }}
                  style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px', fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>
                  ← Voltar ao login
                </button>
              </>
            )}
          </div>
        ) : (

        /* ── TELA LOGIN ── */
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>Entrar na sua conta</h2>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="seu@email.com" style={inp} />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF' }}>Senha</label>
              <button type="button" onClick={() => { setTelaReset(true); setEmailReset(email) }}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#818CF8', cursor: 'pointer', padding: 0 }}>
                Esqueci minha senha
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={verSenha ? 'text' : 'password'} value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••" style={{ ...inp, paddingRight: 42 }} />
              <button type="button" onClick={() => setVerSenha(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <OlhoIcon aberto={verSenha} />
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }} />

          {erro && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>{erro}</div>
          )}

          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', background: '#4F46E5', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 20 }}>
            Não tem conta?{' '}
            <a href="/auth/cadastro" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 500 }}>Criar conta grátis</a>
          </p>
        </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#374151', marginTop: 24 }}>
          30 dias grátis · Sem cartão de crédito
        </p>
      </div>
    </div>
  )
}