'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CadastroClient() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCadastro() {
    setErro('')
    if (!nome || !email || !senha) { setErro('Preencha todos os campos.'); return }
    if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres.'); return }
    setLoading(true)

    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    })

    const data = await res.json()
    if (!res.ok) { setErro(data.error || 'Erro ao criar conta.'); setLoading(false); return }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { router.push('/auth/login'); return }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07080F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

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
            7 dias grátis · Sem cartão de crédito
          </p>
        </div>

        <div style={{
          background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: '32px 28px',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>
            Criar sua conta
          </h2>

          {[
            { label: 'Seu nome', value: nome, set: setNome, type: 'text', placeholder: 'João Silva' },
            { label: 'E-mail', value: email, set: setEmail, type: 'email', placeholder: 'seu@email.com' },
            { label: 'Senha', value: senha, set: setSenha, type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: '100%', background: '#07080F',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '11px 14px',
                  fontSize: 14, color: '#fff', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {erro && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#FCA5A5', marginBottom: 16,
            }}>{erro}</div>
          )}

          <button
            onClick={handleCadastro}
            disabled={loading}
            style={{
              width: '100%', background: '#4F46E5',
              border: 'none', borderRadius: 10,
              padding: '13px', fontSize: 15, fontWeight: 600,
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 8,
            }}
          >
            {loading ? 'Criando conta...' : 'Criar conta grátis →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 20 }}>
            Já tem conta?{' '}
            <a href="/auth/login" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 500 }}>
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}