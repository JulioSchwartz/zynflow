'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERM   = '#ef4444'
const AMBER  = '#f59e0b'
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATS_FIXA    = ['Moradia','Financiamento','Plano de Saúde','Educação','Assinaturas','Seguros','Investimento Fixo','Impostos/MEI','Outro']
const CATS_VARIAVEL = ['Cartão de Crédito','Conta de Luz','Água/Gás','Condomínio','Combustível','Internet/Telefone','Supermercado','Outro']
const CATS_DIARIA  = ['Restaurante','Delivery','Lazer','Roupas','Farmácia','Presente','Viagem','Outro']

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

type TipoAba = 'fixa' | 'variavel' | 'diaria'

interface Fixa {
  id: string
  tipo: string
  categoria: string
  descricao: string
  valor_mensal: number
  dia_vencimento: number | null
  pago: boolean
  valor_pago: number
  mes: number
  ano: number
}

interface Diaria {
  id: string
  categoria: string
  descricao: string
  valor: number
  data: string
  mes: number
  ano: number
  conta_id: string | null
}

interface Conta { id: string; nome: string }

const VAZIO_F = { tipo: 'fixa', categoria: 'Moradia', descricao: '', valor_mensal: 0, dia_vencimento: null as number | null, pago: false, valor_pago: 0 }
const VAZIO_V = { tipo: 'variavel', categoria: 'Cartão de Crédito', descricao: '', valor_mensal: 0, dia_vencimento: null as number | null, pago: false, valor_pago: 0 }
const VAZIO_D = { categoria: 'Restaurante', descricao: '', valor: 0, data: new Date().toISOString().split('T')[0], conta_id: '' }

