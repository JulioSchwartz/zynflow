'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERDE  = '#22c55e'
const VERM   = '#ef4444'
const AMBER  = '#f59e0b'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function BarraProgresso({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', margin: '6px 0 4px' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: cor, borderRadius: 3 }} />
    </div>
  )
}

function KPI({ label, valor, sub, cor }: { label: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: cor || '#fff' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

type FiltroStatus = 'todos' | 'pago' | 'pendente' | 'vencida'

export default function DashboardPFClient() {
  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const [nomeUsuario, setNomeUsuario] = useState('')
  const [receitas,    setReceitas]    = useState<any[]>([])
  const [fixas,       setFixas]       = useState<any[]>([])
  const [variaveis,   setVariaveis]   = useState<any[]>([])
  const [diarias,     setDiarias]     = useState<any[]>([])
  const [reservas,    setReservas]    = useState<any[]>([])
  const [metas,       setMetas]       = useState<any[]>([])
  const [contas,      setContas]      = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [menuLancar,  setMenuLancar]  = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')

  const hoje      = new Date()
  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataBR    = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [u, r, f, v, d, res, m, c] = await Promise.all([
        supabase.from('usuarios_flow').select('nome').eq('user_id', user.id).single(),
        supabase.from('receitas_flow').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano),
        supabase.from('despesas_fixas_flow').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano).eq('tipo', 'fixa'),
        supabase.from('despesas_fixas_flow').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano).eq('tipo', 'variavel'),
        supabase.from('despesas_variaveis_flow').select('*').eq('user_id', user.id).eq('mes', mes).eq('ano', ano),
        supabase.from('reservas_flow').select('*').eq('user_id', user.id),
        supabase.from('metas_flow').select('*').eq('user_id', user.id).eq('status', 'ativa').limit(4),
        supabase.from('contas_flow').select('*').eq('user_id', user.id),
      ])

      setNomeUsuario(u.data?.nome || '')
      setReceitas(r.data || [])
      setFixas(f.data || [])
      setVariaveis(v.data || [])
      setDiarias(d.data || [])
      setReservas(res.data || [])
      setMetas(m.data || [])
      setContas(c.data || [])
      setLoading(false)
    }
    carregar()
  }, [mes, ano])

  const totalRecebido  = receitas.reduce((s, r) => s + (r.valor_recebido || 0), 0)
  const totalPrevisto  = receitas.reduce((s, r) => s + (r.valor_previsto || 0), 0)
  const totalFixas     = fixas.reduce((s, f) => s + (f.valor_mensal || 0), 0)
  const totalVariaveis = variaveis.reduce((s, v) => s + (v.valor_mensal || 0), 0)
  const totalDiarias   = diarias.reduce((s, d) => s + (d.valor || 0), 0)
  const totalSaidas    = totalFixas + totalVariaveis + totalDiarias
  const totalReservado = reservas.reduce((s, r) => s + (r.valor_acumulado || 0), 0)
  const saldoDisp      = totalRecebido - totalSaidas

  // Cards Total Pago / Pendente / Vencido
  const todasDespesas = [
    ...fixas.map(f => ({ ...f, valor: f.valor_mensal, origem: 'fixa' })),
    ...variaveis.map(v => ({ ...v, valor: v.valor_mensal, origem: 'variavel' })),
    ...diarias.map(d => ({ ...d, pago: true, dia_vencimento: null, origem: 'diaria' })),
  ]
  const totalPago     = todasDespesas.filter(d => d.pago).reduce((s, d) => s + (d.valor || 0), 0)
  const totalPendente = todasDespesas.filter(d => !d.pago && !(d.dia_vencimento && d.dia_vencimento <= new Date().getDate())).reduce((s, d) => s + (d.valor || 0), 0)
  const totalVencido  = todasDespesas.filter(d => !d.pago && d.dia_vencimento && d.dia_vencimento <= new Date().getDate()).reduce((s, d) => s + (d.valor || 0), 0)

  const contasComSaldo = contas.map(c => {
    const entradasConta   = receitas.filter(r => r.conta_id === c.id).reduce((s, r) => s + (r.valor_recebido || 0), 0)
    const saidasDiarias   = diarias.filter(d => d.conta_id === c.id).reduce((s, d) => s + (d.valor || 0), 0)
    const saidasFixas     = fixas.filter(f => f.conta_id === c.id && f.pago).reduce((s, f) => s + (f.valor_mensal || 0), 0)
    const saidasVariaveis = variaveis.filter(v => v.conta_id === c.id && v.pago).reduce((s, v) => s + (v.valor_mensal || 0), 0)
    return { ...c, saldo: (c.saldo_inicial || 0) + entradasConta - saidasDiarias - saidasFixas - saidasVariaveis }
  })
  const saldoTotal = contasComSaldo.reduce((s, c) => s + c.saldo, 0)

  const pctFixas     = totalRecebido > 0 ? Math.round((totalFixas / totalRecebido) * 100) : 0
  const pctVariaveis = totalRecebido > 0 ? Math.round((totalVariaveis / totalRecebido) * 100) : 0
  const pctDiarias   = totalRecebido > 0 ? Math.round((totalDiarias / totalRecebido) * 100) : 0
  const pctTotal     = pctFixas + pctVariaveis + pctDiarias

  // Gastos por categoria — fixas + variáveis + diárias
  const catMap: Record<string, number> = {}
  fixas.forEach(f => { if (f.categoria) catMap[f.categoria] = (catMap[f.categoria] || 0) + (f.valor_mensal || 0) })
  variaveis.forEach(v => { if (v.categoria) catMap[v.categoria] = (catMap[v.categoria] || 0) + (v.valor_mensal || 0) })
  diarias.forEach(d => { if (d.categoria) catMap[d.categoria] = (catMap[d.categoria] || 0) + (d.valor || 0) })
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const totalCats = Object.values(catMap).reduce((s, v) => s + v, 0)

  // Filtro despesas fixas por status
  const fixasFiltradas = [...fixas].sort((a, b) => (a.dia_vencimento || 99) - (b.dia_vencimento || 99)).filter(f => {
    const status = f.pago ? 'pago' : f.dia_vencimento && f.dia_vencimento <= new Date().getDate() ? 'vencida' : 'pendente'
    if (filtroStatus === 'todos') return true
    return status === filtroStatus
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <span style={{ color: '#6B7280', fontSize: 14 }}>Carregando...</span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .db-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .db-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
        .db-kpis-status { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .db-grid-main { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .db-grid-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .db-lancar-menu {
          position: absolute; right: 0; top: 110%;
          background: #0D0F1A; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 8px; z-index: 100;
          min-width: 210px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        @media (max-width: 768px) {
          .db-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .db-kpis-status { grid-template-columns: repeat(3, 1fr) !important; }
          .db-grid-main { grid-template-columns: 1fr !important; }
          .db-grid-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div className="db-header">
        <div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2, textTransform: 'capitalize' as const }}>{diaSemana}, {dataBR}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>
            Olá, {nomeUsuario.split(' ')[0]} 👋
          </div>
        </div>
        <div style={{ position: 'relative' as const }}>
          <button onClick={() => setMenuLancar(v => !v)} style={{ background: INDIGO, border: 'none', color: '#fff', padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            + Lançar
          </button>
          {menuLancar && (
            <div className="db-lancar-menu">
              {[
                { href: '/pf/receitas', label: '💰 Nova receita' },
                { href: '/pf/despesas?tab=fixas', label: '📋 Despesa fixa' },
                { href: '/pf/despesas?tab=variaveis', label: '📊 Despesa variável' },
                { href: '/pf/despesas?tab=diarias', label: '🛒 Gasto diário' },
                { href: '/pf/reservas', label: '🏦 Aporte em reserva' },
              ].map(item => (
                <a key={item.href} href={item.href} onClick={() => setMenuLancar(false)}
                  style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#E5E7EB', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPIs principais */}
      <div className="db-kpis">
        <KPI label="Salário"           valor={fmt(totalRecebido)}  sub={`Previsto: ${fmt(totalPrevisto)}`}  cor={VERDE} />
        <KPI label="Total de gastos"   valor={fmt(totalSaidas)}    sub={`${pctTotal}% da renda`}            cor={pctTotal > 80 ? VERM : AMBER} />
        <KPI label="Total em reservas" valor={fmt(totalReservado)} sub="Acumulado em todas as reservas"     cor={INDIGO} />
        <KPI label="Saldo disponível"  valor={fmt(saldoDisp)}      sub="Receita menos gastos"               cor={saldoDisp >= 0 ? '#fff' : VERM} />
      </div>

      {/* Cards Total Pago / Pendente / Vencido */}
      <div className="db-kpis-status">
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>✅ Total pago</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: VERDE }}>{fmt(totalPago)}</div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>Fixas + variáveis + diárias</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>⏳ Total pendente</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: AMBER }}>{fmt(totalPendente)}</div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>A vencer este mês</div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>🔴 Total vencido</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: VERM }}>{fmt(totalVencido)}</div>
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>Prazo já passou</div>
        </div>
      </div>

      {/* Grid principal */}
      <div className="db-grid-main">
        <Card title="Visão geral dos gastos — este mês">
          {[
            { label: 'Despesas fixas',     valor: totalFixas,     pct: pctFixas,     cor: AMBER },
            { label: 'Despesas variáveis', valor: totalVariaveis, pct: pctVariaveis, cor: '#8b5cf6' },
            { label: 'Gastos diários',     valor: totalDiarias,   pct: pctDiarias,   cor: VERM },
          ].map(item => (
            <div key={item.label} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#E5E7EB' }}>{item.label}</span>
                <div style={{ textAlign: 'right' as const }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{fmt(item.valor)}</span>
                  <span style={{ fontSize: 11, color: item.cor, marginLeft: 8 }}>{item.pct}%</span>
                </div>
              </div>
              <BarraProgresso pct={item.pct} cor={item.cor} />
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '12px', borderRadius: 10, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Total comprometido da renda</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: pctTotal > 100 ? VERM : pctTotal > 80 ? AMBER : VERDE }}>{pctTotal}%</span>
            </div>
            <BarraProgresso pct={pctTotal} cor={pctTotal > 100 ? VERM : pctTotal > 80 ? AMBER : VERDE} />
            <div style={{ fontSize: 11, color: '#6B7280' }}>Ideal: manter abaixo de 80% para sobrar para reservas e metas</div>
          </div>
        </Card>

        <Card title="Despesas — status">
          {/* Filtro de status */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' as const }}>
            {(['todos', 'pago', 'pendente', 'vencida'] as FiltroStatus[]).map(f => (
              <button key={f} onClick={() => setFiltroStatus(f)} style={{
                padding: '3px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: filtroStatus === f ? INDIGO : 'rgba(255,255,255,0.06)',
                color: filtroStatus === f ? '#fff' : '#6B7280',
              }}>
                {f === 'todos' ? 'Todos' : f === 'pago' ? '✅ Pago' : f === 'pendente' ? '⏳ Pendente' : '🔴 Vencido'}
              </button>
            ))}
          </div>
          {fixasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
                {filtroStatus === 'todos' ? 'Nenhuma despesa fixa lançada' : `Nenhuma despesa ${filtroStatus}`}
              </p>
              {filtroStatus === 'todos' && <a href="/pf/despesas" style={{ fontSize: 13, color: '#818CF8' }}>+ Adicionar despesas fixas</a>}
            </div>
          ) : fixasFiltradas.slice(0, 6).map(f => {
            const status = f.pago ? 'pago' : f.dia_vencimento && f.dia_vencimento <= new Date().getDate() ? 'vencida' : 'pendente'
            const corPill = status === 'pago' ? { bg: 'rgba(34,197,94,0.1)', txt: '#4ade80' } : status === 'vencida' ? { bg: 'rgba(239,68,68,0.1)', txt: '#FCA5A5' } : { bg: 'rgba(255,255,255,0.05)', txt: '#9CA3AF' }
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                <div>
                  <div style={{ color: '#E5E7EB', fontWeight: 500 }}>{f.descricao}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{f.categoria}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{fmt(f.valor_mensal)}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: corPill.bg, color: corPill.txt }}>{status}</span>
                </div>
              </div>
            )
          })}
          {fixasFiltradas.length > 6 && <div style={{ textAlign: 'center', marginTop: 8 }}><a href="/pf/despesas" style={{ fontSize: 12, color: '#818CF8' }}>Ver todas ({fixasFiltradas.length})</a></div>}
        </Card>
      </div>

      {/* Grid inferior */}
      <div className="db-grid-bottom">
        <Card title="Gastos por categoria">
          {cats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Nenhum gasto lançado</p>
              <a href="/pf/despesas" style={{ fontSize: 13, color: '#818CF8' }}>+ Lançar gasto</a>
            </div>
          ) : cats.map(([cat, val], i) => {
            const cores = [AMBER, '#8b5cf6', '#06b6d4', '#64748b', '#ec4899']
            const pct = totalCats > 0 ? Math.round((val / totalCats) * 100) : 0
            return (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cores[i], display: 'inline-block' }} />
                  <span style={{ color: '#E5E7EB' }}>{cat}</span>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{fmt(val)}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{pct}%</div>
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: 11, color: '#4B5563', marginTop: 8 }}>Fixas + variáveis + diárias</div>
        </Card>

        <Card title="Metas financeiras">
          {metas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Nenhuma meta criada</p>
              <a href="/pf/metas" style={{ fontSize: 13, color: '#818CF8' }}>+ Criar meta</a>
            </div>
          ) : metas.map(m => {
            const pct = m.valor_alvo > 0 ? Math.round((m.valor_atual / m.valor_alvo) * 100) : 0
            return (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#E5E7EB' }}>{m.nome}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{fmt(m.valor_atual)} / {fmt(m.valor_alvo)}</span>
                </div>
                <BarraProgresso pct={pct} cor={m.cor || INDIGO} />
                <div style={{ fontSize: 11, color: '#6B7280' }}>{pct}%{m.prazo ? ` · Prazo: ${new Date(m.prazo + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}` : ''}</div>
              </div>
            )
          })}
          <a href="/pf/metas" style={{ fontSize: 12, color: '#818CF8', display: 'block', textAlign: 'center', marginTop: 4 }}>Ver todas as metas →</a>
        </Card>

        <Card title="Contas bancárias">
          {contasComSaldo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Nenhuma conta cadastrada</p>
              <a href="/pf/contas" style={{ fontSize: 13, color: '#818CF8' }}>+ Adicionar conta</a>
            </div>
          ) : contasComSaldo.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c.cor || INDIGO}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: c.cor || INDIGO }}>{c.nome.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#E5E7EB' }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{c.tipo}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: c.saldo >= 0 ? VERDE : VERM }}>{fmt(c.saldo)}</div>
            </div>
          ))}
          {contasComSaldo.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Saldo total</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{fmt(saldoTotal)}</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}