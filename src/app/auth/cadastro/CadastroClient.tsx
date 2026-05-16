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

type Etapa = 'perfil' | 'formulario' | 'sucesso'
type Perfil = 'autonomo' | 'pf' | null

export default function CadastroClient() {
  const router = useRouter()
  const [etapa, setEtapa]               = useState<Etapa>('perfil')
  const [perfil, setPerfil]             = useState<Perfil>(null)
  const [nome, setNome]                 = useState('')
  const [email, setEmail]               = useState('')
  const [senha, setSenha]               = useState('')
  const [confirmar, setConfirmar]       = useState('')
  const [verSenha, setVerSenha]         = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [erro, setErro]                 = useState('')
  const [loading, setLoading]           = useState(false)

  function selecionarPerfil(p: Perfil) {
    setPerfil(p)
    setEtapa('formulario')
  }

  async function handleCadastro() {
    setErro('')
    if (!nome || !email || !senha || !confirmar) { setErro('Preencha todos os campos.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
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

    // Login automático via tokens retornados pelo backend
    if (data.accessToken && data.refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
      })
      if (sessionError) {
        // Fallback: tenta signInWithPassword
        await new Promise(resolve => setTimeout(resolve, 800))
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (loginError) {
          setErro('Conta criada com sucesso! Houve um erro ao entrar automaticamente. Clique em "Já tem conta? Entrar" e faça login com o e-mail e senha que você acabou de cadastrar.')
          setLoading(false)
          return
        }
      }
    } else {
      // Fallback: tenta signInWithPassword
      await new Promise(resolve => setTimeout(resolve, 800))
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (loginError) {
        setErro('Conta criada com sucesso! Houve um erro ao entrar automaticamente. Clique em "Já tem conta? Entrar" e faça login com o e-mail e senha que você acabou de cadastrar.')
        setLoading(false)
        return
      }
    }

    // Mostra tela de sucesso e redireciona após 2.5s
    setEtapa('sucesso')
    const url = data.jaExistia ? '/dashboard' : (perfil === 'pf' ? '/pf/setup' : '/setup')
    setTimeout(() => router.push(url), 2500)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#07080F',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '11px 14px',
    fontSize: 14, color: '#fff', outline: 'none',
    boxSizing: 'border-box',
  }

  const corPerfil = perfil === 'pf' ? '#10b981' : INDIGO

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>Criar sua conta</h2>
              <button onClick={() => setEtapa('perfil')}
                style={{ background: perfil === 'pf' ? 'rgba(16,185,129,0.1)' : 'rgba(79,70,229,0.1)', border: `1px solid ${perfil === 'pf' ? 'rgba(16,185,129,0.3)' : 'rgba(79,70,229,0.3)'}`, borderRadius: 8, padding: '4px 12px', fontSize: 12, color: perfil === 'pf' ? '#10b981' : '#818CF8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {perfil === 'pf' ? '💼 CLT' : '🚀 Autônomo'} <span style={{ opacity: 0.6 }}>✕</span>
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Seu nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCadastro()}
                placeholder="João Silva" style={inp} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCadastro()}
                placeholder="seu@email.com" style={inp} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={verSenha ? 'text' : 'password'} value={senha}
                  onChange={e => setSenha(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCadastro()}
                  placeholder="••••••••" style={{ ...inp, paddingRight: 42 }} />
                <button type="button" onClick={() => setVerSenha(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <OlhoIcon aberto={verSenha} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <input type={verConfirmar ? 'text' : 'password'} value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCadastro()}
                  placeholder="••••••••" style={{ ...inp, paddingRight: 42 }} />
                <button type="button" onClick={() => setVerConfirmar(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <OlhoIcon aberto={verConfirmar} />
                </button>
              </div>
            </div>

            {erro && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13,
                color: '#FCA5A5', marginBottom: 16, lineHeight: 1.6
              }}>{erro}</div>
            )}

            <button onClick={handleCadastro} disabled={loading}
              style={{ width: '100%', background: corPerfil, border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
              {loading ? 'Criando conta...' : 'Criar conta grátis →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 20 }}>
              Já tem conta?{' '}
              <a href="/auth/login" style={{ color: '#818CF8', textDecoration: 'none', fontWeight: 500 }}>Entrar</a>
            </p>
          </div>
        )}

        {/* ETAPA 3 — Sucesso */}
        {etapa === 'sucesso' && (
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: '48px 28px', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: 36
            }}>✅</div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              Conta criada com sucesso!
            </h2>
            <p style={{ fontSize: 15, color: '#9CA3AF', margin: '0 0 6px', lineHeight: 1.6 }}>
              Bem-vindo ao Zynflow, <strong style={{ color: '#fff' }}>{nome.split(' ')[0]}</strong>! 🎉
            </p>
            <p style={{ fontSize: 13, color: '#4B5563', margin: '0 0 36px' }}>
              Seus <strong style={{ color: perfil === 'pf' ? '#10b981' : '#818CF8' }}>30 dias grátis</strong> começaram agora.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, height: 4, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{
                height: '100%', borderRadius: 100,
                background: perfil === 'pf' ? '#10b981' : INDIGO,
                animation: 'progresso 2.5s linear forwards',
              }} />
            </div>
            <p style={{ fontSize: 12, color: '#4B5563', margin: 0 }}>Preparando seu painel...</p>

            <style>{`
              @keyframes progresso {
                from { width: 0%; }
                to   { width: 100%; }
              }
            `}</style>
          </div>
        )}

      </div>
    </div>
  )
}