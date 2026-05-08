'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginClient() {
  const router = useRouter()
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    // Verifica perfil do usuário
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

  return (
    <div style={{
      minHeight: '100vh', background: '#07080F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#4F46E5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 24, fontWeight: 700, color: '#fff',
          }}>Z</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Zynflow
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>
            Controle financeiro do autônomo
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '32px 28px',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>
            Entrar na sua conta
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%', background: '#07080F',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '11px 14px',
                fontSize: 14, color: '#fff', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', background: '#07080F',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '11px 14px',
                fontSize: 14, color: '#fff', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {erro && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#FCA5A5', marginBottom: 16,
            }}>{erro}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', background: '#4F46E5',
              border: 'none', borderRadius: 10,
              padding: '13px', fontSize: 15, fontWeight: 600,
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 20 }}>
            Não tem conta?{' '}
            <a href="/auth/cadastro" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 500 }}>
              Criar conta grátis
            </a>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#374151', marginTop: 24 }}>
          7 dias grátis · Sem cartão de crédito
        </p>
      </div>
    </div>
  )
}