'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'

function traduzirErro(erro: string): string {
  if (erro.includes('already been registered') || erro.includes('already registered'))
    return 'Este e-mail já está cadastrado. Tente fazer login.'
  if (erro.includes('invalid email') || erro.includes('Invalid email'))
    return 'E-mail inválido. Verifique e tente novamente.'
  if (erro.includes('Password should be at least'))
    return 'A senha deve ter pelo menos 6 caracteres.'
  if (erro.includes('Unable to validate email address'))
    return 'Não foi possível validar o e-mail. Verifique e tente novamente.'
  if (erro.includes('signup is disabled'))
    return 'Cadastros temporariamente desativados. Tente novamente mais tarde.'
  return erro
}

type Etapa = 'perfil' | 'formulario'
type Perfil = 'autonomo' | 'pf' | null

export default function CadastroClient() {
  const router = useRouter()
  const [etapa, setEtapa]   = useState<Etapa>('perfil')
  const [perfil, setPerfil] = useState<Perfil>(null)
  const [nome, setNome]     = useState('')
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  function selecionarPerfil(p: Perfil) {
    setPerfil(p)
    setEtapa('formulario')
  }

  async function handleCadastro() {
    setErro('')
    if (!nome || !email || !senha) { setErro('Preencha todos os campos.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)

    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, perfil }),
    })

    const data = await res.json()

    if (!res.ok) {
      setErro(traduzirErro(data.error || 'Erro ao criar conta.'))
      setLoading(false)
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (loginError) { router.push('/auth/login'); return }

    if (data.jaExistia) router.push('/dashboard')
    else router.push('/setup')
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
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 700, color: '#fff' }}>Z</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Zynflow</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>30 dias grátis · Sem cartão de crédito</p>
        </div>

        {/* ETAPA 1 — Escolha de perfil */}
        {etapa === 'perfil' && (
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Qual é o seu perfil?</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 28 }}>Vamos personalizar o Zynflow para a sua realidade financeira.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Autônomo */}
              <button onClick={() => selecionarPerfil('autonomo')}
                style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 14, padding: '20px 22px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = INDIGO)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(79,70,229,0.25)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚀</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Autônomo / Renda variável</div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Freelancer, MEI, profissional liberal. Renda que varia todo mês.</div>
                  </div>
                </div>
              </button>

              {/* PF / CLT */}
              <button onClick={() => selecionarPerfil('pf')}
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '20px 22px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#10b981')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>💼</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>CLT / Assalariado</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 8px', borderRadius: 100 }}>NOVO</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Salário fixo, benefícios e investimentos. Com módulo para IRPF.</div>
                  </div>
                </div>
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 24 }}>
              Já tem conta?{' '}
              <a href="/auth/login" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 500 }}>Entrar</a>
            </p>
          </div>
        )}

        {/* ETAPA 2 — Formulário */}
        {etapa === 'formulario' && (
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px' }}>

            {/* Perfil selecionado */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>Criar sua conta</h2>
              <button onClick={() => setEtapa('perfil')}
                style={{ background: perfil === 'pf' ? 'rgba(16,185,129,0.1)' : 'rgba(79,70,229,0.1)', border: `1px solid ${perfil === 'pf' ? 'rgba(16,185,129,0.3)' : 'rgba(79,70,229,0.3)'}`, borderRadius: 8, padding: '4px 12px', fontSize: 12, color: perfil === 'pf' ? '#10b981' : '#818CF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {perfil === 'pf' ? '💼 CLT' : '🚀 Autônomo'} <span style={{ opacity: 0.6 }}>✕</span>
              </button>
            </div>

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
                  onKeyDown={e => e.key === 'Enter' && handleCadastro()}
                  placeholder={f.placeholder}
                  style={inp}
                />
              </div>
            ))}

            {erro && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>{erro}</div>
            )}

            <button onClick={handleCadastro} disabled={loading}
              style={{ width: '100%', background: perfil === 'pf' ? '#10b981' : INDIGO, border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
              {loading ? 'Criando conta...' : 'Criar conta grátis →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 20 }}>
              Já tem conta?{' '}
              <a href="/auth/login" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 500 }}>Entrar</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}