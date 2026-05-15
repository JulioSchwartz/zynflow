'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERDE  = '#22c55e'
const VERM   = '#ef4444'
const AMBER  = '#f59e0b'

const TIPOS_ATIVO = ['Ação', 'FII', 'ETF', 'BDR', 'Renda Fixa', 'Cripto']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtN(v: number, dec = 2) { return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) }
function fmtPct(v: number) { return `${v >= 0 ? '+' : ''}${fmtN(v)}%` }

const inp: React.CSSProperties = {
  width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
  outline: 'none', boxSizing: 'border-box',
}

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Ativo {
  id: string; ticker: string; tipo: string; nome: string | null
}
interface Operacao {
  id: string; ativo_id: string; ticker: string; tipo: string
  quantidade: number; preco_unitario: number; valor_total: number
  data: string; corretora: string | null; obs: string | null
}
interface Provento {
  id: string; ticker: string; tipo: string
  valor_por_cota: number; quantidade: number; valor_total: number
  data_pagamento: string
}

// ─── CÁLCULO CUSTO MÉDIO ─────────────────────────────────────────────────────
function calcularPosicoes(operacoes: Operacao[]) {
  const pos: Record<string, { qtd: number; custoTotal: number; ticker: string; tipo?: string }> = {}

  const sorted = [...operacoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

  for (const op of sorted) {
    if (!pos[op.ticker]) pos[op.ticker] = { qtd: 0, custoTotal: 0, ticker: op.ticker }
    const p = pos[op.ticker]

    if (op.tipo === 'compra') {
      p.custoTotal += op.quantidade * op.preco_unitario
      p.qtd += op.quantidade
    } else if (op.tipo === 'venda') {
      const custoMedio = p.qtd > 0 ? p.custoTotal / p.qtd : 0
      p.custoTotal -= custoMedio * op.quantidade
      p.qtd -= op.quantidade
      if (p.qtd <= 0) { p.qtd = 0; p.custoTotal = 0 }
    }
  }
  return pos
}

// ─── CÁLCULO IR MENSAL ───────────────────────────────────────────────────────
function calcularIRMensal(operacoes: Operacao[], mes: number, ano: number) {
  const posAntes: Record<string, { qtd: number; custoTotal: number }> = {}
  const sorted = [...operacoes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

  // Calcular posição ANTES do mês
  for (const op of sorted) {
    const d = new Date(op.data)
    if (d.getFullYear() > ano || (d.getFullYear() === ano && d.getMonth() + 1 >= mes)) break
    if (!posAntes[op.ticker]) posAntes[op.ticker] = { qtd: 0, custoTotal: 0 }
    const p = posAntes[op.ticker]
    if (op.tipo === 'compra') { p.custoTotal += op.quantidade * op.preco_unitario; p.qtd += op.quantidade }
    else if (op.tipo === 'venda') {
      const cm = p.qtd > 0 ? p.custoTotal / p.qtd : 0
      p.custoTotal -= cm * op.quantidade; p.qtd -= op.quantidade
      if (p.qtd <= 0) { p.qtd = 0; p.custoTotal = 0 }
    }
  }

  // Vendas do mês
  const vendasMes = sorted.filter(op => {
    const d = new Date(op.data)
    return op.tipo === 'venda' && d.getFullYear() === ano && d.getMonth() + 1 === mes
  })

  let totalVendas = 0; let lucroTributavel = 0; let lucroIsento = 0; let prejuizo = 0
  const detalhes: { ticker: string; qtd: number; precoVenda: number; custoMedio: number; lucro: number; isento: boolean }[] = []

  // Agrupa vendas por ticker no mês
  const vendasPorTicker: Record<string, { qtd: number; receita: number }> = {}
  for (const v of vendasMes) {
    if (!vendasPorTicker[v.ticker]) vendasPorTicker[v.ticker] = { qtd: 0, receita: 0 }
    vendasPorTicker[v.ticker].qtd += v.quantidade
    vendasPorTicker[v.ticker].receita += v.valor_total
    totalVendas += v.valor_total
  }

  // Calcula lucro/prejuízo por ticker (isenção: ações com vendas < 20k no mês)
  for (const [ticker, venda] of Object.entries(vendasPorTicker)) {
    const pos = posAntes[ticker] || { qtd: 0, custoTotal: 0 }
    const custoMedio = pos.qtd > 0 ? pos.custoTotal / pos.qtd : 0
    const custoVenda = custoMedio * venda.qtd
    const lucro = venda.receita - custoVenda
    const precoMedioVenda = venda.qtd > 0 ? venda.receita / venda.qtd : 0
    // Isenção: ações com total de vendas no mês < R$20.000
    const isento = totalVendas < 20000
    detalhes.push({ ticker, qtd: venda.qtd, precoVenda: precoMedioVenda, custoMedio, lucro, isento })
    if (lucro < 0) prejuizo += Math.abs(lucro)
    else if (isento) lucroIsento += lucro
    else lucroTributavel += lucro
  }

  const darf = lucroTributavel > 0 ? lucroTributavel * 0.15 : 0

  return { totalVendas, lucroTributavel, lucroIsento, prejuizo, darf, detalhes }
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function InvestimentosClient() {
  const [userId, setUserId]       = useState<string | null>(null)
  const [ativos, setAtivos]       = useState<Ativo[]>([])
  const [operacoes, setOperacoes] = useState<Operacao[]>([])
  const [proventos, setProventos] = useState<Provento[]>([])
  const [loading, setLoading]     = useState(true)
  const [aba, setAba]             = useState<'carteira'|'operacoes'|'proventos'|'ir'>('carteira')

  // Preços manuais (ticker → preço atual)
  const [precos, setPrecos] = useState<Record<string, number>>({})

  // Mês/ano para filtros
  const hoje = new Date()
  const [mesSel, setMesSel] = useState(hoje.getMonth() + 1)
  const [anoSel, setAnoSel] = useState(hoje.getFullYear())

  // ── Modais ──
  const [modalAtivo, setModalAtivo]       = useState(false)
  const [modalOp, setModalOp]             = useState(false)
  const [modalProv, setModalProv]         = useState(false)
  const [modalPreco, setModalPreco]       = useState<string | null>(null)

  const [formAtivo, setFormAtivo]   = useState({ ticker: '', tipo: 'Ação', nome: '' })
  const [formOp, setFormOp]         = useState({ ativo_id: '', ticker: '', tipo: 'compra', quantidade: 0, preco_unitario: 0, data: hoje.toISOString().split('T')[0], corretora: '', obs: '' })
  const [formProv, setFormProv]     = useState({ ticker: '', tipo: 'Dividendo', valor_por_cota: 0, quantidade: 0, data_pagamento: hoje.toISOString().split('T')[0] })
  const [precoTemp, setPrecoTemp]   = useState(0)

  const [salvando, setSalvando] = useState(false)
  const [editandoOp, setEditandoOp]   = useState<Operacao | null>(null)
  const [editandoProv, setEditandoProv] = useState<Provento | null>(null)

  // ── Carregar dados ──
  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [a, o, p] = await Promise.all([
        supabase.from('carteira_flow').select('*').eq('user_id', user.id).order('ticker'),
        supabase.from('operacoes_flow').select('*').eq('user_id', user.id).order('data', { ascending: false }),
        supabase.from('proventos_flow').select('*').eq('user_id', user.id).order('data_pagamento', { ascending: false }),
      ])
      setAtivos(a.data || [])
      setOperacoes(o.data || [])
      setProventos(p.data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  // ── Posições calculadas ──
  const posicoes = useMemo(() => calcularPosicoes(operacoes), [operacoes])

  const carteira = useMemo(() => {
    return ativos
      .map(a => {
        const pos = posicoes[a.ticker] || { qtd: 0, custoTotal: 0 }
        const custoMedio = pos.qtd > 0 ? pos.custoTotal / pos.qtd : 0
        const precoAtual = precos[a.ticker] || 0
        const valorAtual = pos.qtd * precoAtual
        const custoBase  = pos.qtd * custoMedio
        const lucro      = precoAtual > 0 ? valorAtual - custoBase : 0
        const pct        = custoBase > 0 && precoAtual > 0 ? ((valorAtual / custoBase) - 1) * 100 : 0
        return { ...a, qtd: pos.qtd, custoMedio, custoBase, precoAtual, valorAtual, lucro, pct }
      })
      .filter(a => a.qtd > 0)
  }, [ativos, posicoes, precos])

  const patrimonioTotal  = carteira.reduce((s, a) => s + (a.precoAtual > 0 ? a.valorAtual : a.custoBase), 0)
  const custoTotal       = carteira.reduce((s, a) => s + a.custoBase, 0)
  const lucroTotal       = carteira.reduce((s, a) => s + (a.precoAtual > 0 ? a.lucro : 0), 0)
  const pctTotal         = custoTotal > 0 && patrimonioTotal > 0 ? ((patrimonioTotal / custoTotal) - 1) * 100 : 0

  const proventosDoMes = proventos.filter(p => {
    const d = new Date(p.data_pagamento)
    return d.getFullYear() === anoSel && d.getMonth() + 1 === mesSel
  })
  const totalProventosMes = proventosDoMes.reduce((s, p) => s + p.valor_total, 0)

  const ir = useMemo(() => calcularIRMensal(operacoes, mesSel, anoSel), [operacoes, mesSel, anoSel])

  // ── CRUD ──
  async function salvarAtivo() {
    if (!formAtivo.ticker.trim()) return
    setSalvando(true)
    const ticker = formAtivo.ticker.toUpperCase().trim()
    const { data } = await supabase.from('carteira_flow').insert({
      user_id: userId, ticker, tipo: formAtivo.tipo, nome: formAtivo.nome || null,
    }).select().single()
    if (data) setAtivos(prev => [...prev, data].sort((a, b) => a.ticker.localeCompare(b.ticker)))
    setSalvando(false); setModalAtivo(false)
    setFormAtivo({ ticker: '', tipo: 'Ação', nome: '' })
  }

  async function salvarOperacao() {
    if (!formOp.ticker || formOp.quantidade <= 0 || formOp.preco_unitario <= 0) return
    setSalvando(true)

    // Se o ticker não tem ativo cadastrado ainda, cadastra automaticamente
    let ativoId = formOp.ativo_id
    if (!ativoId) {
      const ticker = formOp.ticker.toUpperCase().trim()
      const existe = ativos.find(a => a.ticker === ticker)
      if (existe) {
        ativoId = existe.id
      } else {
        const { data: novoAtivo } = await supabase.from('carteira_flow').insert({
          user_id: userId, ticker, tipo: 'Ação', nome: null,
        }).select().single()
        if (novoAtivo) { setAtivos(prev => [...prev, novoAtivo]); ativoId = novoAtivo.id }
      }
    }

    const payload = {
      user_id: userId, ativo_id: ativoId,
      ticker: formOp.ticker.toUpperCase().trim(),
      tipo: formOp.tipo,
      quantidade: formOp.quantidade,
      preco_unitario: formOp.preco_unitario,
      data: formOp.data,
      corretora: formOp.corretora || null,
      obs: formOp.obs || null,
    }

    if (editandoOp) {
      const { data } = await supabase.from('operacoes_flow').update(payload).eq('id', editandoOp.id).select().single()
      if (data) setOperacoes(prev => prev.map(o => o.id === editandoOp.id ? data : o))
    } else {
      const { data } = await supabase.from('operacoes_flow').insert(payload).select().single()
      if (data) setOperacoes(prev => [data, ...prev])
    }
    setSalvando(false); setModalOp(false); setEditandoOp(null)
    setFormOp({ ativo_id: '', ticker: '', tipo: 'compra', quantidade: 0, preco_unitario: 0, data: hoje.toISOString().split('T')[0], corretora: '', obs: '' })
  }

  async function excluirOperacao(id: string) {
    if (!confirm('Excluir esta operação?')) return
    await supabase.from('operacoes_flow').delete().eq('id', id)
    setOperacoes(prev => prev.filter(o => o.id !== id))
  }

  async function salvarProvento() {
    if (!formProv.ticker || formProv.valor_por_cota <= 0 || formProv.quantidade <= 0) return
    setSalvando(true)
    const payload = {
      user_id: userId,
      ticker: formProv.ticker.toUpperCase().trim(),
      tipo: formProv.tipo,
      valor_por_cota: formProv.valor_por_cota,
      quantidade: formProv.quantidade,
      data_pagamento: formProv.data_pagamento,
    }
    if (editandoProv) {
      const { data } = await supabase.from('proventos_flow').update(payload).eq('id', editandoProv.id).select().single()
      if (data) setProventos(prev => prev.map(p => p.id === editandoProv.id ? data : p))
    } else {
      const { data } = await supabase.from('proventos_flow').insert(payload).select().single()
      if (data) setProventos(prev => [data, ...prev])
    }
    setSalvando(false); setModalProv(false); setEditandoProv(null)
    setFormProv({ ticker: '', tipo: 'Dividendo', valor_por_cota: 0, quantidade: 0, data_pagamento: hoje.toISOString().split('T')[0] })
  }

  async function excluirProvento(id: string) {
    if (!confirm('Excluir este provento?')) return
    await supabase.from('proventos_flow').delete().eq('id', id)
    setProventos(prev => prev.filter(p => p.id !== id))
  }

  function abrirEditarOp(op: Operacao) {
    setEditandoOp(op)
    setFormOp({ ativo_id: op.ativo_id, ticker: op.ticker, tipo: op.tipo, quantidade: op.quantidade, preco_unitario: op.preco_unitario, data: op.data, corretora: op.corretora || '', obs: op.obs || '' })
    setModalOp(true)
  }

  function abrirEditarProv(p: Provento) {
    setEditandoProv(p)
    setFormProv({ ticker: p.ticker, tipo: p.tipo, valor_por_cota: p.valor_por_cota, quantidade: p.quantidade, data_pagamento: p.data_pagamento })
    setModalProv(true)
  }

  if (loading) return <div style={{ color: '#6B7280', padding: 40, textAlign: 'center' }}>Carregando...</div>

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .inv-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
        .inv-abas { display: flex; gap: 4px; margin-bottom: 20px; background: #0D0F1A; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 4px; }
        .inv-aba { flex: 1; padding: 8px 0; border: none; background: transparent; color: #6B7280; font-size: 13px; font-weight: 500; border-radius: 7px; cursor: pointer; transition: all 0.15s; }
        .inv-aba.ativa { background: rgba(79,70,229,0.2); color: #818CF8; }
        .inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .inv-table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #4B5563; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .inv-table td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #E5E7EB; }
        .inv-table tr:last-child td { border-bottom: none; }
        .inv-table tr:hover td { background: rgba(255,255,255,0.02); }
        .inv-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 5px 10px; font-size: 12px; color: #9CA3AF; cursor: pointer; }
        .inv-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
        .inv-btn-danger { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #FCA5A5; }
        @media (max-width: 768px) {
          .inv-kpis { grid-template-columns: repeat(2,1fr); }
          .inv-table { display: block; overflow-x: auto; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Investimentos</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Carteira, operações, proventos e controle de IR.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setEditandoOp(null); setModalOp(true) }}
            style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Operação
          </button>
          <button onClick={() => { setEditandoProv(null); setModalProv(true) }}
            style={{ background: 'rgba(34,197,94,0.15)', color: VERDE, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Provento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="inv-kpis">
        {[
          { label: 'Patrimônio investido', valor: fmt(patrimonioTotal), sub: `Custo: ${fmt(custoTotal)}`, cor: '#fff' },
          { label: 'Resultado', valor: fmt(lucroTotal), sub: fmtPct(pctTotal), cor: lucroTotal >= 0 ? VERDE : VERM },
          { label: 'Proventos este mês', valor: fmt(totalProventosMes), sub: `${proventosDoMes.length} lançamento(s)`, cor: AMBER },
          { label: 'Ativos em carteira', valor: String(carteira.length), sub: `${ativos.length} cadastrado(s)`, cor: INDIGO },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.cor }}>{k.valor}</div>
            <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="inv-abas">
        {(['carteira','operacoes','proventos','ir'] as const).map(a => (
          <button key={a} className={`inv-aba${aba === a ? ' ativa' : ''}`} onClick={() => setAba(a)}>
            {a === 'carteira' ? '📊 Carteira' : a === 'operacoes' ? '🔄 Operações' : a === 'proventos' ? '💰 Proventos' : '📋 IR'}
          </button>
        ))}
      </div>

      {/* ── ABA CARTEIRA ── */}
      {aba === 'carteira' && (
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Posição atual</span>
            <button onClick={() => setModalAtivo(true)} className="inv-btn">+ Cadastrar ativo</button>
          </div>
          {carteira.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
              <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma posição em carteira. Lance sua primeira operação de compra!</p>
              <button onClick={() => setModalOp(true)} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nova operação</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Ticker</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Qtd</th>
                    <th style={{ textAlign: 'right' }}>Custo médio</th><th style={{ textAlign: 'right' }}>Preço atual</th>
                    <th style={{ textAlign: 'right' }}>Custo total</th><th style={{ textAlign: 'right' }}>Valor atual</th>
                    <th style={{ textAlign: 'right' }}>Resultado</th><th style={{ textAlign: 'right' }}>%</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {carteira.map(a => (
                    <tr key={a.id}>
                      <td><span style={{ fontWeight: 700, color: '#fff' }}>{a.ticker}</span>{a.nome && <div style={{ fontSize: 11, color: '#6B7280' }}>{a.nome}</div>}</td>
                      <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(79,70,229,0.15)', color: '#818CF8' }}>{a.tipo}</span></td>
                      <td style={{ textAlign: 'right' }}>{fmtN(a.qtd, a.tipo === 'Cripto' ? 8 : 0)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(a.custoMedio)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {a.precoAtual > 0
                          ? <span style={{ cursor: 'pointer', color: '#fff' }} onClick={() => { setModalPreco(a.ticker); setPrecoTemp(a.precoAtual) }}>{fmt(a.precoAtual)}</span>
                          : <button onClick={() => { setModalPreco(a.ticker); setPrecoTemp(0) }} className="inv-btn" style={{ fontSize: 11 }}>Informar</button>
                        }
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmt(a.custoBase)}</td>
                      <td style={{ textAlign: 'right' }}>{a.precoAtual > 0 ? fmt(a.valorAtual) : '—'}</td>
                      <td style={{ textAlign: 'right', color: a.lucro >= 0 ? VERDE : VERM }}>{a.precoAtual > 0 ? fmt(a.lucro) : '—'}</td>
                      <td style={{ textAlign: 'right', color: a.pct >= 0 ? VERDE : VERM, fontWeight: 600 }}>{a.precoAtual > 0 ? fmtPct(a.pct) : '—'}</td>
                      <td>
                        <button onClick={() => { setModalPreco(a.ticker); setPrecoTemp(a.precoAtual) }} className="inv-btn" style={{ fontSize: 11 }}>✏️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280', borderTop: '1px solid rgba(255,255,255,0.07)' }}>Total</td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#fff', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{fmt(custoTotal)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: '#fff', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{fmt(patrimonioTotal)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: lucroTotal >= 0 ? VERDE : VERM, borderTop: '1px solid rgba(255,255,255,0.07)' }}>{fmt(lucroTotal)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: pctTotal >= 0 ? VERDE : VERM, borderTop: '1px solid rgba(255,255,255,0.07)' }}>{fmtPct(pctTotal)}</td>
                    <td style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA OPERAÇÕES ── */}
      {aba === 'operacoes' && (
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Histórico de operações</span>
            <button onClick={() => { setEditandoOp(null); setModalOp(true) }} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nova operação</button>
          </div>
          {operacoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6B7280' }}>Nenhuma operação registrada.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Data</th><th>Ticker</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Qtd</th>
                    <th style={{ textAlign: 'right' }}>Preço unit.</th><th style={{ textAlign: 'right' }}>Total</th>
                    <th>Corretora</th><th>Obs</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {operacoes.map(op => (
                    <tr key={op.id}>
                      <td style={{ color: '#9CA3AF' }}>{new Date(op.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{op.ticker}</td>
                      <td>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: op.tipo === 'compra' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: op.tipo === 'compra' ? '#4ade80' : '#FCA5A5', fontWeight: 600 }}>
                          {op.tipo === 'compra' ? '▲ Compra' : '▼ Venda'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtN(op.quantidade, 0)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(op.preco_unitario)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: op.tipo === 'compra' ? VERM : VERDE }}>{fmt(op.valor_total)}</td>
                      <td style={{ color: '#9CA3AF', fontSize: 12 }}>{op.corretora || '—'}</td>
                      <td style={{ color: '#6B7280', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.obs || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => abrirEditarOp(op)} className="inv-btn">✏️</button>
                          <button onClick={() => excluirOperacao(op.id)} className="inv-btn inv-btn-danger">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA PROVENTOS ── */}
      {aba === 'proventos' && (
        <div>
          {/* Filtro mês/ano */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
              {[2023,2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Total: <strong style={{ color: AMBER }}>{fmt(totalProventosMes)}</strong></span>
          </div>

          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Proventos — {MESES[mesSel - 1]} {anoSel}</span>
              <button onClick={() => { setEditandoProv(null); setModalProv(true) }} style={{ background: 'rgba(34,197,94,0.15)', color: VERDE, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Novo provento</button>
            </div>
            {proventosDoMes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6B7280' }}>Nenhum provento registrado para este mês.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Data</th><th>Ticker</th><th>Tipo</th>
                      <th style={{ textAlign: 'right' }}>Qtd cotas</th>
                      <th style={{ textAlign: 'right' }}>Valor/cota</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th>Tributação</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {proventosDoMes.map(p => {
                      const tributado = p.tipo === 'JCP'
                      return (
                        <tr key={p.id}>
                          <td style={{ color: '#9CA3AF' }}>{new Date(p.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                          <td style={{ fontWeight: 700, color: '#fff' }}>{p.ticker}</td>
                          <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(245,158,11,0.1)', color: AMBER }}>{p.tipo}</span></td>
                          <td style={{ textAlign: 'right' }}>{fmtN(p.quantidade, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(p.valor_por_cota)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: VERDE }}>{fmt(p.valor_total)}</td>
                          <td>
                            {tributado
                              ? <span style={{ fontSize: 11, color: '#FCA5A5' }}>15% na fonte</span>
                              : <span style={{ fontSize: 11, color: '#4ade80' }}>Isento</span>
                            }
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => abrirEditarProv(p)} className="inv-btn">✏️</button>
                              <button onClick={() => excluirProvento(p.id)} className="inv-btn inv-btn-danger">✕</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA IR ── */}
      {aba === 'ir' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
              {[2023,2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* KPIs IR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total de vendas', valor: fmt(ir.totalVendas), cor: '#fff' },
              { label: 'Lucro tributável', valor: fmt(ir.lucroTributavel), cor: ir.lucroTributavel > 0 ? AMBER : '#fff' },
              { label: 'Lucro isento', valor: fmt(ir.lucroIsento), cor: VERDE },
              { label: 'DARF a pagar', valor: fmt(ir.darf), cor: ir.darf > 0 ? VERM : '#fff' },
            ].map(k => (
              <div key={k.label} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.cor }}>{k.valor}</div>
              </div>
            ))}
          </div>

          {/* Regra de isenção */}
          <div style={{ background: ir.totalVendas < 20000 ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${ir.totalVendas < 20000 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 16, fontSize: 13 }}>
            {ir.totalVendas === 0
              ? <span style={{ color: '#6B7280' }}>Nenhuma venda registrada neste mês.</span>
              : ir.totalVendas < 20000
                ? <span style={{ color: '#4ade80' }}>✅ Vendas totais de {fmt(ir.totalVendas)} — <strong>abaixo de R$20.000</strong>. Lucros com ações são <strong>isentos de IR</strong> neste mês.</span>
                : <span style={{ color: AMBER }}>⚠️ Vendas totais de {fmt(ir.totalVendas)} — <strong>acima de R$20.000</strong>. Lucros com ações são <strong>tributáveis</strong>. Gere o DARF até o último dia útil do mês seguinte.</span>
            }
          </div>

          {/* Detalhamento por ativo */}
          {ir.detalhes.length > 0 && (
            <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Detalhamento por ativo</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Ticker</th><th style={{ textAlign: 'right' }}>Qtd vendida</th>
                      <th style={{ textAlign: 'right' }}>Preço médio venda</th>
                      <th style={{ textAlign: 'right' }}>Custo médio</th>
                      <th style={{ textAlign: 'right' }}>Lucro/Prejuízo</th>
                      <th>IR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ir.detalhes.map(d => (
                      <tr key={d.ticker}>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{d.ticker}</td>
                        <td style={{ textAlign: 'right' }}>{fmtN(d.qtd, 0)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(d.precoVenda)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(d.custoMedio)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: d.lucro >= 0 ? VERDE : VERM }}>{fmt(d.lucro)}</td>
                        <td>
                          {d.lucro < 0
                            ? <span style={{ fontSize: 11, color: '#6B7280' }}>Prejuízo</span>
                            : d.isento
                              ? <span style={{ fontSize: 11, color: '#4ade80' }}>Isento</span>
                              : <span style={{ fontSize: 11, color: AMBER }}>15% = {fmt(d.lucro * 0.15)}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ir.darf > 0 && (
                <div style={{ margin: 16, padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FCA5A5', marginBottom: 8 }}>🔴 DARF a recolher</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                    <div><div style={{ fontSize: 11, color: '#6B7280' }}>Código DARF</div><div style={{ color: '#fff', fontWeight: 600 }}>6015 (Renda variável)</div></div>
                    <div><div style={{ fontSize: 11, color: '#6B7280' }}>Valor</div><div style={{ color: VERM, fontWeight: 700, fontSize: 18 }}>{fmt(ir.darf)}</div></div>
                    <div><div style={{ fontSize: 11, color: '#6B7280' }}>Vencimento</div><div style={{ color: '#fff', fontWeight: 600 }}>Último dia útil de {MESES[mesSel % 12]} {mesSel === 12 ? anoSel + 1 : anoSel}</div></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL CADASTRAR ATIVO ══ */}
      {modalAtivo && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setModalAtivo(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>Cadastrar ativo</h2>
            <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Ticker *</label>
              <input value={formAtivo.ticker} onChange={e => setFormAtivo(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} placeholder="Ex: PETR4, MXRF11, BTC" style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Tipo</label>
                <select value={formAtivo.tipo} onChange={e => setFormAtivo(p => ({ ...p, tipo: e.target.value }))} style={inp}>
                  {TIPOS_ATIVO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Nome (opcional)</label>
                <input value={formAtivo.nome} onChange={e => setFormAtivo(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Petrobras" style={inp} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalAtivo(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarAtivo} disabled={salvando} style={{ flex: 1, background: INDIGO, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>{salvando ? 'Salvando...' : 'Cadastrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL OPERAÇÃO ══ */}
      {modalOp && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={e => e.target === e.currentTarget && (setModalOp(false), setEditandoOp(null))}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>{editandoOp ? 'Editar operação' : 'Nova operação'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Ticker *</label>
                <input list="tickers-lista" value={formOp.ticker} onChange={e => {
                  const ticker = e.target.value.toUpperCase()
                  const ativo = ativos.find(a => a.ticker === ticker)
                  setFormOp(p => ({ ...p, ticker, ativo_id: ativo?.id || '' }))
                }} placeholder="Ex: PETR4" style={inp} />
                <datalist id="tickers-lista">{ativos.map(a => <option key={a.id} value={a.ticker} />)}</datalist>
              </div>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Tipo</label>
                <select value={formOp.tipo} onChange={e => setFormOp(p => ({ ...p, tipo: e.target.value }))} style={inp}>
                  <option value="compra">Compra</option><option value="venda">Venda</option>
                </select></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Quantidade *</label>
                <input type="number" min="0" step="any" value={formOp.quantidade || ''} onChange={e => setFormOp(p => ({ ...p, quantidade: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Preço unitário (R$) *</label>
                <input type="number" min="0" step="any" value={formOp.preco_unitario || ''} onChange={e => setFormOp(p => ({ ...p, preco_unitario: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
            </div>

            {formOp.quantidade > 0 && formOp.preco_unitario > 0 && (
              <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#818CF8' }}>
                Total da operação: <strong>{fmt(formOp.quantidade * formOp.preco_unitario)}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data *</label>
                <input type="date" value={formOp.data} onChange={e => setFormOp(p => ({ ...p, data: e.target.value }))} style={inp} /></div>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Corretora</label>
                <input value={formOp.corretora} onChange={e => setFormOp(p => ({ ...p, corretora: e.target.value }))} placeholder="Ex: XP, Clear, Rico..." style={inp} /></div>
            </div>

            <div style={{ marginBottom: 24 }}><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Observações</label>
              <input value={formOp.obs} onChange={e => setFormOp(p => ({ ...p, obs: e.target.value }))} placeholder="Opcional..." style={inp} /></div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setModalOp(false); setEditandoOp(null) }} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarOperacao} disabled={salvando} style={{ flex: 1, background: formOp.tipo === 'compra' ? INDIGO : VERM, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : formOp.tipo === 'compra' ? '▲ Registrar compra' : '▼ Registrar venda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PROVENTO ══ */}
      {modalProv && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={e => e.target === e.currentTarget && (setModalProv(false), setEditandoProv(null))}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>{editandoProv ? 'Editar provento' : 'Novo provento'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Ticker *</label>
                <input list="tickers-prov" value={formProv.ticker} onChange={e => setFormProv(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} placeholder="Ex: MXRF11" style={inp} />
                <datalist id="tickers-prov">{ativos.map(a => <option key={a.id} value={a.ticker} />)}</datalist>
              </div>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Tipo</label>
                <select value={formProv.tipo} onChange={e => setFormProv(p => ({ ...p, tipo: e.target.value }))} style={inp}>
                  {['Dividendo','JCP','Rendimento FII','Amortização','Bonificação'].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor por cota (R$) *</label>
                <input type="number" min="0" step="any" value={formProv.valor_por_cota || ''} onChange={e => setFormProv(p => ({ ...p, valor_por_cota: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
              <div><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Quantidade de cotas *</label>
                <input type="number" min="0" step="any" value={formProv.quantidade || ''} onChange={e => setFormProv(p => ({ ...p, quantidade: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
            </div>

            {formProv.valor_por_cota > 0 && formProv.quantidade > 0 && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#4ade80' }}>
                Total recebido: <strong>{fmt(formProv.valor_por_cota * formProv.quantidade)}</strong>
                {formProv.tipo === 'JCP' && <span style={{ color: AMBER, marginLeft: 8 }}>· 15% retido na fonte</span>}
                {formProv.tipo !== 'JCP' && <span style={{ color: '#4ade80', marginLeft: 8 }}>· Isento de IR</span>}
              </div>
            )}

            <div style={{ marginBottom: 24 }}><label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data de pagamento *</label>
              <input type="date" value={formProv.data_pagamento} onChange={e => setFormProv(p => ({ ...p, data_pagamento: e.target.value }))} style={inp} /></div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setModalProv(false); setEditandoProv(null) }} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarProvento} disabled={salvando} style={{ flex: 1, background: 'rgba(34,197,94,0.2)', border: `1px solid rgba(34,197,94,0.4)`, borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: VERDE, cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : '💰 Registrar provento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PREÇO ATUAL ══ */}
      {modalPreco && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setModalPreco(null)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Atualizar preço</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>{modalPreco} — preço atual de mercado</p>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Preço atual (R$)</label>
              <input type="number" min="0" step="any" value={precoTemp || ''} onChange={e => setPrecoTemp(parseFloat(e.target.value) || 0)} autoFocus style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalPreco(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { setPrecos(p => ({ ...p, [modalPreco!]: precoTemp })); setModalPreco(null) }}
                style={{ flex: 1, background: INDIGO, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                Atualizar
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#4B5563', textAlign: 'center', marginTop: 12 }}>* O preço é salvo apenas durante a sessão. Futuramente será atualizado automaticamente via API.</p>
          </div>
        </div>
      )}
    </div>
  )
}