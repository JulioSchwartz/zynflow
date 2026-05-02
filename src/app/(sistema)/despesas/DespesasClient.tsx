'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERM   = '#ef4444'
const AMBER  = '#f59e0b'
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATS_FIXAS = ['Moradia','Alimentação','Transporte','Saúde','Educação','Assinaturas','Impostos/MEI','Seguros','Investimento fixo','Outro']
const CATS_VAR   = ['Restaurante','Delivery','Lazer','Roupas','Farmácia','Supermercado','Combustível','Presente','Viagem','Outro']

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

interface Fixa { id: string; categoria: string; descricao: string; valor_mensal: number; dia_vencimento: number | null; pago: boolean; valor_pago: number; mes: number; ano: number }
interface Variavel { id: string; categoria: string; descricao: string; valor: number; data: string; mes: number; ano: number; conta_id: string | null }
interface Conta { id: string; nome: string }

const VAZIO_F = { categoria: 'Moradia', descricao: '', valor_mensal: 0, dia_vencimento: null as number | null, pago: false, valor_pago: 0 }
const VAZIO_V = { categoria: 'Restaurante', descricao: '', valor: 0, data: new Date().toISOString().split('T')[0], conta_id: '' }

export default function DespesasClient() {
  const hoje = new Date()
  const [userId, setUserId]     = useState<string | null>(null)
  const [aba, setAba]           = useState<'fixas' | 'variaveis'>('fixas')
  const [mesSel, setMesSel]     = useState(hoje.getMonth() + 1)
  const [anoSel, setAnoSel]     = useState(hoje.getFullYear())
  const [fixas, setFixas]       = useState<Fixa[]>([])
  const [variaveis, setVar]     = useState<Variavel[]>([])
  const [contas, setContas]     = useState<Conta[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editandoF, setEditandoF] = useState<Fixa | null>(null)
  const [editandoV, setEditandoV] = useState<Variavel | null>(null)
  const [formF, setFormF]       = useState(VAZIO_F)
  const [formV, setFormV]       = useState(VAZIO_V)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  async function carregar(uid: string, mes: number, ano: number) {
    setLoading(true)
    const [f, v, c] = await Promise.all([
      supabase.from('despesas_fixas_flow').select('*').eq('user_id', uid).eq('mes', mes).eq('ano', ano).order('criado_em'),
      supabase.from('despesas_variaveis_flow').select('*').eq('user_id', uid).eq('mes', mes).eq('ano', ano).order('data', { ascending: false }),
      supabase.from('contas_flow').select('id, nome').eq('user_id', uid),
    ])
    setFixas(f.data || [])
    setVar(v.data || [])
    setContas(c.data || [])
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
    if (aba === 'fixas') { setEditandoF(null); setFormF(VAZIO_F) }
    else { setEditandoV(null); setFormV({ ...VAZIO_V, data: new Date().toISOString().split('T')[0] }) }
    setErro(''); setModal(true)
  }

  function abrirEditarF(f: Fixa) {
    setEditandoF(f)
    setFormF({ categoria: f.categoria, descricao: f.descricao, valor_mensal: f.valor_mensal, dia_vencimento: f.dia_vencimento, pago: f.pago, valor_pago: f.valor_pago })
    setErro(''); setModal(true)
  }

  function abrirEditarV(v: Variavel) {
    setEditandoV(v)
    setFormV({ categoria: v.categoria, descricao: v.descricao, valor: v.valor, data: v.data, conta_id: v.conta_id || '' })
    setErro(''); setModal(true)
  }

  async function salvar() {
    setSalvando(true); setErro('')
    if (aba === 'fixas') {
      if (!formF.descricao.trim()) { setErro('Informe a descrição.'); setSalvando(false); return }
      const p = { categoria: formF.categoria, descricao: formF.descricao, valor_mensal: formF.valor_mensal, dia_vencimento: formF.dia_vencimento, pago: formF.pago, valor_pago: formF.valor_pago, mes: mesSel, ano: anoSel }
      if (editandoF) await supabase.from('despesas_fixas_flow').update(p).eq('id', editandoF.id)
      else await supabase.from('despesas_fixas_flow').insert({ ...p, user_id: userId })
    } else {
      if (!formV.descricao.trim()) { setErro('Informe a descrição.'); setSalvando(false); return }
      if (!formV.valor || formV.valor <= 0) { setErro('Informe o valor.'); setSalvando(false); return }
      const d = new Date(formV.data + 'T12:00:00')
      const p = { categoria: formV.categoria, descricao: formV.descricao, valor: formV.valor, data: formV.data, conta_id: formV.conta_id || null, mes: d.getMonth() + 1, ano: d.getFullYear() }
      if (editandoV) await supabase.from('despesas_variaveis_flow').update(p).eq('id', editandoV.id)
      else await supabase.from('despesas_variaveis_flow').insert({ ...p, user_id: userId })
    }
    await carregar(userId!, mesSel, anoSel)
    setSalvando(false); setModal(false)
  }

  async function excluirF(id: string) {
    if (!confirm('Excluir esta despesa?')) return
    await supabase.from('despesas_fixas_flow').delete().eq('id', id)
    setFixas(prev => prev.filter(f => f.id !== id))
  }

  async function excluirV(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('despesas_variaveis_flow').delete().eq('id', id)
    setVar(prev => prev.filter(v => v.id !== id))
  }

  async function togglePago(f: Fixa) {
    const pago = !f.pago
    await supabase.from('despesas_fixas_flow').update({ pago, valor_pago: pago ? f.valor_mensal : 0 }).eq('id', f.id)
    setFixas(prev => prev.map(x => x.id === f.id ? { ...x, pago, valor_pago: pago ? x.valor_mensal : 0 } : x))
  }

  const totalFixas   = fixas.reduce((s, f) => s + f.valor_mensal, 0)
  const totalPagas   = fixas.filter(f => f.pago).reduce((s, f) => s + f.valor_mensal, 0)
  const totalVar     = variaveis.reduce((s, v) => s + v.valor, 0)

  // Teto semanal: buscar receitas do mês para calcular
  const semanaDoMes = Math.ceil(hoje.getDate() / 7)
  const varSemana   = variaveis.filter(v => {
    const d = new Date(v.data + 'T12:00:00')
    return d.getMonth() + 1 === mesSel && d.getFullYear() === anoSel && Math.ceil(d.getDate() / 7) === semanaDoMes
  }).reduce((s, v) => s + v.valor, 0)

  // Agrupar variáveis por categoria
  const catMap: Record<string, number> = {}
  variaveis.forEach(v => { catMap[v.categoria] = (catMap[v.categoria] || 0) + v.valor })
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  const corStatus = (f: Fixa) => {
    if (f.pago) return { bg: 'rgba(34,197,94,0.1)', txt: '#4ade80', label: 'pago' }
    if (f.dia_vencimento && f.dia_vencimento <= hoje.getDate() && mesSel === hoje.getMonth() + 1) return { bg: 'rgba(239,68,68,0.1)', txt: '#FCA5A5', label: 'vencida' }
    return { bg: 'rgba(255,255,255,0.05)', txt: '#9CA3AF', label: 'pendente' }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Despesas — P2</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Controle fixas e variáveis. Respeite o teto semanal.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + {aba === 'fixas' ? 'Nova fixa' : 'Lançar gasto'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Fixas do mês</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{fmt(totalFixas)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{fmt(totalPagas)} pagos</div>
        </div>
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Variáveis do mês</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: VERM }}>{fmt(totalVar)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{variaveis.length} lançamento(s)</div>
        </div>
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Variáveis esta semana</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: AMBER }}>{fmt(varSemana)}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Semana {semanaDoMes} do mês</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
        {(['fixas','variaveis'] as const).map(a => (
          <button key={a} onClick={() => setAba(a)} style={{
            flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 13,
            fontWeight: aba === a ? 600 : 400,
            background: aba === a ? '#0D0F1A' : 'transparent',
            color: aba === a ? '#fff' : '#6B7280',
            cursor: 'pointer',
          }}>
            {a === 'fixas' ? `🏠 Fixas (${fixas.length})` : `🛒 Variáveis (${variaveis.length})`}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Carregando...</div> : (

        aba === 'fixas' ? (
          fixas.length === 0 ? (
            <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏠</div>
              <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma despesa fixa para {MESES[mesSel-1]}</p>
              <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Adicionar despesa fixa</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {fixas.map(f => {
                const st = corStatus(f)
                return (
                  <div key={f.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{f.descricao}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: st.bg, color: st.txt }}>{st.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        {f.categoria}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{fmt(f.valor_mensal)}</div>
                      </div>
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
                )
              })}
            </div>
          )
        ) : (
          <div>
            {/* Resumo por categoria */}
            {cats.length > 0 && (
              <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Por categoria</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 8 }}>
                  {cats.map(([cat, val]) => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#9CA3AF' }}>{cat}</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{fmt(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {variaveis.length === 0 ? (
              <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🛒</div>
                <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhum gasto variável em {MESES[mesSel-1]}</p>
                <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Lançar primeiro gasto</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {variaveis.map(v => (
                  <div key={v.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{v.descricao}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {v.categoria} · {new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {contas.find(c => c.id === v.conta_id) ? ` · ${contas.find(c => c.id === v.conta_id)?.nome}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: VERM }}>{fmt(v.valor)}</span>
                      <button onClick={() => abrirEditarV(v)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => excluirV(v.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#FCA5A5', cursor: 'pointer' }}>Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>
              {aba === 'fixas' ? (editandoF ? 'Editar despesa fixa' : 'Nova despesa fixa') : (editandoV ? 'Editar gasto' : 'Lançar gasto variável')}
            </h2>

            {aba === 'fixas' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Categoria</label>
                    <select value={formF.categoria} onChange={e => setFormF(p => ({ ...p, categoria: e.target.value }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }}>
                      {CATS_FIXAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Dia vencimento</label>
                    <input type="number" min="1" max="31" value={formF.dia_vencimento || ''} onChange={e => setFormF(p => ({ ...p, dia_vencimento: parseInt(e.target.value) || null }))}
                      placeholder="Ex: 10"
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Descrição *</label>
                  <input value={formF.descricao} onChange={e => setFormF(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Aluguel, Plano de saúde..."
                    style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor mensal (R$)</label>
                    <input type="number" value={formF.valor_mensal} onChange={e => setFormF(p => ({ ...p, valor_mensal: parseFloat(e.target.value) || 0 }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                    <input type="checkbox" id="pago" checked={formF.pago} onChange={e => setFormF(p => ({ ...p, pago: e.target.checked }))} style={{ width: 18, height: 18, accentColor: INDIGO }} />
                    <label htmlFor="pago" style={{ fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Já pago</label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Categoria</label>
                    <select value={formV.categoria} onChange={e => setFormV(p => ({ ...p, categoria: e.target.value }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }}>
                      {CATS_VAR.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data</label>
                    <input type="date" value={formV.data} onChange={e => setFormV(p => ({ ...p, data: e.target.value }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Descrição *</label>
                  <input value={formV.descricao} onChange={e => setFormV(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Almoço, Camiseta, Remédio..."
                    style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor (R$) *</label>
                    <input type="number" value={formV.valor} onChange={e => setFormV(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                      style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Conta</label>
                    <select value={formV.conta_id} onChange={e => setFormV(p => ({ ...p, conta_id: e.target.value }))}
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