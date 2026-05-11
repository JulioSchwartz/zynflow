'use client'
import { useState, useEffect } from 'react'
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

export default function NovaSenhaClient() {
  const router = useRouter()
  const [senha, setSenha]           = useState('')
  const [confirmar, setConfirmar]   = useState('')
  const [verSenha, setVerSenha]     = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [erro, setErro]             = useState('')
  const [ok, setOk]                 = useState(false)
  const [sessaoOk, setSessaoOk]     = useState(false)

  useEffect(() => {
    // Supabase injeta a sessão automaticamente via URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessaoOk(true)
    })
  }, [])

  async function handleNovaSenha() {
    setErro('')
    if (!senha || !confirmar) { setErro('Preencha todos os campos.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)

    if (error) { setErro('Erro ao redefinir senha. O link pode ter expirado.'); return }
    setOk(true)
    setTimeout(() => router.push('/auth/login'), 3000)
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

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 700, color: '#fff' }}>Z</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>Zynflow</h1>
        </div>

        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px' }}>
          {ok ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Senha redefinida!</h2>
              <p style={{ fontSize: 14, color: '#6B7280' }}>Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Nova senha</h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Escolha uma senha segura com pelo menos 6 caracteres.</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Nova senha</label>
                <div style={{ position: 'relative' }}>
                  <input type={verSenha ? 'text' : 'password'} value={senha}
                    onChange={e => setSenha(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNovaSenha()}
                    placeholder="••••••••" style={{ ...inp, paddingRight: 42 }} autoFocus />
                  <button type="button" onClick={() => setVerSenha(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <OlhoIcon aberto={verSenha} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Confirmar nova senha</label>
                <div style={{ position: 'relative' }}>
                  <input type={verConfirmar ? 'text' : 'password'} value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNovaSenha()}
                    placeholder="••••••••" style={{ ...inp, paddingRight: 42 }} />
                  <button type="button" onClick={() => setVerConfirmar(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <OlhoIcon aberto={verConfirmar} />
                  </button>
                </div>
              </div>

              {erro && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>{erro}</div>
              )}

              <button onClick={handleNovaSenha} disabled={loading}
                style={{ width: '100%', background: '#4F46E5', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}