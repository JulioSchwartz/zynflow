'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const INDIGO2 = '#818CF8'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PROFISSOES = [
  'Desenvolvedor / Programador',
  'Designer / Criativo',
  'Consultor / Coach',
  'Médico / Profissional de Saúde',
  'Advogado / Contador',
  'Engenheiro / Arquiteto',
  'Professor / Instrutor',
  'Fotógrafo / Videomaker',
  'Marketing / Social Media',
  'Vendedor / Representante',
  'Técnico / Instalador',
  'Autônomo / Prestador de serviços',
  'Outro',
]

const OBJETIVOS = [
  { valor: 'sair_vermelho',  label: '🔴 Sair do vermelho e organizar as contas' },
  { valor: 'reserva',        label: '🛡️ Construir minha reserva de emergência' },
  { valor: 'guardar_algo',   label: '🎯 Guardar dinheiro para um objetivo específico' },
  { valor: 'investir',       label: '📈 Começar a investir com consistência' },
  { valor: 'meses_fracos',   label: '📦 Me proteger nos meses de renda baixa' },
  { valor: 'controle',       label: '📊 Ter controle total do meu dinheiro' },
]

interface FormData {
  // Passo 1
  nome: string
  profissao: string
  cidade: string
  // Passo 2
  renda_conservadora: number
  renda_boa: number
  despesas_estimadas: number
  reserva_atual: number
  // Passo 3
  objetivo: string
  objetivo_valor: number
  objetivo_meses: number
}

const INICIAL: FormData = {
  nome: '', profissao: '', cidade: '',
  renda_conservadora: 0, renda_boa: 0, despesas_estimadas: 0, reserva_atual: 0,
  objetivo: '', objetivo_valor: 0, objetivo_meses: 12,
}

