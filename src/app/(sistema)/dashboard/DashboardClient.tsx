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

export default function DashboardClient() {
  const mes  = new Date().getMonth() + 1
  const ano  = new Date().getFullYear()
  const semanaDoMes = Math.ceil(new Date().getDate() / 7)

  const [userId, setUserId]           = useState<string | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [receitas,   setReceitas]     = useState<any[]>([])
  const [fixas,      setFixas]        = useState<any[]>([])
  const [variaveis,  setVariaveis]    = useState<any[]>([])
  const [diarias,    setDiarias]      = useState<any[]>([])
  const [reservas,   setReservas]     = useState<any[]>([])
  const [metas,      setMetas]        = useState<any[]>([])
  const [contas,     setContas]       = useState<any[]>([])
  const [loading,    setLoading]      = useState(true)
  const [menuLancar, setMenuLancar]   = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false)
  const [bannerFechado, setBannerFechado] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

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

      const semDados = (r.data?.length === 0) && (f.data?.length === 0) && (v.data?.length === 0) && (d.data?.length === 0) && (c.data?.length === 0)
      const bannerJaFechado = localStorage.getItem('zynflow_banner_retroativo') === 'fechado'
      if (semDados && !bannerJaFechado) setPrimeiroAcesso(true)
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
  const saldoDisp      = totalRecebido - totalSaidas - totalReservado

  // Cards Total Pago / Pendente / Vencido — fixas + variáveis + diárias
  const todasDespesas = [
    ...fixas.map(f => ({ ...f, valor: f.valor_mensal, origem: 'fixa' })),
    ...variaveis.map(v => ({ ...v, valor: v.valor_mensal, origem: 'variavel' })),
    ...diarias.map(d => ({ ...d, pago: true, dia_vencimento: null, origem: 'diaria' })),
  ]
  const totalPago     = todasDespesas.filter(d => d.pago).reduce((s, d) => s + (d.valor || 0), 0)
  const totalPendente = todasDespesas.filter(d => !d.pago && !(d.dia_vencimento && d.dia_vencimento <= new Date().getDate())).reduce((s, d) => s + (d.valor || 0), 0)
  const totalVencido  = todasDespesas.filter(d => !d.pago && d.dia_vencimento && d.dia_vencimento <= new Date().getDate()).reduce((s, d) => s + (d.valor || 0), 0)

  const receitaConsv  = totalPrevisto > 0 ? totalPrevisto : totalRecebido
  const tetoSemanal   = Math.round((receitaConsv / 4) * 0.3)
  const hoje          = new Date()
  const diariasSemana = diarias
    .filter(d => {
      const dt = new Date(d.data + 'T12:00:00')
      return Math.ceil(dt.getDate() / 7) === semanaDoMes
    })
    .reduce((s, d) => s + (d.valor || 0), 0)
  const pctTeto   = tetoSemanal > 0 ? Math.round((diariasSemana / tetoSemanal) * 100) : 0
  const restante  = tetoSemanal - diariasSemana

  // ✅ CORRIGIDO: usa saldo_inicial diretamente (atualizado a cada pagamento/recebimento)
  const saldoTotal = contas.reduce((s, c) => s + (c.saldo_inicial || 0), 0)

  // Gastos por categoria — fixas + variáveis + diárias
  const catMap: Record<string, number> = {}
  fixas.forEach(f => { if (f.categoria) catMap[f.categoria] = (catMap[f.categoria] || 0) + (f.valor_mensal || 0) })
  variaveis.forEach(v => { if (v.categoria) catMap[v.categoria] = (catMap[v.categoria] || 0) + (v.valor_mensal || 0) })
  diarias.forEach(d => { if (d.categoria) catMap[d.categoria] = (catMap[d.categoria] || 0) + (d.valor || 0) })
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const totalCats = Object.values(catMap).reduce((s, v) => s + v, 0)

  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataBR    = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  // Filtro de despesas fixas por status
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
                { href: '/receitas', label: '💰 Nova receita' },
                { href: '/despesas?tab=fixas', label: '📋 Despesa fixa' },
                { href: '/despesas?tab=variaveis', label: '📊 Despesa variável' },
                { href: '/despesas?tab=diarias', label: '🛒 Gasto diário' },
                { href: '/reservas', label: '🏦 Aporte em reserva' },
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

      {/* Banner boas-vindas / retroativo */}
      {primeiroAcesso && !bannerFechado && (
        <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, position: 'relative' as const }}>
          <button onClick={() => { setBannerFechado(true); localStorage.setItem('zynflow_banner_retroativo', 'fechado') }}
            style={{ position: 'absolute' as const, top: 12, right: 16, background: 'none', border: 'none', color: '#4B5563', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>👋</span>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                Bem-vindo ao Zynflow, {nomeUsuario.split(' ')[0]}!
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>
                Parece que você está começando no meio do mês. Se já recebeu e pagou contas antes de hoje, use o <strong style={{ color: '#fcd34d' }}>Lançamento Retroativo</strong> ao cadastrar essas despesas.
              </p>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#fcd34d', lineHeight: 1.6 }}>
                  📅 <strong>O que é Lançamento Retroativo?</strong> Ao lançar uma despesa já paga, marque a opção "Lançamento retroativo" — assim ela fica registrada no histórico mas <strong>não deduz do saldo atual</strong> das suas contas, evitando que o saldo fique negativo.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                <a href="/receitas" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: INDIGO, padding: '7px 16px', borderRadius: 8, textDecoration: 'none' }}>
                  + Lançar receitas →
                </a>
                <a href="/despesas" style={{ fontSize: 13, fontWeight: 600, color: '#818CF8', background: 'rgba(79,70,229,0.1)', padding: '7px 16px', borderRadius: 8, textDecoration: 'none' }}>
                  + Lançar despesas →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs principais */}
      <div className="db-kpis">
        <KPI label="Salário / Receita"  valor={fmt(totalRecebido)}  sub={`Previsto: ${fmt(totalPrevisto)}`}  cor={VERDE} />
        <KPI label="Total de saídas"    valor={fmt(totalSaidas)}    sub="Fixas + variáveis + diárias"        cor={VERM}  />
        <KPI label="Reservado (P3)"     valor={fmt(totalReservado)} sub="Emergência + meses fracos"          cor={INDIGO}/>
        <KPI label="Saldo disponível"   valor={fmt(saldoDisp)}      sub="Após reservas"                      cor={saldoDisp >= 0 ? '#fff' : VERM} />
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
        <Card title="Método 3 Passos — este mês">
          {[
            { num: 'P1', nome: 'Receitas', desc: `${receitas.length} fonte${receitas.length !== 1 ? 's' : ''} lançada${receitas.length !== 1 ? 's' : ''}`, pct: totalPrevisto > 0 ? Math.round((totalRecebido / totalPrevisto) * 100) : 0, cor: VERDE },
            { num: 'P2', nome: 'Gastos', desc: `Fixas ${fmt(totalFixas)} + var. ${fmt(totalVariaveis)} + diárias ${fmt(totalDiarias)}`, pct: totalRecebido > 0 ? Math.round((totalSaidas / totalRecebido) * 100) : 0, cor: AMBER },
            { num: 'P3', nome: 'Reservas', desc: 'Emergência + meses fracos + invest.', pct: totalRecebido > 0 ? Math.round((totalReservado / totalRecebido) * 100) : 0, cor: INDIGO },
          ].map(p => (
            <div key={p.num} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#818CF8', flexShrink: 0 }}>{p.num}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc}</div>
                <BarraProgresso pct={p.pct} cor={p.cor} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: p.cor, flexShrink: 0 }}>{p.pct}%</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: '12px', borderRadius: 10, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>Teto semanal de diárias</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: INDIGO, margin: '3px 0' }}>{fmt(tetoSemanal)}</div>
            <BarraProgresso pct={pctTeto} cor={pctTeto >= 90 ? VERM : pctTeto >= 60 ? AMBER : INDIGO} />
            <div style={{ fontSize: 11, color: '#6B7280' }}>{fmt(diariasSemana)} gastos · {fmt(Math.max(restante, 0))} restantes esta semana</div>
          </div>
        </Card>

        <Card title="Despesas — status">
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
              {filtroStatus === 'todos' && <a href="/despesas" style={{ fontSize: 13, color: '#818CF8' }}>+ Adicionar despesas fixas</a>}
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
          {fixasFiltradas.length > 6 && <div style={{ textAlign: 'center', marginTop: 8 }}><a href="/despesas" style={{ fontSize: 12, color: '#818CF8' }}>Ver todas ({fixasFiltradas.length})</a></div>}
        </Card>
      </div>

      {/* Grid inferior */}
      <div className="db-grid-bottom">
        <Card title="Gastos por categoria">
          {cats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Nenhum gasto lançado</p>
              <a href="/despesas" style={{ fontSize: 13, color: '#818CF8' }}>+ Lançar gasto</a>
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
              <a href="/metas" style={{ fontSize: 13, color: '#818CF8' }}>+ Criar meta</a>
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
          <a href="/metas" style={{ fontSize: 12, color: '#818CF8', display: 'block', textAlign: 'center', marginTop: 4 }}>Ver todas as metas →</a>
        </Card>

        <Card title="Contas bancárias">
          {contas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Nenhuma conta cadastrada</p>
              <a href="/contas" style={{ fontSize: 13, color: '#818CF8' }}>+ Adicionar conta</a>
            </div>
          ) : contas.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c.cor || INDIGO}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: c.cor || INDIGO }}>{c.nome.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#E5E7EB' }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{c.tipo}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: (c.saldo_inicial || 0) >= 0 ? VERDE : VERM }}>{fmt(c.saldo_inicial || 0)}</div>
            </div>
          ))}
          {contas.length > 0 && (
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