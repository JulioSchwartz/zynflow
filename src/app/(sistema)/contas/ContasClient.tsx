'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const TIPOS = ['corrente', 'poupanca', 'carteira', 'investimento', 'outro']
const CORES = ['#4F46E5','#7C3AED','#DB2777','#DC2626','#D97706','#059669','#0891B2','#374151']
const BANCOS = ['Nubank','Itaú','Bradesco','Banco do Brasil','Caixa','Santander','Inter','C6 Bank','Sicoob','XP','Rico','Outro']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Conta {
  id: string
  nome: string
  tipo: string
  banco: string | null
  cor: string
  saldo_inicial: number
}

const VAZIO: Omit<Conta, 'id'> = { nome: '', tipo: 'corrente', banco: '', cor: INDIGO, saldo_inicial: 0 }

export default function ContasClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Conta | null>(null)
  const [form, setForm] = useState<Omit<Conta, 'id'>>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('contas_flow').select('*').eq('user_id', user.id).order('criado_em')
      setContas(data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  function abrirNova() {
    setEditando(null)
    setForm(VAZIO)
    setErro('')
    setModal(true)
  }

  function abrirEditar(c: Conta) {
    setEditando(c)
    setForm({ nome: c.nome, tipo: c.tipo, banco: c.banco || '', cor: c.cor, saldo_inicial: c.saldo_inicial })
    setErro('')
    setModal(true)
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Informe o nome da conta.'); return }
    setSalvando(true)
    setErro('')

    if (editando) {
      const { error } = await supabase.from('contas_flow').update({
        nome: form.nome, tipo: form.tipo, banco: form.banco, cor: form.cor, saldo_inicial: form.saldo_inicial,
      }).eq('id', editando.id)
      if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }
      setContas(prev => prev.map(c => c.id === editando.id ? { ...c, ...form } : c))
    } else {
      const { data, error } = await supabase.from('contas_flow').insert({
        user_id: userId, nome: form.nome, tipo: form.tipo,
        banco: form.banco, cor: form.cor, saldo_inicial: form.saldo_inicial,
      }).select().single()
      if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }
      setContas(prev => [...prev, data])
    }
    setSalvando(false)
    setModal(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta conta? Os lançamentos vinculados serão mantidos.')) return
    await supabase.from('contas_flow').delete().eq('id', id)
    setContas(prev => prev.filter(c => c.id !== id))
  }

  const saldoTotal = contas.reduce((s, c) => s + (c.saldo_inicial || 0), 0)

  if (loading) return <div style={{ color: '#6B7280', padding: 40, textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        .contas-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .contas-card-right {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .contas-card-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .contas-card-right {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Contas bancárias</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Gerencie suas contas e carteiras</p>
        </div>
        <button onClick={abrirNova} style={{
          background: INDIGO, color: '#fff', border: 'none',
          borderRadius: 8, padding: '9px 18px', fontSize: 13,
          fontWeight: 600, cursor: 'pointer',
        }}>+ Nova conta</button>
      </div>

      {/* Saldo total */}
      <div style={{
        background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Saldo total em contas</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{fmt(saldoTotal)}</div>
        </div>
        <div style={{ fontSize: 32 }}>🏦</div>
      </div>

      {/* Lista */}
      {contas.length === 0 ? (
        <div style={{
          background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💳</div>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma conta cadastrada ainda</p>
          <button onClick={abrirNova} style={{
            background: INDIGO, color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}>Adicionar primeira conta</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {contas.map(c => (
            <div key={c.id} style={{
              background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '16px 20px',
            }}>
              <div className="contas-card-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${c.cor}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: c.cor, flexShrink: 0,
                  }}>
                    {c.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {c.banco ? `${c.banco} · ` : ''}{c.tipo}
                    </div>
                  </div>
                </div>
                <div className="contas-card-right">
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{fmt(c.saldo_inicial)}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>saldo inicial</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => abrirEditar(c)} style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer',
                    }}>Editar</button>
                    <button onClick={() => excluir(c.id)} style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#FCA5A5', cursor: 'pointer',
                    }}>Excluir</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
        }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{
            background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>
              {editando ? 'Editar conta' : 'Nova conta'}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Nome da conta *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Nubank, Carteira, Poupança"
                style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                  style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Banco</label>
                <select value={form.banco || ''} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))}
                  style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }}>
                  <option value="">Selecione...</option>
                  {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Saldo inicial (R$)</label>
              <input
                type="number"
                value={form.saldo_inicial}
                onChange={e => setForm(p => ({ ...p, saldo_inicial: parseFloat(e.target.value) || 0 }))}
                style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Cor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CORES.map(cor => (
                  <div key={cor} onClick={() => setForm(p => ({ ...p, cor }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: cor, cursor: 'pointer',
                      border: form.cor === cor ? '3px solid #fff' : '3px solid transparent' }} />
                ))}
              </div>
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