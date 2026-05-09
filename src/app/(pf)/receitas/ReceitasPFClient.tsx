'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERDE  = '#22c55e'
const AMBER  = '#f59e0b'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FONTES_SUGERIDAS = ['Salário', '13º Salário', 'Férias', 'PLR', 'Hora Extra', 'Bônus', 'Aluguel', 'Dividendos', 'Outros']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

interface Receita {
  id: string
  fonte: string
  data_prevista: string | null
  valor_previsto: number
  data_recebida: string | null
  valor_recebido: number
  status: string
  observacoes: string | null
  mes: number
  ano: number
}

const VAZIO = { fonte: '', data_prevista: '', valor_previsto: 0, data_recebida: '', valor_recebido: 0, status: 'pendente', observacoes: '' }

export default function ReceitasPFClient() {
  const hoje = new Date()
  const [userId, setUserId]       = useState<string | null>(null)
  const [mesSel, setMesSel]       = useState(hoje.getMonth() + 1)
  const [anoSel, setAnoSel]       = useState(hoje.getFullYear())
  const [receitas, setReceitas]   = useState<Receita[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editando, setEditando]   = useState<Receita | null>(null)
  const [form, setForm]           = useState(VAZIO)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')

  async function carregar(uid: string, mes: number, ano: number) {
    setLoading(true)
    const { data } = await supabase.from('receitas_flow').select('*')
      .eq('user_id', uid).eq('mes', mes).eq('ano', ano).order('criado_em')
    setReceitas(data || [])
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

  useEffect(() => {
    if (userId) carregar(userId, mesSel, anoSel)
  }, [mesSel, anoSel])

  function abrirNova() { setEditando(null); setForm(VAZIO); setErro(''); setModal(true) }

  function abrirEditar(r: Receita) {
    setEditando(r)
    setForm({ fonte: r.fonte, data_prevista: r.data_prevista || '', valor_previsto: r.valor_previsto, data_recebida: r.data_recebida || '', valor_recebido: r.valor_recebido, status: r.status, observacoes: r.observacoes || '' })
    setErro('')
    setModal(true)
  }

  async function salvar() {
    if (!form.fonte.trim()) { setErro('Informe a fonte da receita.'); return }
    setSalvando(true); setErro('')
    const payload = {
      fonte: form.fonte, data_prevista: form.data_prevista || null,
      valor_previsto: form.valor_previsto, data_recebida: form.data_recebida || null,
      valor_recebido: form.valor_recebido, status: form.valor_recebido > 0 ? 'recebido' : form.status,
      observacoes: form.observacoes || null, mes: mesSel, ano: anoSel,
    }
    if (editando) {
      await supabase.from('receitas_flow').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('receitas_flow').insert({ ...payload, user_id: userId })
    }
    await carregar(userId!, mesSel, anoSel)
    setSalvando(false); setModal(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta receita?')) return
    await supabase.from('receitas_flow').delete().eq('id', id)
    setReceitas(prev => prev.filter(r => r.id !== id))
  }

  async function marcarRecebido(r: Receita) {
    await supabase.from('receitas_flow').update({ valor_recebido: r.valor_previsto, data_recebida: new Date().toISOString().split('T')[0], status: 'recebido' }).eq('id', r.id)
    await carregar(userId!, mesSel, anoSel)
  }

  const totalPrevisto = receitas.reduce((s, r) => s + r.valor_previsto, 0)
  const totalRecebido = receitas.reduce((s, r) => s + r.valor_recebido, 0)
  const pct = totalPrevisto > 0 ? Math.round((totalRecebido / totalPrevisto) * 100) : 0

  const corStatus = (s: string) => s === 'recebido' ? { bg: 'rgba(34,197,94,0.1)', txt: '#4ade80', label: 'recebido' }
    : s === 'parcial' ? { bg: 'rgba(245,158,11,0.1)', txt: '#FCD34D', label: 'parcial' }
    : { bg: 'rgba(255,255,255,0.05)', txt: '#9CA3AF', label: 'pendente' }

  const inp: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <style>{`
        .rec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .rec-header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .rec-kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
        .rec-card-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .rec-card-actions { display: flex; gap: 8px; align-items: center; margin-left: 16px; flex-shrink: 0; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .rec-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .rec-kpis { grid-template-columns: repeat(2, 1fr); }
          .rec-card-row { flex-direction: column; gap: 10px; }
          .rec-card-actions { margin-left: 0; width: 100%; }
          .rec-card-actions button { flex: 1; }
        }
      `}</style>

      <div className="rec-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Receitas</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Salário, benefícios e outras entradas do mês.</p>
        </div>
        <div className="rec-header-actions">
          <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova receita
          </button>
        </div>
      </div>

      <div className="rec-kpis">
        {[
          { label: 'Previsto', valor: fmt(totalPrevisto), cor: '#fff' },
          { label: 'Recebido', valor: fmt(totalRecebido), cor: VERDE },
          { label: 'Pendente', valor: fmt(Math.max(totalPrevisto - totalRecebido, 0)), cor: AMBER },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: k.cor }}>{k.valor}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Receitas recebidas vs previstas</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: pct >= 80 ? VERDE : pct >= 50 ? AMBER : '#ef4444' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 80 ? VERDE : pct >= 50 ? AMBER : '#ef4444', borderRadius: 4 }} />
        </div>
        <p style={{ fontSize: 12, color: '#4B5563', marginTop: 8 }}>💡 Lembre-se: benefícios como VA, VT e plano de saúde também são parte da sua remuneração!</p>
      </div>

      {loading ? <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Carregando...</div>
      : receitas.length === 0 ? (
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma receita lançada para {MESES[mesSel-1]}</p>
          <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Lançar primeira receita
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {receitas.map(r => {
            const st = corStatus(r.status)
            return (
              <div key={r.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px' }}>
                <div className="rec-card-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{r.fonte}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: st.bg, color: st.txt }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                      Previsto: {fmt(r.valor_previsto)}
                      {r.data_prevista ? ` · até ${new Date(r.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                      {r.valor_recebido > 0 ? ` · Recebido: ${fmt(r.valor_recebido)}` : ''}
                    </div>
                    {r.observacoes && <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{r.observacoes}</div>}
                  </div>
                  <div className="rec-card-actions">
                    {r.status !== 'recebido' && (
                      <button onClick={() => marcarRecebido(r)} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#4ade80', cursor: 'pointer' }}>✓ Recebi</button>
                    )}
                    <button onClick={() => abrirEditar(r)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => excluir(r.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#FCA5A5', cursor: 'pointer' }}>Excluir</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>{editando ? 'Editar receita' : 'Nova receita'}</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Fonte da receita *</label>
              <input list="fontes-pf" value={form.fonte} onChange={e => setForm(p => ({ ...p, fonte: e.target.value }))}
                placeholder="Ex: Salário, 13º, Férias..."
                style={inp} />
              <datalist id="fontes-pf">{FONTES_SUGERIDAS.map(f => <option key={f} value={f} />)}</datalist>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor previsto (R$)</label>
                <input type="number" value={form.valor_previsto} onChange={e => setForm(p => ({ ...p, valor_previsto: parseFloat(e.target.value) || 0 }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data prevista</label>
                <input type="date" value={form.data_prevista} onChange={e => setForm(p => ({ ...p, data_prevista: e.target.value }))} style={inp} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor recebido (R$)</label>
                <input type="number" value={form.valor_recebido} onChange={e => setForm(p => ({ ...p, valor_recebido: parseFloat(e.target.value) || 0 }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data recebida</label>
                <input type="date" value={form.data_recebida} onChange={e => setForm(p => ({ ...p, data_recebida: e.target.value }))} style={inp} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Observações</label>
              <input value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                placeholder="Opcional..." style={inp} />
            </div>

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
