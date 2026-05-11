'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GREEN = '#10b981'
const GREEN2 = '#6ee7b7'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PROFISSOES_PF = [
  // Tecnologia
  'Desenvolvedor / Programador',
  'Analista de Sistemas',
  'Engenheiro de Software',
  'Cientista de Dados / BI',
  'UX/UI Designer',
  'Suporte de TI / Infraestrutura',
  'Product Manager / PO',
  'QA / Tester',
  // Saúde
  'Médico',
  'Enfermeiro',
  'Fisioterapeuta',
  'Farmacêutico',
  'Psicólogo',
  'Nutricionista',
  'Odontólogo',
  'Técnico de Enfermagem',
  'Biomédico / Laboratorista',
  // Educação
  'Professor / Docente',
  'Coordenador Pedagógico',
  'Instrutor / Facilitador',
  'Psicopedagogo',
  // Finanças e Jurídico
  'Advogado',
  'Contador / Analista Contábil',
  'Analista Financeiro',
  'Economista',
  'Auditor',
  'Analista de Crédito',
  'Compliance / Jurídico',
  // Engenharia e Arquitetura
  'Engenheiro Civil',
  'Engenheiro Elétrico / Eletrônico',
  'Engenheiro Mecânico',
  'Engenheiro de Produção',
  'Arquiteto / Urbanista',
  'Engenheiro Químico / Ambiental',
  // Administração e Gestão
  'Administrador',
  'Gestor de Projetos',
  'Analista Administrativo',
  'Assistente Administrativo',
  'Secretário / Assistente Executivo',
  'Gestor de RH / Recrutador',
  'Analista de RH',
  // Vendas e Comercial
  'Vendedor / Representante Comercial',
  'Analista de Vendas',
  'Gerente Comercial',
  'Executivo de Contas / Key Account',
  'SDR / Pré-vendas',
  // Marketing e Comunicação
  'Analista de Marketing',
  'Social Media',
  'Designer Gráfico',
  'Redator / Copywriter',
  'Relações Públicas',
  'Jornalista',
  'Analista de SEO / Performance',
  // Logística e Operações
  'Analista de Logística',
  'Supervisor de Operações',
  'Analista de Supply Chain',
  'Comprador / Analista de Compras',
  // Indústria e Qualidade
  'Técnico Industrial',
  'Analista de Qualidade',
  'Supervisor de Produção',
  'Técnico de Segurança do Trabalho',
  // Serviços Públicos
  'Servidor Público Federal',
  'Servidor Público Estadual',
  'Servidor Público Municipal',
  'Militar / Policial / Bombeiro',
  // Outros
  'Assistente Social',
  'Terapeuta Ocupacional',
  'Gestor Ambiental',
  'Biólogo / Geólogo',
  'Outro',
]

const OBJETIVOS = [
  { valor: 'sair_vermelho',  label: '🔴 Sair do vermelho e organizar as contas' },
  { valor: 'reserva',        label: '🛡️ Construir minha reserva de emergência' },
  { valor: 'guardar_algo',   label: '🎯 Guardar dinheiro para um objetivo específico' },
  { valor: 'investir',       label: '📈 Começar a investir com consistência' },
  { valor: 'aposentadoria',  label: '🏖️ Planejar minha aposentadoria' },
  { valor: 'controle',       label: '📊 Ter controle total do meu dinheiro' },
]

interface FormData {
  nome: string
  profissao: string
  cidade: string
  salario_liquido: number
  beneficios: number
  despesas_estimadas: number
  reserva_atual: number
  objetivo: string
  objetivo_valor: number
  objetivo_meses: number
}

const INICIAL: FormData = {
  nome: '', profissao: '', cidade: '',
  salario_liquido: 0, beneficios: 0,
  despesas_estimadas: 0, reserva_atual: 0,
  objetivo: '', objetivo_valor: 0, objetivo_meses: 12,
}

