'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

const GREEN  = '#10b981'
const GREEN2 = '#6ee7b7'
const AMBER  = '#f59e0b'
const VERM   = '#ef4444'
const INDIGO = '#4F46E5'

const ANOS = [2023, 2024, 2025, 2026]
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Tabela progressiva IRPF 2025/2026
const TABELA_IR = [
  { ate: 2259.20,  aliquota: 0,    deducao: 0 },
  { ate: 2826.65,  aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05,  aliquota: 0.15,  deducao: 381.44 },
  { ate: 4664.68,  aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
]

const DEDUCAO_DEPENDENTE = 189.59
const DEDUCAO_MAX_EDUCACAO = 3561.50

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtPct(v: number) {
  return `${v.toFixed(1)}%`
}

function calcularIR(baseCalculo: number): number {
  if (baseCalculo <= 0) return 0
  const faixa = TABELA_IR.find(f => baseCalculo <= f.ate)
  if (!faixa) return 0
  return Math.max(0, baseCalculo * faixa.aliquota - faixa.deducao)
}

interface DadosIRPF {
  salario_anual: number
  decimo_terceiro: number
  ferias: number
  plr: number
  bonus: number
  outros_rendimentos: number
  inss_anual: number
  previdencia_privada: number
  dependentes: number
  educacao: number
  saude: number
  pensao_alimenticia: number
  outras_deducoes: number
  ir_retido_fonte: number
}

const INICIAL: DadosIRPF = {
  salario_anual: 0, decimo_terceiro: 0, ferias: 0,
  plr: 0, bonus: 0, outros_rendimentos: 0,
  inss_anual: 0, previdencia_privada: 0, dependentes: 0,
  educacao: 0, saude: 0, pensao_alimenticia: 0,
  outras_deducoes: 0, ir_retido_fonte: 0,
}

interface OperacaoIR {
  ticker: string; tipo: string; quantidade: number
  preco_unitario: number; valor_total: number; data: string
}

function calcularIRInvestimentos(operacoes: OperacaoIR[], ano: number) {
  // Agrupa vendas por mês
  const meses: { mes: number; totalVendas: number; lucro: number; isento: boolean; darf: number }[] = []

  for (let mes = 1; mes <= 12; mes++) {
    const posAntes: Record<string, { qtd: number; custoTotal: number }> = {}
    const sorted = [...operacoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

    for (const op of sorted) {
      const d = new Date(op.data)
      if (d.getFullYear() > ano || (d.getFullYear() === ano && d.getMonth() + 1 >= mes)) break
      if (!posAntes[op.ticker]) posAntes[op.ticker] = { qtd: 0, custoTotal: 0 }
      const p = posAntes[op.ticker]
      if (op.tipo === 'compra') { p.custoTotal += op.quantidade * op.preco_unitario; p.qtd += op.quantidade }
      else { const cm = p.qtd > 0 ? p.custoTotal / p.qtd : 0; p.custoTotal -= cm * op.quantidade; p.qtd -= op.quantidade; if (p.qtd <= 0) { p.qtd = 0; p.custoTotal = 0 } }
    }

    const vendasMes = sorted.filter(op => {
      const d = new Date(op.data)
      return op.tipo === 'venda' && d.getFullYear() === ano && d.getMonth() + 1 === mes
    })

    const totalVendas = vendasMes.reduce((s, v) => s + v.valor_total, 0)
    const isento = totalVendas < 20000 && totalVendas > 0

    let lucro = 0
    const vendasPorTicker: Record<string, { qtd: number; receita: number }> = {}
    for (const v of vendasMes) {
      if (!vendasPorTicker[v.ticker]) vendasPorTicker[v.ticker] = { qtd: 0, receita: 0 }
      vendasPorTicker[v.ticker].qtd += v.quantidade
      vendasPorTicker[v.ticker].receita += v.valor_total
    }
    for (const [ticker, venda] of Object.entries(vendasPorTicker)) {
      const pos = posAntes[ticker] || { qtd: 0, custoTotal: 0 }
      const cm = pos.qtd > 0 ? pos.custoTotal / pos.qtd : 0
      lucro += venda.receita - cm * venda.qtd
    }

    const darf = !isento && lucro > 0 ? lucro * 0.15 : 0
    if (totalVendas > 0) meses.push({ mes, totalVendas, lucro, isento, darf })
  }

  return meses
}

export default function IRPFPFClient() {
  const [userId, setUserId]     = useState<string | null>(null)
  const [anoSel, setAnoSel]     = useState(new Date().getFullYear())
  const [aba, setAba]           = useState<'rendimentos'|'deducoes'|'resultado'|'investimentos'>('rendimentos')
  const [dados, setDados]       = useState<DadosIRPF>(INICIAL)
  const [operacoes, setOperacoes] = useState<OperacaoIR[]>([])
  const [proventos, setProventos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvoOk, setSalvoOk]   = useState(false)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [irpf, ops, provs] = await Promise.all([
        supabase.from('irpf_flow').select('*').eq('user_id', user.id).eq('ano', anoSel).maybeSingle(),
        supabase.from('operacoes_flow').select('*').eq('user_id', user.id),
        supabase.from('proventos_flow').select('*').eq('user_id', user.id),
      ])

      if (irpf.data) {
        setDados({
          salario_anual:       irpf.data.salario_anual || 0,
          decimo_terceiro:     irpf.data.decimo_terceiro || 0,
          ferias:              irpf.data.ferias || 0,
          plr:                 irpf.data.plr || 0,
          bonus:               irpf.data.bonus || 0,
          outros_rendimentos:  irpf.data.outros_rendimentos || 0,
          inss_anual:          irpf.data.inss_anual || 0,
          previdencia_privada: irpf.data.previdencia_privada || 0,
          dependentes:         irpf.data.dependentes || 0,
          educacao:            irpf.data.educacao || 0,
          saude:               irpf.data.saude || 0,
          pensao_alimenticia:  irpf.data.pensao_alimenticia || 0,
          outras_deducoes:     irpf.data.outras_deducoes || 0,
          ir_retido_fonte:     irpf.data.ir_retido_fonte || 0,
        })
      } else {
        setDados(INICIAL)
      }

      setOperacoes(ops.data || [])
      setProventos(provs.data || [])
      setLoading(false)
    }
    carregar()
  }, [anoSel])

  function set(key: keyof DadosIRPF, val: number) {
    setDados(p => ({ ...p, [key]: val }))
    setSalvoOk(false)
  }

  async function salvar() {
    setSalvando(true)
    await supabase.from('irpf_flow').upsert({
      user_id: userId,
      ano: anoSel,
      ...dados,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'user_id,ano' })
    setSalvando(false)
    setSalvoOk(true)
    setTimeout(() => setSalvoOk(false), 3000)
  }

  // ── Cálculos ──
  const totalRendimentos = dados.salario_anual + dados.decimo_terceiro + dados.ferias + dados.plr + dados.bonus + dados.outros_rendimentos
  const deducaoDependentes = dados.dependentes * DEDUCAO_DEPENDENTE * 12
  const deducaoEducacao = Math.min(dados.educacao, DEDUCAO_MAX_EDUCACAO)
  const totalDeducoes = dados.inss_anual + dados.previdencia_privada + deducaoDependentes + deducaoEducacao + dados.saude + dados.pensao_alimenticia + dados.outras_deducoes
  const baseCalculo = Math.max(0, totalRendimentos - totalDeducoes)
  const irDevido = calcularIR(baseCalculo / 12) * 12
  const irAPagar = Math.max(0, irDevido - dados.ir_retido_fonte)
  const irARestituir = Math.max(0, dados.ir_retido_fonte - irDevido)
  const aliquotaEfetiva = totalRendimentos > 0 ? (irDevido / totalRendimentos) * 100 : 0

  const irInvestimentos = useMemo(() => calcularIRInvestimentos(operacoes, anoSel), [operacoes, anoSel])
  const totalDARF = irInvestimentos.reduce((s, m) => s + m.darf, 0)
  const totalVendasAnual = irInvestimentos.reduce((s, m) => s + m.totalVendas, 0)
  const totalLucroAnual = irInvestimentos.reduce((s, m) => s + m.lucro, 0)

  const proventosAno = proventos.filter(p => new Date(p.data_pagamento).getFullYear() === anoSel)
  const totalProventosAno = proventosAno.reduce((s, p) => s + p.valor_total, 0)
  const totalJCP = proventosAno.filter(p => p.tipo === 'JCP').reduce((s, p) => s + p.valor_total, 0)

  const inp: React.CSSProperties = {
    width: '100%', background: '#07080F',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 14, color: '#fff', outline: 'none',
    boxSizing: 'border-box',
  }

  if (loading) return <div style={{ color: '#6B7280', padding: 40, textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        .irpf-abas { display: flex; gap: 4px; margin-bottom: 20px; background: #0D0F1A; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 4px; }
        .irpf-aba { flex: 1; padding: 8px 0; border: none; background: transparent; color: #6B7280; font-size: 13px; font-weight: 500; border-radius: 7px; cursor: pointer; transition: all 0.15s; }
        .irpf-aba.ativa { background: rgba(16,185,129,0.15); color: #10b981; }
        .irpf-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .irpf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .irpf-label { font-size: 13px; color: #9CA3AF; display: block; margin-bottom: 6px; }
        .irpf-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
        .irpf-kpi { background: #0D0F1A; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 18px; }
        .irpf-section-title { font-size: 15px; font-weight: 600; color: #fff; margin: 0 0 16px; }
        .irpf-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 20px 0; }
        .irpf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .irpf-table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #4B5563; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .irpf-table td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #E5E7EB; }
        .irpf-table tr:last-child td { border-bottom: none; }
        @media (max-width: 768px) {
          .irpf-kpis { grid-template-columns: repeat(2,1fr); }
          .irpf-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>IRPF — Imposto de Renda</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Apuração anual para declaração à Receita Federal.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={salvar} disabled={salvando}
            style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvoOk ? '✓ Salvo!' : salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="irpf-kpis">
        {[
          { label: 'Total de rendimentos', valor: fmt(totalRendimentos), cor: '#fff', sub: 'Tributáveis no ano' },
          { label: 'Total de deduções', valor: fmt(totalDeducoes), cor: GREEN2, sub: `Base: ${fmt(baseCalculo)}` },
          { label: 'IR devido', valor: fmt(irDevido), cor: irDevido > 0 ? AMBER : '#fff', sub: `Alíquota efetiva: ${fmtPct(aliquotaEfetiva)}` },
          { label: irAPagar > 0 ? 'IR a pagar' : 'IR a restituir', valor: fmt(irAPagar > 0 ? irAPagar : irARestituir), cor: irAPagar > 0 ? VERM : GREEN, sub: irAPagar > 0 ? 'Complementar via DARF' : 'Receita devolve' },
        ].map(k => (
          <div key={k.label} className="irpf-kpi">
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.cor }}>{k.valor}</div>
            <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="irpf-abas">
        {([
          { key: 'rendimentos', label: '💰 Rendimentos' },
          { key: 'deducoes',   label: '📉 Deduções' },
          { key: 'resultado',  label: '📊 Resultado' },
          { key: 'investimentos', label: '📈 Investimentos' },
        ] as const).map(a => (
          <button key={a.key} className={`irpf-aba${aba === a.key ? ' ativa' : ''}`} onClick={() => setAba(a.key)}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA RENDIMENTOS ── */}
      {aba === 'rendimentos' && (
        <div className="irpf-card">
          <p className="irpf-section-title">Rendimentos tributáveis — {anoSel}</p>
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: GREEN2 }}>
            💡 Informe os valores <strong>anuais brutos</strong> recebidos em {anoSel}. Esses dados estão no seu informe de rendimentos fornecido pela empresa.
          </div>

          <div className="irpf-row">
            <div>
              <label className="irpf-label">Salário bruto anual (12 meses) *</label>
              <input type="number" min="0" step="any" value={dados.salario_anual || ''} onChange={e => set('salario_anual', parseFloat(e.target.value) || 0)} placeholder="Ex: 72000" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Soma dos salários brutos do ano</span>
            </div>
            <div>
              <label className="irpf-label">13º salário</label>
              <input type="number" min="0" step="any" value={dados.decimo_terceiro || ''} onChange={e => set('decimo_terceiro', parseFloat(e.target.value) || 0)} placeholder="Ex: 6000" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Valor bruto do 13º recebido</span>
            </div>
          </div>

          <div className="irpf-row">
            <div>
              <label className="irpf-label">Férias (1/3 constitucional incluso)</label>
              <input type="number" min="0" step="any" value={dados.ferias || ''} onChange={e => set('ferias', parseFloat(e.target.value) || 0)} placeholder="Ex: 8000" style={inp} />
            </div>
            <div>
              <label className="irpf-label">PLR — Participação nos Lucros</label>
              <input type="number" min="0" step="any" value={dados.plr || ''} onChange={e => set('plr', parseFloat(e.target.value) || 0)} placeholder="Ex: 5000" style={inp} />
            </div>
          </div>

          <div className="irpf-row">
            <div>
              <label className="irpf-label">Bônus / hora extra</label>
              <input type="number" min="0" step="any" value={dados.bonus || ''} onChange={e => set('bonus', parseFloat(e.target.value) || 0)} placeholder="Ex: 3000" style={inp} />
            </div>
            <div>
              <label className="irpf-label">Outros rendimentos tributáveis</label>
              <input type="number" min="0" step="any" value={dados.outros_rendimentos || ''} onChange={e => set('outros_rendimentos', parseFloat(e.target.value) || 0)} placeholder="Ex: aluguéis, freelances" style={inp} />
            </div>
          </div>

          <div className="irpf-divider" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#9CA3AF' }}>Total de rendimentos tributáveis</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{fmt(totalRendimentos)}</span>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="irpf-label">IR retido na fonte (total do ano)</label>
            <input type="number" min="0" step="any" value={dados.ir_retido_fonte || ''} onChange={e => set('ir_retido_fonte', parseFloat(e.target.value) || 0)} placeholder="Ex: 8400" style={{ ...inp, maxWidth: 300 }} />
            <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Valor total descontado no contracheque ao longo do ano</span>
          </div>
        </div>
      )}

      {/* ── ABA DEDUÇÕES ── */}
      {aba === 'deducoes' && (
        <div className="irpf-card">
          <p className="irpf-section-title">Deduções — {anoSel}</p>
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: GREEN2 }}>
            💡 Quanto mais deduções você comprovar, menor a base de cálculo e menor o imposto. Guarde todos os recibos e notas fiscais.
          </div>

          <div className="irpf-row">
            <div>
              <label className="irpf-label">INSS descontado no ano</label>
              <input type="number" min="0" step="any" value={dados.inss_anual || ''} onChange={e => set('inss_anual', parseFloat(e.target.value) || 0)} placeholder="Ex: 7920" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Soma dos descontos de INSS do ano — está no informe</span>
            </div>
            <div>
              <label className="irpf-label">Previdência privada (PGBL)</label>
              <input type="number" min="0" step="any" value={dados.previdencia_privada || ''} onChange={e => set('previdencia_privada', parseFloat(e.target.value) || 0)} placeholder="Ex: 4800" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Apenas PGBL — limitado a 12% da renda bruta</span>
            </div>
          </div>

          <div className="irpf-row">
            <div>
              <label className="irpf-label">Número de dependentes</label>
              <input type="number" min="0" max="20" step="1" value={dados.dependentes || ''} onChange={e => set('dependentes', parseInt(e.target.value) || 0)} placeholder="Ex: 2" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Dedução: {fmt(DEDUCAO_DEPENDENTE)}/mês por dependente = {fmt(deducaoDependentes)}/ano</span>
            </div>
            <div>
              <label className="irpf-label">Pensão alimentícia judicial</label>
              <input type="number" min="0" step="any" value={dados.pensao_alimenticia || ''} onChange={e => set('pensao_alimenticia', parseFloat(e.target.value) || 0)} placeholder="Ex: 12000" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Apenas pensão por ordem judicial — dedução ilimitada</span>
            </div>
          </div>

          <div className="irpf-row">
            <div>
              <label className="irpf-label">Despesas médicas e de saúde</label>
              <input type="number" min="0" step="any" value={dados.saude || ''} onChange={e => set('saude', parseFloat(e.target.value) || 0)} placeholder="Ex: 6000" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Sem limite — médicos, dentistas, plano de saúde, hospitais</span>
            </div>
            <div>
              <label className="irpf-label">Despesas com educação</label>
              <input type="number" min="0" step="any" value={dados.educacao || ''} onChange={e => set('educacao', parseFloat(e.target.value) || 0)} placeholder="Ex: 3500" style={inp} />
              <span style={{ fontSize: 11, color: '#4B5563', marginTop: 4, display: 'block' }}>Limite: {fmt(DEDUCAO_MAX_EDUCACAO)}/ano por pessoa — escolas, faculdades</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="irpf-label">Outras deduções</label>
            <input type="number" min="0" step="any" value={dados.outras_deducoes || ''} onChange={e => set('outras_deducoes', parseFloat(e.target.value) || 0)} placeholder="Ex: livro-caixa, doações incentivadas" style={{ ...inp, maxWidth: 300 }} />
          </div>

          <div className="irpf-divider" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'INSS', valor: dados.inss_anual },
              { label: 'Previdência privada (PGBL)', valor: dados.previdencia_privada },
              { label: `Dependentes (${dados.dependentes}x)`, valor: deducaoDependentes },
              { label: `Educação (limite ${fmt(DEDUCAO_MAX_EDUCACAO)})`, valor: deducaoEducacao },
              { label: 'Saúde', valor: dados.saude },
              { label: 'Pensão alimentícia', valor: dados.pensao_alimenticia },
              { label: 'Outras deduções', valor: dados.outras_deducoes },
            ].filter(d => d.valor > 0).map(d => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#9CA3AF' }}>{d.label}</span>
                <span style={{ color: GREEN2 }}>- {fmt(d.valor)}</span>
              </div>
            ))}
            <div className="irpf-divider" style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#9CA3AF' }}>Total de deduções</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{fmt(totalDeducoes)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#9CA3AF' }}>Base de cálculo</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{fmt(baseCalculo)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA RESULTADO ── */}
      {aba === 'resultado' && (
        <div>
          {/* Card situação */}
          <div style={{ background: irAPagar > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${irAPagar > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 14, padding: '20px 24px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>{irAPagar > 0 ? '🔴 Imposto a pagar' : '🟢 Imposto a restituir'}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: irAPagar > 0 ? VERM : GREEN }}>{fmt(irAPagar > 0 ? irAPagar : irARestituir)}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Alíquota efetiva: {fmtPct(aliquotaEfetiva)}</div>
            </div>
            {irAPagar > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Código DARF</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>6015</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Vence em abril/{anoSel + 1}</div>
              </div>
            )}
          </div>

          {/* Tabela progressiva */}
          <div className="irpf-card">
            <p className="irpf-section-title">Tabela progressiva — base mensal</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="irpf-table">
                <thead>
                  <tr>
                    <th>Faixa de renda mensal</th>
                    <th style={{ textAlign: 'right' }}>Alíquota</th>
                    <th style={{ textAlign: 'right' }}>Dedução</th>
                    <th>Sua situação</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { faixa: 'Até R$ 2.259,20', aliq: 'Isento', ded: '—', ate: 2259.20 },
                    { faixa: 'R$ 2.259,21 a R$ 2.826,65', aliq: '7,5%', ded: 'R$ 169,44', ate: 2826.65 },
                    { faixa: 'R$ 2.826,66 a R$ 3.751,05', aliq: '15%', ded: 'R$ 381,44', ate: 3751.05 },
                    { faixa: 'R$ 3.751,06 a R$ 4.664,68', aliq: '22,5%', ded: 'R$ 662,77', ate: 4664.68 },
                    { faixa: 'Acima de R$ 4.664,68', aliq: '27,5%', ded: 'R$ 896,00', ate: Infinity },
                  ].map((f, i) => {
                    const rendaMensal = baseCalculo / 12
                    const nessa = i === 0 ? rendaMensal <= f.ate : rendaMensal > [0, 2259.20, 2826.65, 3751.05, 4664.68][i] && rendaMensal <= f.ate
                    return (
                      <tr key={i} style={{ background: nessa ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                        <td>{f.faixa}</td>
                        <td style={{ textAlign: 'right', color: f.aliq === 'Isento' ? GREEN : AMBER }}>{f.aliq}</td>
                        <td style={{ textAlign: 'right' }}>{f.ded}</td>
                        <td>{nessa ? <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>← você está aqui</span> : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo para declaração */}
          <div className="irpf-card">
            <p className="irpf-section-title">📋 Resumo para declaração</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Rendimentos tributáveis recebidos de PJ', valor: fmt(totalRendimentos), campo: 'Ficha: Rendimentos Tributáveis de PJ' },
                { label: 'Deduções totais', valor: fmt(totalDeducoes), campo: 'Ficha: Deduções' },
                { label: 'Base de cálculo', valor: fmt(baseCalculo), campo: 'Calculado automaticamente' },
                { label: 'IR devido', valor: fmt(irDevido), campo: 'Calculado automaticamente' },
                { label: 'IR retido na fonte', valor: fmt(dados.ir_retido_fonte), campo: 'Ficha: Imposto Pago/Retido' },
                { label: irAPagar > 0 ? 'Imposto a pagar (quota única)' : 'Imposto a restituir', valor: fmt(irAPagar > 0 ? irAPagar : irARestituir), campo: irAPagar > 0 ? 'DARF código 0211 — até 30/abr' : 'Receita Federal devolve em até 60 dias' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{r.campo}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: GREEN2 }}>{r.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA INVESTIMENTOS ── */}
      {aba === 'investimentos' && (
        <div>
          {/* KPIs investimentos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total vendido no ano', valor: fmt(totalVendasAnual), cor: '#fff' },
              { label: 'Lucro/Prejuízo anual', valor: fmt(totalLucroAnual), cor: totalLucroAnual >= 0 ? GREEN : VERM },
              { label: 'DARF pago no ano', valor: fmt(totalDARF), cor: totalDARF > 0 ? AMBER : '#fff' },
              { label: 'Proventos recebidos', valor: fmt(totalProventosAno), cor: GREEN2 },
            ].map(k => (
              <div key={k.label} className="irpf-kpi">
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.cor }}>{k.valor}</div>
              </div>
            ))}
          </div>

          {/* Tabela mês a mês */}
          {irInvestimentos.length > 0 && (
            <div className="irpf-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Apuração mensal de IR sobre renda variável</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="irpf-table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th style={{ textAlign: 'right' }}>Total vendas</th>
                      <th style={{ textAlign: 'right' }}>Lucro/Prejuízo</th>
                      <th>Isenção</th>
                      <th style={{ textAlign: 'right' }}>DARF (15%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {irInvestimentos.map(m => (
                      <tr key={m.mes}>
                        <td style={{ color: '#9CA3AF' }}>{MESES[m.mes - 1]}/{anoSel}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(m.totalVendas)}</td>
                        <td style={{ textAlign: 'right', color: m.lucro >= 0 ? GREEN : VERM, fontWeight: 600 }}>{fmt(m.lucro)}</td>
                        <td>
                          {m.isento
                            ? <span style={{ fontSize: 11, color: GREEN }}>✅ Isento (&lt; R$20k)</span>
                            : <span style={{ fontSize: 11, color: AMBER }}>⚠️ Tributável</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: m.darf > 0 ? VERM : '#6B7280' }}>
                          {m.darf > 0 ? fmt(m.darf) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280', borderTop: '1px solid rgba(255,255,255,0.07)' }}>Total</td>
                      <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#fff', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{fmt(totalVendasAnual)}</td>
                      <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: totalLucroAnual >= 0 ? GREEN : VERM, borderTop: '1px solid rgba(255,255,255,0.07)' }}>{fmt(totalLucroAnual)}</td>
                      <td style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}></td>
                      <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: totalDARF > 0 ? VERM : '#6B7280', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{fmt(totalDARF)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {irInvestimentos.length === 0 && (
            <div className="irpf-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
              <p style={{ color: '#6B7280', fontSize: 14 }}>Nenhuma venda registrada em {anoSel}. Registre suas operações na aba Investimentos.</p>
            </div>
          )}

          {/* Proventos */}
          {proventosAno.length > 0 && (
            <div className="irpf-card" style={{ marginTop: 16 }}>
              <p className="irpf-section-title">Proventos recebidos em {anoSel}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Dividendos e Rendimentos FII', valor: totalProventosAno - totalJCP, desc: 'Isento de IR — declarar como rendimentos isentos' },
                  { label: 'JCP recebido', valor: totalJCP, desc: '15% já retido na fonte — declarar como rendimento sujeito à tributação exclusiva' },
                ].filter(p => p.valor > 0).map(p => (
                  <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{p.desc}</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: GREEN2 }}>{fmt(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}