export default function SetupClient() {
  const router = useRouter()
  const [passo, setPasso]     = useState(1)
  const [form, setForm]       = useState<FormData>(INICIAL)
  const [userId, setUserId]   = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      // Verificar se já fez setup
      const { data } = await supabase
        .from('usuarios_flow').select('setup_concluido, nome')
        .eq('user_id', user.id).single()
      if (data?.setup_concluido) { router.push('/dashboard'); return }
      if (data?.nome) setForm(p => ({ ...p, nome: data.nome }))
    }
    init()
  }, [router])

  function set(key: keyof FormData, val: any) {
    setForm(p => ({ ...p, [key]: val }))
    setErro('')
  }

  function avancar() {
    if (passo === 1) {
      if (!form.nome.trim()) { setErro('Informe seu nome.'); return }
      if (!form.profissao) { setErro('Selecione sua profissão.'); return }
    }
    if (passo === 2) {
      if (!form.renda_conservadora || form.renda_conservadora <= 0) {
        setErro('Informe sua renda mensal média.'); return
      }
    }
    if (passo === 3) {
      if (!form.objetivo) { setErro('Selecione seu objetivo principal.'); return }
      if (form.objetivo_valor <= 0) { setErro('Informe o valor que deseja atingir.'); return }
    }
    setErro('')
    setPasso(p => p + 1)
  }

  async function concluir() {
    if (!form.objetivo) { setErro('Selecione seu objetivo.'); return }
    if (form.objetivo_valor <= 0) { setErro('Informe o valor que deseja atingir.'); return }
    setSalvando(true)

    const mes = new Date().getMonth() + 1
    const ano = new Date().getFullYear()

    // 1. Atualizar perfil do usuário
    await supabase.from('usuarios_flow').update({
      nome: form.nome,
      profissao: form.profissao,
      cidade: form.cidade,
      renda_conservadora: form.renda_conservadora,
      renda_boa: form.renda_boa,
      despesas_estimadas: form.despesas_estimadas,
      reserva_atual: form.reserva_atual,
      objetivo: form.objetivo,
      objetivo_valor: form.objetivo_valor,
      objetivo_meses: form.objetivo_meses,
      setup_concluido: true,
    }).eq('user_id', userId)

    // 2. Configurar reservas automaticamente
    const pctEmergencia  = 10
    const pctMesesFracos = 10
    const pctInvestimento = 5
    const metaEmergencia = form.despesas_estimadas > 0 ? form.despesas_estimadas * 6 : 0

    await supabase.from('reservas_flow').upsert([
      { user_id: userId, tipo: 'emergencia',   percentual: pctEmergencia,  valor_acumulado: form.reserva_atual, meta: metaEmergencia },
      { user_id: userId, tipo: 'meses_fracos', percentual: pctMesesFracos, valor_acumulado: 0, meta: form.renda_conservadora * 3 },
      { user_id: userId, tipo: 'investimento', percentual: pctInvestimento, valor_acumulado: 0, meta: 0 },
    ], { onConflict: 'user_id,tipo', ignoreDuplicates: false })

    // 3. Lançar renda prevista do mês atual
    if (form.renda_conservadora > 0) {
      const { data: existing } = await supabase.from('receitas_flow')
        .select('id').eq('user_id', userId).eq('mes', mes).eq('ano', ano).eq('fonte', 'Renda mensal prevista')
      if (!existing || existing.length === 0) {
        await supabase.from('receitas_flow').insert({
          user_id: userId,
          fonte: 'Renda mensal prevista',
          valor_previsto: form.renda_conservadora,
          valor_recebido: 0,
          status: 'pendente',
          mes, ano,
        })
      }
    }

    // 4. Criar meta principal baseada no objetivo
    if (form.objetivo_valor > 0) {
      const prazo = new Date()
      prazo.setMonth(prazo.getMonth() + form.objetivo_meses)

      const labelObj = OBJETIVOS.find(o => o.valor === form.objetivo)?.label.split(' ').slice(1).join(' ') || 'Objetivo principal'
      await supabase.from('metas_flow').insert({
        user_id: userId,
        nome: labelObj,
        valor_alvo: form.objetivo_valor,
        valor_atual: 0,
        prazo: prazo.toISOString().split('T')[0],
        cor: INDIGO,
        icone: '🎯',
        status: 'ativa',
      })
    }

    router.push('/dashboard')
  }

  // Cálculos da perspectiva (Passo 3)
  const sobra = form.renda_conservadora - form.despesas_estimadas
  const pct10 = form.renda_conservadora * 0.10
  const pct20 = form.renda_conservadora * 0.20
  const pct25 = form.renda_conservadora * 0.25
  const mesesP10 = form.objetivo_valor > 0 && pct10 > 0 ? Math.ceil(form.objetivo_valor / pct10) : 0
  const mesesP20 = form.objetivo_valor > 0 && pct20 > 0 ? Math.ceil(form.objetivo_valor / pct20) : 0
  const valorEmMeses = sobra > 0 ? sobra * form.objetivo_meses : 0
  const metaCalculada = form.objetivo_valor > 0 && form.objetivo_meses > 0
    ? Math.ceil(form.objetivo_valor / form.objetivo_meses)
    : 0

  const inp = (style?: any) => ({
    width: '100%', background: '#07080F',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '11px 14px',
    fontSize: 15, color: '#fff', outline: 'none',
    boxSizing: 'border-box' as const,
    ...style,
  })

  const label = (txt: string) => (
    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>{txt}</label>
  )

  const fg = (children: React.ReactNode, mb = 16) => (
    <div style={{ marginBottom: mb }}>{children}</div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#07080F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 600 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, fontWeight: 700, color: '#fff' }}>Z</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Vamos configurar seu Zynflow</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>3 passos rápidos para personalizar sua experiência</p>
        </div>

        {/* Indicador de passos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
          {[1, 2, 3].map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: passo > p ? INDIGO : passo === p ? INDIGO : 'rgba(255,255,255,0.07)',
                  border: `2px solid ${passo >= p ? INDIGO : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600,
                  color: passo >= p ? '#fff' : '#4B5563',
                }}>
                  {passo > p ? '✓' : p}
                </div>
                <span style={{ fontSize: 11, color: passo >= p ? INDIGO2 : '#4B5563', marginTop: 6, textAlign: 'center' as const }}>
                  {p === 1 ? 'Você' : p === 2 ? 'Finanças' : 'Perspectiva'}
                </span>
              </div>
              {i < 2 && <div style={{ height: 2, flex: 1, background: passo > p ? INDIGO : 'rgba(255,255,255,0.07)', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 36px' }}>

          {/* ── PASSO 1 ── */}
          {passo === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>👋 Quem é você?</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>Vamos personalizar o Zynflow para o seu perfil.</p>

              {fg(<>{label('Seu nome completo *')}<input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="João Silva" style={inp()} /></>)}

              {fg(<>
                {label('Sua profissão / área de atuação *')}
                <select value={form.profissao} onChange={e => set('profissao', e.target.value)} style={inp()}>
                  <option value="">Selecione...</option>
                  {PROFISSOES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </>)}

              {fg(<>{label('Cidade (opcional)')}<input value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Ex: São Paulo, SP" style={inp()} /></>, 0)}
            </>
          )}

          {/* ── PASSO 2 ── */}
          {passo === 2 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>💰 Sua situação financeira</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>Seja honesto — esses dados ficam só com você.</p>

              <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: INDIGO2 }}>
                💡 Use o valor <strong>conservador</strong> — o menor que você espera ganhar. Planejar com o valor máximo é uma das armadilhas do autônomo.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {fg(<>
                  {label('Renda mensal média (valor conservador) *')}
                  <input type="number" value={form.renda_conservadora || ''} onChange={e => set('renda_conservadora', parseFloat(e.target.value) || 0)} placeholder="Ex: 4000" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>O menor que você espera ganhar</span>
                </>)}

                {fg(<>
                  {label('Renda num mês bom (máxima esperada)')}
                  <input type="number" value={form.renda_boa || ''} onChange={e => set('renda_boa', parseFloat(e.target.value) || 0)} placeholder="Ex: 8000" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>Quando os projetos estão em alta</span>
                </>)}

                {fg(<>
                  {label('Despesas fixas mensais estimadas')}
                  <input type="number" value={form.despesas_estimadas || ''} onChange={e => set('despesas_estimadas', parseFloat(e.target.value) || 0)} placeholder="Ex: 2500" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>Aluguel, saúde, internet, etc.</span>
                </>)}

                {fg(<>
                  {label('Reserva de emergência atual')}
                  <input type="number" value={form.reserva_atual || ''} onChange={e => set('reserva_atual', parseFloat(e.target.value) || 0)} placeholder="Ex: 1000" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>Quanto já tem guardado hoje</span>
                </>)}
              </div>

              {/* Card de análise automática */}
              {form.renda_conservadora > 0 && form.despesas_estimadas > 0 && (
                <div style={{ background: sobra > 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${sobra > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, padding: '16px 20px', marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sobra > 0 ? '#4ade80' : '#FCA5A5', marginBottom: 10 }}>
                    {sobra > 0 ? '✅ Análise da sua situação' : '⚠️ Atenção — gastos maiores que renda'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Sobra por mês</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: sobra >= 0 ? '#4ade80' : '#FCA5A5' }}>{fmt(sobra)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Meta reserva emergência</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{fmt(form.despesas_estimadas * 6)}</div>
                    </div>
                    {form.reserva_atual > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>Reserva atual vs meta</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: INDIGO2 }}>
                          {Math.round((form.reserva_atual / (form.despesas_estimadas * 6)) * 100)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PASSO 3 ── */}
          {passo === 3 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🎯 Sua perspectiva</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>O que você quer conquistar com o Zynflow?</p>

              {fg(<>
                {label('Qual seu objetivo principal? *')}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {OBJETIVOS.map(o => (
                    <div key={o.valor} onClick={() => set('objetivo', o.valor)} style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${form.objetivo === o.valor ? INDIGO : 'rgba(255,255,255,0.08)'}`,
                      background: form.objetivo === o.valor ? 'rgba(79,70,229,0.12)' : 'rgba(255,255,255,0.02)',
                      fontSize: 14, color: form.objetivo === o.valor ? '#fff' : '#9CA3AF',
                      transition: 'all 0.15s',
                    }}>
                      {o.label}
                    </div>
                  ))}
                </div>
              </>, 20)}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {fg(<>
                  {label('Quanto quer ter guardado? (R$) *')}
                  <input type="number" value={form.objetivo_valor || ''} onChange={e => set('objetivo_valor', parseFloat(e.target.value) || 0)} placeholder="Ex: 20000" style={inp()} />
                </>)}

                {fg(<>
                  {label('Em quantos meses?')}
                  <select value={form.objetivo_meses} onChange={e => set('objetivo_meses', parseInt(e.target.value))} style={inp()}>
                    {[3,6,9,12,18,24,36,48,60].map(m => <option key={m} value={m}>{m} meses {m >= 12 ? `(${m/12} ano${m > 12 ? 's' : ''})` : ''}</option>)}
                  </select>
                </>)}
              </div>

              {/* Card de perspectiva calculada */}
              {form.objetivo_valor > 0 && form.renda_conservadora > 0 && (
                <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 14, padding: '20px 22px', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INDIGO2, marginBottom: 16 }}>📊 Sua perspectiva financeira</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Guardando 10%/mês</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{fmt(pct10)}/mês</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Atinge em <strong style={{ color: INDIGO2 }}>{mesesP10} meses</strong></div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Guardando 20%/mês</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{fmt(pct20)}/mês</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Atinge em <strong style={{ color: INDIGO2 }}>{mesesP20} meses</strong></div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(79,70,229,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, color: INDIGO2, marginBottom: 4 }}>Para atingir {fmt(form.objetivo_valor)} em {form.objetivo_meses} meses:</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                      {fmt(metaCalculada)}<span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280' }}>/mês</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      = {form.renda_conservadora > 0 ? Math.round((metaCalculada / form.renda_conservadora) * 100) : 0}% da sua renda conservadora
                    </div>
                  </div>

                  {valorEmMeses > 0 && (
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 12, textAlign: 'center' as const }}>
                      Com a sobra atual de {fmt(sobra)}/mês, em {form.objetivo_meses} meses você terá até <strong style={{ color: '#4ade80' }}>{fmt(valorEmMeses)}</strong>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Erro */}
          {erro && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginTop: 16 }}>{erro}</div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {passo > 1 && (
              <button onClick={() => setPasso(p => p - 1)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 13, fontSize: 15, color: '#9CA3AF', cursor: 'pointer' }}>
                ← Voltar
              </button>
            )}
            {passo < 3 ? (
              <button onClick={avancar} style={{ flex: 2, background: INDIGO, border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                Continuar →
              </button>
            ) : (
              <button onClick={concluir} disabled={salvando} style={{ flex: 2, background: INDIGO, border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 600, color: '#fff', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Configurando...' : '🚀 Começar meu controle financeiro'}
              </button>
            )}
          </div>

          {passo === 1 && (
            <p style={{ textAlign: 'center' as const, fontSize: 12, color: '#374151', marginTop: 16 }}>
              Leva menos de 2 minutos · Pode editar depois
            </p>
          )}
        </div>
      </div>
    </div>
  )
}