export default function SetupPFClient() {
  const router = useRouter()
  const [passo, setPasso]       = useState(1)
  const [form, setForm]         = useState<FormData>(INICIAL)
  const [userId, setUserId]     = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('usuarios_flow')
        .select('setup_concluido, nome, perfil')
        .eq('user_id', user.id)
        .single()

      if (data?.setup_concluido) { router.push('/pf/dashboard'); return }
      if (data?.perfil !== 'pf') { router.push('/setup'); return }
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
      if (!form.profissao) { setErro('Selecione sua área de atuação.'); return }
    }
    if (passo === 2) {
      if (!form.salario_liquido || form.salario_liquido <= 0) {
        setErro('Informe seu salário líquido.'); return
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
    const rendaTotal = form.salario_liquido + form.beneficios

    // 1. Atualizar perfil
    await supabase.from('usuarios_flow').update({
      nome:               form.nome,
      profissao:          form.profissao,
      cidade:             form.cidade,
      renda_conservadora: rendaTotal,
      renda_boa:          rendaTotal,
      despesas_estimadas: form.despesas_estimadas,
      reserva_atual:      form.reserva_atual,
      objetivo:           form.objetivo,
      objetivo_valor:     form.objetivo_valor,
      objetivo_meses:     form.objetivo_meses,
      setup_concluido:    true,
    }).eq('user_id', userId)

    // 2. Configurar reservas
    const metaEmergencia = form.despesas_estimadas > 0 ? form.despesas_estimadas * 6 : rendaTotal * 3

    await supabase.from('reservas_flow').upsert([
      { user_id: userId, tipo: 'emergencia',   percentual: 10, valor_acumulado: form.reserva_atual, meta: metaEmergencia },
      { user_id: userId, tipo: 'investimento',  percentual: 10, valor_acumulado: 0, meta: 0 },
    ], { onConflict: 'user_id,tipo', ignoreDuplicates: false })

    // 3. Lançar salário do mês atual
    if (rendaTotal > 0) {
      const { data: existing } = await supabase.from('receitas_flow')
        .select('id').eq('user_id', userId).eq('mes', mes).eq('ano', ano).eq('fonte', 'Salário')
      if (!existing || existing.length === 0) {
        await supabase.from('receitas_flow').insert({
          user_id: userId,
          fonte: 'Salário',
          valor_previsto: rendaTotal,
          valor_recebido: 0,
          status: 'pendente',
          mes, ano,
        })
      }
    }

    // 4. Criar meta principal
    if (form.objetivo_valor > 0) {
      const prazo = new Date()
      prazo.setMonth(prazo.getMonth() + form.objetivo_meses)
      const labelObj = OBJETIVOS.find(o => o.valor === form.objetivo)?.label.split(' ').slice(1).join(' ') || 'Objetivo principal'

      await supabase.from('metas_flow').insert({
        user_id:     userId,
        nome:        labelObj,
        valor_alvo:  form.objetivo_valor,
        valor_atual: 0,
        prazo:       prazo.toISOString().split('T')[0],
        cor:         GREEN,
        icone:       '🎯',
        status:      'ativa',
      })
    }

    router.push('/pf/dashboard')
  }

  // Cálculos
  const rendaTotal    = form.salario_liquido + form.beneficios
  const sobra         = rendaTotal - form.despesas_estimadas
  const pctComprometido = rendaTotal > 0 ? Math.round((form.despesas_estimadas / rendaTotal) * 100) : 0
  const metaCalculada = form.objetivo_valor > 0 && form.objetivo_meses > 0
    ? Math.ceil(form.objetivo_valor / form.objetivo_meses) : 0
  const mesesP10 = form.objetivo_valor > 0 && rendaTotal > 0 ? Math.ceil(form.objetivo_valor / (rendaTotal * 0.10)) : 0
  const mesesP20 = form.objetivo_valor > 0 && rendaTotal > 0 ? Math.ceil(form.objetivo_valor / (rendaTotal * 0.20)) : 0

  const inp = (style?: any): React.CSSProperties => ({
    width: '100%', background: '#07080F',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '11px 14px',
    fontSize: 15, color: '#fff', outline: 'none',
    boxSizing: 'border-box',
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
          <div style={{ width: 48, height: 48, borderRadius: 12, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, fontWeight: 700, color: '#fff' }}>Z</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Vamos configurar seu Zynflow PF</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>3 passos rápidos para personalizar sua experiência</p>
        </div>

        {/* Indicador de passos */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
          {[1, 2, 3].map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: passo >= p ? GREEN : 'rgba(255,255,255,0.07)',
                  border: `2px solid ${passo >= p ? GREEN : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600,
                  color: passo >= p ? '#fff' : '#4B5563',
                }}>
                  {passo > p ? '✓' : p}
                </div>
                <span style={{ fontSize: 11, color: passo >= p ? GREEN2 : '#4B5563', marginTop: 6, textAlign: 'center' }}>
                  {p === 1 ? 'Você' : p === 2 ? 'Finanças' : 'Objetivos'}
                </span>
              </div>
              {i < 2 && <div style={{ height: 2, flex: 1, background: passo > p ? GREEN : 'rgba(255,255,255,0.07)', marginBottom: 20 }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 36px' }}>

          {/* ── PASSO 1 ── */}
          {passo === 1 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>👋 Quem é você?</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>Vamos personalizar o Zynflow PF para o seu perfil.</p>

              {fg(<>{label('Seu nome completo *')}<input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="João Silva" style={inp()} /></>)}

              {fg(<>
                {label('Sua área de atuação *')}
                <select value={form.profissao} onChange={e => set('profissao', e.target.value)} style={inp()}>
                  <option value="">Selecione...</option>
                  <optgroup label="── Tecnologia">
                    {['Desenvolvedor / Programador','Analista de Sistemas','Engenheiro de Software','Cientista de Dados / BI','UX/UI Designer','Suporte de TI / Infraestrutura','Product Manager / PO','QA / Tester'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Saúde">
                    {['Médico','Enfermeiro','Fisioterapeuta','Farmacêutico','Psicólogo','Nutricionista','Odontólogo','Técnico de Enfermagem','Biomédico / Laboratorista'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Educação">
                    {['Professor / Docente','Coordenador Pedagógico','Instrutor / Facilitador','Psicopedagogo'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Finanças e Jurídico">
                    {['Advogado','Contador / Analista Contábil','Analista Financeiro','Economista','Auditor','Analista de Crédito','Compliance / Jurídico'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Engenharia e Arquitetura">
                    {['Engenheiro Civil','Engenheiro Elétrico / Eletrônico','Engenheiro Mecânico','Engenheiro de Produção','Arquiteto / Urbanista','Engenheiro Químico / Ambiental'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Administração e Gestão">
                    {['Administrador','Gestor de Projetos','Analista Administrativo','Assistente Administrativo','Secretário / Assistente Executivo','Gestor de RH / Recrutador','Analista de RH'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Vendas e Comercial">
                    {['Vendedor / Representante Comercial','Analista de Vendas','Gerente Comercial','Executivo de Contas / Key Account','SDR / Pré-vendas'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Marketing e Comunicação">
                    {['Analista de Marketing','Social Media','Designer Gráfico','Redator / Copywriter','Relações Públicas','Jornalista','Analista de SEO / Performance'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Logística e Operações">
                    {['Analista de Logística','Supervisor de Operações','Analista de Supply Chain','Comprador / Analista de Compras'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Indústria e Qualidade">
                    {['Técnico Industrial','Analista de Qualidade','Supervisor de Produção','Técnico de Segurança do Trabalho'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Serviços Públicos">
                    {['Servidor Público Federal','Servidor Público Estadual','Servidor Público Municipal','Militar / Policial / Bombeiro'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="── Outros">
                    {['Assistente Social','Terapeuta Ocupacional','Gestor Ambiental','Biólogo / Geólogo','Outro'].map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
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

              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: GREEN2 }}>
                💡 Use sempre o <strong>salário líquido</strong> — o valor que cai na sua conta após descontos de INSS, IR e benefícios.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {fg(<>
                  {label('Salário líquido mensal *')}
                  <input type="number" value={form.salario_liquido || ''} onChange={e => set('salario_liquido', parseFloat(e.target.value) || 0)} placeholder="Ex: 5000" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>O que cai na conta todo mês</span>
                </>)}

                {fg(<>
                  {label('Benefícios mensais (VR, VA, etc)')}
                  <input type="number" value={form.beneficios || ''} onChange={e => set('beneficios', parseFloat(e.target.value) || 0)} placeholder="Ex: 600" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>Vale refeição, alimentação, etc.</span>
                </>)}

                {fg(<>
                  {label('Despesas fixas mensais estimadas')}
                  <input type="number" value={form.despesas_estimadas || ''} onChange={e => set('despesas_estimadas', parseFloat(e.target.value) || 0)} placeholder="Ex: 3000" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>Aluguel, saúde, internet, etc.</span>
                </>)}

                {fg(<>
                  {label('Reserva de emergência atual')}
                  <input type="number" value={form.reserva_atual || ''} onChange={e => set('reserva_atual', parseFloat(e.target.value) || 0)} placeholder="Ex: 2000" style={inp()} />
                  <span style={{ fontSize: 12, color: '#4B5563', marginTop: 4, display: 'block' }}>Quanto já tem guardado hoje</span>
                </>)}
              </div>

              {/* Card de análise */}
              {form.salario_liquido > 0 && form.despesas_estimadas > 0 && (
                <div style={{ background: pctComprometido <= 70 ? 'rgba(34,197,94,0.06)' : pctComprometido <= 90 ? 'rgba(234,179,8,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${pctComprometido <= 70 ? 'rgba(34,197,94,0.2)' : pctComprometido <= 90 ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, padding: '16px 20px', marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: pctComprometido <= 70 ? '#4ade80' : pctComprometido <= 90 ? '#fbbf24' : '#FCA5A5', marginBottom: 10 }}>
                    {pctComprometido <= 70 ? '✅ Situação saudável' : pctComprometido <= 90 ? '⚠️ Atenção com os gastos' : '🚨 Gastos muito altos'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Renda total</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{fmt(rendaTotal)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>% comprometido</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: pctComprometido <= 70 ? '#4ade80' : pctComprometido <= 90 ? '#fbbf24' : '#FCA5A5' }}>{pctComprometido}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Sobra por mês</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: sobra >= 0 ? '#4ade80' : '#FCA5A5' }}>{fmt(sobra)}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PASSO 3 ── */}
          {passo === 3 && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🎯 Seus objetivos</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>O que você quer conquistar com o Zynflow PF?</p>

              {fg(<>
                {label('Qual seu objetivo principal? *')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {OBJETIVOS.map(o => (
                    <div key={o.valor} onClick={() => set('objetivo', o.valor)} style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${form.objetivo === o.valor ? GREEN : 'rgba(255,255,255,0.08)'}`,
                      background: form.objetivo === o.valor ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
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
                  <input type="number" value={form.objetivo_valor || ''} onChange={e => set('objetivo_valor', parseFloat(e.target.value) || 0)} placeholder="Ex: 30000" style={inp()} />
                </>)}
                {fg(<>
                  {label('Em quantos meses?')}
                  <select value={form.objetivo_meses} onChange={e => set('objetivo_meses', parseInt(e.target.value))} style={inp()}>
                    {[3,6,9,12,18,24,36,48,60].map(m => <option key={m} value={m}>{m} meses {m >= 12 ? `(${m/12} ano${m > 12 ? 's' : ''})` : ''}</option>)}
                  </select>
                </>)}
              </div>

              {form.objetivo_valor > 0 && rendaTotal > 0 && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '20px 22px', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: GREEN2, marginBottom: 16 }}>📊 Sua perspectiva financeira</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Guardando 10%/mês</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{fmt(rendaTotal * 0.10)}/mês</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Atinge em <strong style={{ color: GREEN2 }}>{mesesP10} meses</strong></div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Guardando 20%/mês</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{fmt(rendaTotal * 0.20)}/mês</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Atinge em <strong style={{ color: GREEN2 }}>{mesesP20} meses</strong></div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, color: GREEN2, marginBottom: 4 }}>Para atingir {fmt(form.objetivo_valor)} em {form.objetivo_meses} meses:</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                      {fmt(metaCalculada)}<span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280' }}>/mês</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                      = {rendaTotal > 0 ? Math.round((metaCalculada / rendaTotal) * 100) : 0}% da sua renda
                    </div>
                  </div>
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
              <button onClick={avancar} style={{ flex: 2, background: GREEN, border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                Continuar →
              </button>
            ) : (
              <button onClick={concluir} disabled={salvando} style={{ flex: 2, background: GREEN, border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 600, color: '#fff', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Configurando...' : '💼 Começar meu controle financeiro'}
              </button>
            )}
          </div>

          {passo === 1 && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#374151', marginTop: 16 }}>
              Leva menos de 2 minutos · Pode editar depois
            </p>
          )}
        </div>
      </div>
    </div>
  )
}