export default function DespesasClient() {
  const hoje = new Date()
  const [userId, setUserId]     = useState<string | null>(null)
  const [aba, setAba]           = useState<TipoAba>('fixa')
  const [mesSel, setMesSel]     = useState(hoje.getMonth() + 1)
  const [anoSel, setAnoSel]     = useState(hoje.getFullYear())
  const [fixas, setFixas]       = useState<Fixa[]>([])
  const [variaveis, setVariaveis] = useState<Fixa[]>([])
  const [diarias, setDiarias]   = useState<Diaria[]>([])
  const [contas, setContas]     = useState<Conta[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editandoF, setEditandoF] = useState<Fixa | null>(null)
  const [editandoD, setEditandoD] = useState<Diaria | null>(null)
  const [formF, setFormF]       = useState(VAZIO_F)
  const [formV, setFormV]       = useState(VAZIO_V)
  const [formD, setFormD]       = useState(VAZIO_D)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  async function carregar(uid: string, mes: number, ano: number) {
    setLoading(true)
    const [fx, vr, dr, ct] = await Promise.all([
      supabase.from('despesas_fixas_flow').select('*')
        .eq('user_id', uid).eq('mes', mes).eq('ano', ano).eq('tipo', 'fixa')
        .order('dia_vencimento', { ascending: true, nullsFirst: false }),
      supabase.from('despesas_fixas_flow').select('*')
        .eq('user_id', uid).eq('mes', mes).eq('ano', ano).eq('tipo', 'variavel')
        .order('dia_vencimento', { ascending: true, nullsFirst: false }),
      supabase.from('despesas_variaveis_flow').select('*')
        .eq('user_id', uid).eq('mes', mes).eq('ano', ano)
        .order('data', { ascending: false }),
      supabase.from('contas_flow').select('id, nome').eq('user_id', uid),
    ])
    setFixas(fx.data || [])
    setVariaveis(vr.data || [])
    setDiarias(dr.data || [])
    setContas(ct.data || [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await carregar(user.id, mesSel, anoSel)
    }
    init()
  }, [])

  useEffect(() => { if (userId) carregar(userId, mesSel, anoSel) }, [mesSel, anoSel])

  function abrirNova() {
    if (aba === 'fixa') { setEditandoF(null); setFormF(VAZIO_F) }
    else if (aba === 'variavel') { setEditandoF(null); setFormV(VAZIO_V) }
    else { setEditandoD(null); setFormD({ ...VAZIO_D, data: new Date().toISOString().split('T')[0] }) }
    setErro(''); setModal(true)
  }

  function abrirEditarF(f: Fixa) {
    setEditandoF(f)
    if (f.tipo === 'fixa') {
      setFormF({ tipo: 'fixa', categoria: f.categoria, descricao: f.descricao, valor_mensal: f.valor_mensal, dia_vencimento: f.dia_vencimento, pago: f.pago, valor_pago: f.valor_pago })
    } else {
      setFormV({ tipo: 'variavel', categoria: f.categoria, descricao: f.descricao, valor_mensal: f.valor_mensal, dia_vencimento: f.dia_vencimento, pago: f.pago, valor_pago: f.valor_pago })
    }
    setErro(''); setModal(true)
  }

  function abrirEditarD(d: Diaria) {
    setEditandoD(d)
    setFormD({ categoria: d.categoria, descricao: d.descricao, valor: d.valor, data: d.data, conta_id: d.conta_id || '' })
    setErro(''); setModal(true)
  }

  async function salvar() {
    setSalvando(true); setErro('')

    if (aba === 'fixa' || aba === 'variavel') {
      const form = aba === 'fixa' ? formF : formV
      if (!form.descricao.trim()) { setErro('Informe a descrição.'); setSalvando(false); return }
      const p = {
        tipo: form.tipo,
        categoria: form.categoria,
        descricao: form.descricao,
        valor_mensal: form.valor_mensal,
        dia_vencimento: form.dia_vencimento,
        pago: form.pago,
        valor_pago: form.valor_pago,
        mes: mesSel,
        ano: anoSel,
      }
      if (editandoF) await supabase.from('despesas_fixas_flow').update(p).eq('id', editandoF.id)
      else await supabase.from('despesas_fixas_flow').insert({ ...p, user_id: userId })
    } else {
      if (!formD.descricao.trim()) { setErro('Informe a descrição.'); setSalvando(false); return }
      if (!formD.valor || formD.valor <= 0) { setErro('Informe o valor.'); setSalvando(false); return }
      const d = new Date(formD.data + 'T12:00:00')
      const p = {
        categoria: formD.categoria,
        descricao: formD.descricao,
        valor: formD.valor,
        data: formD.data,
        conta_id: formD.conta_id || null,
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
      }
      if (editandoD) await supabase.from('despesas_variaveis_flow').update(p).eq('id', editandoD.id)
      else await supabase.from('despesas_variaveis_flow').insert({ ...p, user_id: userId })
    }

    await carregar(userId!, mesSel, anoSel)
    setSalvando(false); setModal(false)
  }

  async function excluirF(id: string) {
    if (!confirm('Excluir esta despesa?')) return
    await supabase.from('despesas_fixas_flow').delete().eq('id', id)
    if (aba === 'fixa') setFixas(prev => prev.filter(f => f.id !== id))
    else setVariaveis(prev => prev.filter(f => f.id !== id))
  }

  async function excluirD(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('despesas_variaveis_flow').delete().eq('id', id)
    setDiarias(prev => prev.filter(d => d.id !== id))
  }

  async function togglePago(f: Fixa) {
    const pago = !f.pago
    await supabase.from('despesas_fixas_flow').update({ pago, valor_pago: pago ? f.valor_mensal : 0 }).eq('id', f.id)
    const setter = f.tipo === 'fixa' ? setFixas : setVariaveis
    setter(prev => prev.map(x => x.id === f.id ? { ...x, pago, valor_pago: pago ? x.valor_mensal : 0 } : x))
  }

  const totalFixas    = fixas.reduce((s, f) => s + f.valor_mensal, 0)
  const totalFixasPagas = fixas.filter(f => f.pago).reduce((s, f) => s + f.valor_mensal, 0)
  const totalVariaveis = variaveis.reduce((s, f) => s + f.valor_mensal, 0)
  const totalVariaveisPagas = variaveis.filter(f => f.pago).reduce((s, f) => s + f.valor_mensal, 0)
  const totalDiarias  = diarias.reduce((s, d) => s + d.valor, 0)

  const semanaDoMes = Math.ceil(hoje.getDate() / 7)
  const diariaSemana = diarias.filter(d => {
    const dt = new Date(d.data + 'T12:00:00')
    return dt.getMonth() + 1 === mesSel && dt.getFullYear() === anoSel && Math.ceil(dt.getDate() / 7) === semanaDoMes
  }).reduce((s, d) => s + d.valor, 0)

  const catMapD: Record<string, number> = {}
  diarias.forEach(d => { catMapD[d.categoria] = (catMapD[d.categoria] || 0) + d.valor })
  const catsD = Object.entries(catMapD).sort((a, b) => b[1] - a[1])

  const corStatus = (f: Fixa) => {
    if (f.pago) return { bg: 'rgba(34,197,94,0.1)', txt: '#4ade80', label: 'pago' }
    if (f.dia_vencimento && f.dia_vencimento <= hoje.getDate() && mesSel === hoje.getMonth() + 1)
      return { bg: 'rgba(239,68,68,0.1)', txt: '#FCA5A5', label: 'vencida' }
    return { bg: 'rgba(255,255,255,0.05)', txt: '#9CA3AF', label: 'pendente' }
  }

  const btnLabel = aba === 'fixa' ? '+ Nova fixa' : aba === 'variavel' ? '+ Nova variável' : '+ Lançar gasto'

  const renderCardFV = (f: Fixa) => {
    const st = corStatus(f)
    return (
      <div key={f.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px' }}>
        <div className="desp-card-row">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{f.descricao}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: st.bg, color: st.txt }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {f.categoria}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginTop: 4 }}>{fmt(f.valor_mensal)}</div>
          </div>
          <div className="desp-card-actions">
            <button onClick={() => togglePago(f)} style={{
              background: f.pago ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${f.pago ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6, padding: '6px 12px', fontSize: 12,
              color: f.pago ? '#4ade80' : '#9CA3AF', cursor: 'pointer',
            }}>{f.pago ? '✓ Pago' : 'Pagar'}</button>
            <button onClick={() => abrirEditarF(f)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>Editar</button>
            <button onClick={() => excluirF(f.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#FCA5A5', cursor: 'pointer' }}>Excluir</button>
          </div>
        </div>
      </div>
    )
  }

  const cats = aba === 'fixa' ? CATS_FIXA : aba === 'variavel' ? CATS_VARIAVEL : CATS_DIARIA
  const formAtual = aba === 'fixa' ? formF : formV

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .desp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .desp-header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .desp-kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
        .desp-card-row { display: flex; align-items: center; justify-content: space-between; }
        .desp-card-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        @media (max-width: 768px) {
          .desp-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .desp-kpis { grid-template-columns: repeat(2, 1fr); }
          .desp-card-row { flex-direction: column; align-items: flex-start; gap: 10px; }
          .desp-card-actions { width: 100%; flex-wrap: wrap; }
          .desp-card-actions button { flex: 1; min-width: 70px; }
        }
      `}</style>

      {/* Header */}
      <div className="desp-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Despesas — P2</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Controle fixas, variáveis e diárias.</p>
        </div>
        <div className="desp-header-actions">
          <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {btnLabel}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="desp-kpis">
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Fixas do mês</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{fmt(totalFixas)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{fmt(totalFixasPagas)} pagos</div>
        </div>
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Variáveis do mês</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: AMBER }}>{fmt(totalVariaveis)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{fmt(totalVariaveisPagas)} pagos</div>
        </div>
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Diárias do mês</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: VERM }}>{fmt(totalDiarias)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{diarias.length} lançamento(s)</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
        {([
          { key: 'fixa',    label: `🏠 Fixas (${fixas.length})` },
          { key: 'variavel', label: `📊 Variáveis (${variaveis.length})` },
          { key: 'diaria',  label: `🛒 Diárias (${diarias.length})` },
        ] as const).map(a => (
          <button key={a.key} onClick={() => setAba(a.key)} style={{
            flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 13,
            fontWeight: aba === a.key ? 600 : 400,
            background: aba === a.key ? '#0D0F1A' : 'transparent',
            color: aba === a.key ? '#fff' : '#6B7280',
            cursor: 'pointer',
          }}>{a.label}</button>
        ))}
      </div>

      {loading ? <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Carregando...</div> : (
        <>
          {/* ABA FIXAS */}
          {aba === 'fixa' && (
            fixas.length === 0 ? (
              <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏠</div>
                <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma despesa fixa para {MESES[mesSel-1]}</p>
                <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Adicionar despesa fixa</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {fixas.map(f => renderCardFV(f))}
              </div>
            )
          )}

          {/* ABA VARIÁVEIS */}
          {aba === 'variavel' && (
            variaveis.length === 0 ? (
              <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma despesa variável para {MESES[mesSel-1]}</p>
                <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Adicionar despesa variável</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {variaveis.map(f => renderCardFV(f))}
              </div>
            )
          )}

          {/* ABA DIÁRIAS */}
          {aba === 'diaria' && (
            <div>
              {catsD.length > 0 && (
                <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Por categoria</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 8 }}>
                    {catsD.map(([cat, val]) => (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#9CA3AF' }}>{cat}</span>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{fmt(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diarias.length === 0 ? (
                <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🛒</div>
                  <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhum gasto diário em {MESES[mesSel-1]}</p>
                  <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Lançar gasto</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  {diarias.map(d => (
                    <div key={d.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px' }}>
                      <div className="desp-card-row">
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{d.descricao}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                            {d.categoria} · {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                            {contas.find(c => c.id === d.conta_id) ? ` · ${contas.find(c => c.id === d.conta_id)?.nome}` : ''}
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 600, color: VERM }}>{fmt(d.valor)}</span>
                        </div>
                        <div className="desp-card-actions">
                          <button onClick={() => abrirEditarD(d)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>Editar</button>
                          <button onClick={() => excluirD(d.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#FCA5A5', cursor: 'pointer' }}>Excluir</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>
              {aba === 'fixa' ? (editandoF ? 'Editar despesa fixa' : 'Nova despesa fixa')
                : aba === 'variavel' ? (editandoF ? 'Editar despesa variável' : 'Nova despesa variável')
                : (editandoD ? 'Editar gasto diário' : 'Novo gasto diário')}
            </h2>

            {(aba === 'fixa' || aba === 'variavel') ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Categoria</label>
                    <select
                      value={aba === 'fixa' ? formF.categoria : formV.categoria}
                      onChange={e => aba === 'fixa' ? setFormF(p => ({ ...p, categoria: e.target.value })) : setFormV(p => ({ ...p, categoria: e.target.value }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }}>
                      {(aba === 'fixa' ? CATS_FIXA : CATS_VARIAVEL).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Dia vencimento</label>
                    <input type="number" min="1" max="31"
                      value={aba === 'fixa' ? formF.dia_vencimento || '' : formV.dia_vencimento || ''}
                      onChange={e => {
                        const v = parseInt(e.target.value) || null
                        aba === 'fixa' ? setFormF(p => ({ ...p, dia_vencimento: v })) : setFormV(p => ({ ...p, dia_vencimento: v }))
                      }}
                      placeholder="Ex: 10"
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Descrição *</label>
                  <input
                    value={aba === 'fixa' ? formF.descricao : formV.descricao}
                    onChange={e => aba === 'fixa' ? setFormF(p => ({ ...p, descricao: e.target.value })) : setFormV(p => ({ ...p, descricao: e.target.value }))}
                    placeholder={aba === 'fixa' ? 'Ex: Aluguel, Plano de saúde...' : 'Ex: Cartão Bradesco, Conta Luz...'}
                    style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                    <input type="number"
                      value={aba === 'fixa' ? formF.valor_mensal : formV.valor_mensal}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0
                        aba === 'fixa' ? setFormF(p => ({ ...p, valor_mensal: v })) : setFormV(p => ({ ...p, valor_mensal: v }))
                      }}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                    <input type="checkbox" id="pago"
                      checked={aba === 'fixa' ? formF.pago : formV.pago}
                      onChange={e => aba === 'fixa' ? setFormF(p => ({ ...p, pago: e.target.checked })) : setFormV(p => ({ ...p, pago: e.target.checked }))}
                      style={{ width: 18, height: 18, accentColor: INDIGO }} />
                    <label htmlFor="pago" style={{ fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Já pago</label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Categoria</label>
                    <select value={formD.categoria} onChange={e => setFormD(p => ({ ...p, categoria: e.target.value }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }}>
                      {CATS_DIARIA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data</label>
                    <input type="date" value={formD.data} onChange={e => setFormD(p => ({ ...p, data: e.target.value }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Descrição *</label>
                  <input value={formD.descricao} onChange={e => setFormD(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Ex: Almoço, Camiseta, Remédio..."
                    style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor (R$) *</label>
                    <input type="number" value={formD.valor} onChange={e => setFormD(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Conta</label>
                    <select value={formD.conta_id} onChange={e => setFormD(p => ({ ...p, conta_id: e.target.value }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }}>
                      <option value="">Sem conta</option>
                      {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {erro && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{ flex: 1, background: INDIGO, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}