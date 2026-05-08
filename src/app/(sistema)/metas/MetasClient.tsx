'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const CORES  = ['#4F46E5','#7C3AED','#DB2777','#DC2626','#D97706','#059669','#0891B2','#374151','#f59e0b','#10b981']
const ICONES = ['🎯','🏠','🚗','✈️','💻','📱','🎓','💍','🏖️','💰','🛡️','📦']

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

interface Meta { id: string; nome: string; valor_alvo: number; valor_atual: number; prazo: string | null; cor: string; icone: string; status: string }
interface Aporte { id: string; valor: number; data: string }

const VAZIO = { nome: '', valor_alvo: 0, valor_atual: 0, prazo: '', cor: INDIGO, icone: '🎯', status: 'ativa' }

export default function MetasClient() {
  const [userId, setUserId]   = useState<string | null>(null)
  const [metas, setMetas]     = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [modalAporte, setModalAporte] = useState<Meta | null>(null)
  const [modalHistorico, setModalHistorico] = useState<Meta | null>(null)
  const [historico, setHistorico]           = useState<Aporte[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [editando, setEditando] = useState<Meta | null>(null)
  const [form, setForm]       = useState(VAZIO)
  const [aporteValor, setAporteValor] = useState(0)
  const [aporteData, setAporteData]   = useState(new Date().toISOString().split('T')[0])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]       = useState('')
  const [filtro, setFiltro]   = useState<'ativa' | 'concluida' | 'todas'>('ativa')

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('metas_flow').select('*').eq('user_id', user.id).order('criado_em', { ascending: false })
      setMetas(data || [])
      setLoading(false)
    }
    carregar()
  }, [])

  function abrirNova() { setEditando(null); setForm(VAZIO); setErro(''); setModal(true) }

  function abrirEditar(m: Meta) {
    setEditando(m)
    setForm({ nome: m.nome, valor_alvo: m.valor_alvo, valor_atual: m.valor_atual, prazo: m.prazo || '', cor: m.cor, icone: m.icone, status: m.status })
    setErro(''); setModal(true)
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Informe o nome da meta.'); return }
    if (form.valor_alvo <= 0) { setErro('Informe o valor alvo.'); return }
    setSalvando(true); setErro('')
    const payload = { nome: form.nome, valor_alvo: form.valor_alvo, valor_atual: form.valor_atual, prazo: form.prazo || null, cor: form.cor, icone: form.icone, status: form.status }
    if (editando) {
      await supabase.from('metas_flow').update(payload).eq('id', editando.id)
      setMetas(prev => prev.map(m => m.id === editando.id ? { ...m, ...payload } : m))
    } else {
      const { data } = await supabase.from('metas_flow').insert({ ...payload, user_id: userId }).select().single()
      if (data) setMetas(prev => [data, ...prev])
    }
    setSalvando(false); setModal(false)
  }

  function abrirAporte(m: Meta) {
    setModalAporte(m)
    setAporteValor(0)
    setAporteData(new Date().toISOString().split('T')[0])
  }

  async function fazerAporte() {
    if (!modalAporte || aporteValor <= 0) return
    setSalvando(true)
    const novoValor = Math.min(modalAporte.valor_atual + aporteValor, modalAporte.valor_alvo)
    const novoStatus = novoValor >= modalAporte.valor_alvo ? 'concluida' : 'ativa'
    await Promise.all([
      supabase.from('metas_flow').update({ valor_atual: novoValor, status: novoStatus }).eq('id', modalAporte.id),
      supabase.from('aportes_metas_flow').insert({
        user_id: userId,
        meta_id: modalAporte.id,
        valor: aporteValor,
        data: aporteData,
      }),
    ])
    setMetas(prev => prev.map(m => m.id === modalAporte.id ? { ...m, valor_atual: novoValor, status: novoStatus } : m))
    setSalvando(false); setModalAporte(null); setAporteValor(0)
  }

  async function abrirHistorico(m: Meta) {
    setModalHistorico(m)
    setLoadingHistorico(true)
    const { data } = await supabase.from('aportes_metas_flow')
      .select('id, valor, data')
      .eq('meta_id', m.id)
      .order('data', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta meta?')) return
    await supabase.from('metas_flow').delete().eq('id', id)
    setMetas(prev => prev.filter(m => m.id !== id))
  }

  const metasFiltradas = metas.filter(m => filtro === 'todas' || m.status === filtro)
  const totalAcumulado = metas.filter(m => m.status === 'ativa').reduce((s, m) => s + m.valor_atual, 0)

  const inp: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }

  if (loading) return <div style={{ color: '#6B7280', padding: 40, textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Metas financeiras</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Defina objetivos e acompanhe o progresso</p>
        </div>
        <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nova meta</button>
      </div>

      {/* Resumo */}
      {metas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Metas ativas</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{metas.filter(m => m.status === 'ativa').length}</div>
          </div>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Acumulado (ativas)</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: INDIGO }}>{fmt(totalAcumulado)}</div>
          </div>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Metas concluídas</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#22c55e' }}>{metas.filter(m => m.status === 'concluida').length}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['ativa','concluida','todas'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '7px 16px', borderRadius: 8, border: '1px solid',
            borderColor: filtro === f ? INDIGO : 'rgba(255,255,255,0.1)',
            background: filtro === f ? 'rgba(79,70,229,0.15)' : 'transparent',
            color: filtro === f ? '#818CF8' : '#6B7280',
            fontSize: 13, cursor: 'pointer',
          }}>
            {f === 'ativa' ? 'Ativas' : f === 'concluida' ? 'Concluídas' : 'Todas'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {metasFiltradas.length === 0 ? (
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma meta {filtro !== 'todas' ? filtro : ''} ainda</p>
          <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Criar primeira meta</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px,1fr))', gap: 14 }}>
          {metasFiltradas.map(m => {
            const pct = m.valor_alvo > 0 ? Math.min(Math.round((m.valor_atual / m.valor_alvo) * 100), 100) : 0
            const concluida = m.status === 'concluida'
            return (
              <div key={m.id}
                onClick={() => abrirHistorico(m)}
                style={{ background: '#0D0F1A', border: `1px solid ${concluida ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '20px 22px', opacity: concluida ? 0.85 : 1, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.cor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.icone}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{m.nome}</div>
                      {m.prazo && <div style={{ fontSize: 12, color: '#6B7280' }}>Prazo: {new Date(m.prazo + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>}
                    </div>
                  </div>
                  {concluida && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>✓ Concluída</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: '#9CA3AF' }}>{fmt(m.valor_atual)}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{fmt(m.valor_alvo)}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: concluida ? '#22c55e' : m.cor, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>{pct}% — faltam {fmt(Math.max(m.valor_alvo - m.valor_atual, 0))}</div>

                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  {!concluida && (
                    <button onClick={() => abrirAporte(m)} style={{ flex: 1, background: `${m.cor}20`, border: `1px solid ${m.cor}40`, borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600, color: m.cor, cursor: 'pointer' }}>+ Aporte</button>
                  )}
                  <button onClick={() => abrirEditar(m)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#9CA3AF', cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => excluir(m.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#FCA5A5', cursor: 'pointer' }}>Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>{editando ? 'Editar meta' : 'Nova meta'}</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Nome da meta *</label>
              <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Notebook, Viagem, Reserva..." style={inp} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor alvo (R$) *</label>
                <input type="number" value={form.valor_alvo} onChange={e => setForm(p => ({ ...p, valor_alvo: parseFloat(e.target.value) || 0 }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Já tenho (R$)</label>
                <input type="number" value={form.valor_atual} onChange={e => setForm(p => ({ ...p, valor_atual: parseFloat(e.target.value) || 0 }))} style={inp} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Prazo (opcional)</label>
              <input type="date" value={form.prazo} onChange={e => setForm(p => ({ ...p, prazo: e.target.value }))} style={inp} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Ícone</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {ICONES.map(ic => (
                  <button key={ic} onClick={() => setForm(p => ({ ...p, icone: ic }))} style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${form.icone === ic ? INDIGO : 'rgba(255,255,255,0.1)'}`, background: form.icone === ic ? 'rgba(79,70,229,0.15)' : 'transparent', fontSize: 18, cursor: 'pointer' }}>{ic}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Cor</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CORES.map(cor => (
                  <div key={cor} onClick={() => setForm(p => ({ ...p, cor }))} style={{ width: 26, height: 26, borderRadius: '50%', background: cor, cursor: 'pointer', border: form.cor === cor ? '3px solid #fff' : '3px solid transparent' }} />
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

      {/* Modal aporte */}
      {modalAporte && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModalAporte(null)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Fazer aporte</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>{modalAporte.nome} — {fmt(modalAporte.valor_atual)} de {fmt(modalAporte.valor_alvo)}</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor do aporte (R$)</label>
              <input type="number" value={aporteValor} onChange={e => setAporteValor(parseFloat(e.target.value) || 0)} autoFocus style={inp} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data</label>
              <input type="date" value={aporteData} onChange={e => setAporteData(e.target.value)} style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalAporte(null)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={fazerAporte} disabled={salvando} style={{ flex: 1, background: INDIGO, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Confirmar aporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal histórico */}
      {modalHistorico && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModalHistorico(null)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>{modalHistorico.icone}</span>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>{modalHistorico.nome}</h2>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Histórico de aportes</p>

            {loadingHistorico ? (
              <p style={{ color: '#6B7280', textAlign: 'center' }}>Carregando...</p>
            ) : historico.length === 0 ? (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '24px 0' }}>Nenhum aporte registrado ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {historico.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                      {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#22c55e' }}>+ {fmt(a.valor)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '12px 16px', background: `${modalHistorico.cor}15`, borderRadius: 10, border: `1px solid ${modalHistorico.cor}30`, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: modalHistorico.cor, fontWeight: 600 }}>Total em aportes</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: modalHistorico.cor }}>{fmt(historico.reduce((s, a) => s + a.valor, 0))}</span>
                </div>
              </div>
            )}

            <button onClick={() => setModalHistorico(null)}
              style={{ width: '100%', marginTop: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}