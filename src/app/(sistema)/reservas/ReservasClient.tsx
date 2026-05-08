'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERDE  = '#22c55e'
const AMBER  = '#f59e0b'

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

const TIPOS_INFO: Record<string, { label: string; desc: string; icon: string; cor: string }> = {
  emergencia:   { label: 'Reserva de Emergência', desc: 'Meta: 6x suas despesas fixas mensais. INTOCÁVEL — só use em emergência real.', icon: '🛡️', cor: INDIGO },
  meses_fracos: { label: 'Fundo de Meses Fracos', desc: 'Exclusivo para autônomo. Guarde nos meses bons para sobreviver nos ruins.', icon: '📦', cor: AMBER },
  investimento: { label: 'Investimentos',          desc: 'Invista após construir as reservas. CDB, Tesouro Direto, previdência.', icon: '📈', cor: VERDE },
  previdencia:  { label: 'Previdência Privada',    desc: 'Pensando no longo prazo. PGBL ou VGBL conforme seu perfil fiscal.', icon: '🏖️', cor: '#8b5cf6' },
}

interface Reserva { id: string; tipo: string; nome?: string; percentual: number; valor_acumulado: number; meta: number }
interface Aporte { id: string; valor: number; data: string }

export default function ReservasClient() {
  const [userId, setUserId]     = useState<string | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [receita, setReceita]   = useState(0)
  const [loading, setLoading]   = useState(true)

  // Modal editar
  const [editando, setEditando] = useState<Reserva | null>(null)
  const [modalEditar, setModalEditar] = useState(false)
  const [formNome, setFormNome] = useState('')
  const [formPct, setFormPct]   = useState(0)
  const [formMeta, setFormMeta] = useState(0)
  const [salvando, setSalvando] = useState(false)

  // Modal aporte
  const [modalAporte, setModalAporte]   = useState<Reserva | null>(null)
  const [aporteValor, setAporteValor]   = useState(0)
  const [aporteData, setAporteData]     = useState(new Date().toISOString().split('T')[0])
  const [salvandoAporte, setSalvandoAporte] = useState(false)

  // Modal histórico
  const [modalHistorico, setModalHistorico] = useState<Reserva | null>(null)
  const [historico, setHistorico]           = useState<Aporte[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // Modal nova reserva personalizada
  const [modalNova, setModalNova]   = useState(false)
  const [novaNome, setNovaNome]     = useState('')
  const [novaPct, setNovaPct]       = useState(5)
  const [novaMeta, setNovaMeta]     = useState(0)
  const [novaIcon, setNovaIcon]     = useState('💼')
  const [salvandoNova, setSalvandoNova] = useState(false)

  // Info oculta
  const [infoAberto, setInfoAberto] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const mes = new Date().getMonth() + 1
      const ano = new Date().getFullYear()
      const [r, rec] = await Promise.all([
        supabase.from('reservas_flow').select('*').eq('user_id', user.id),
        supabase.from('receitas_flow').select('valor_recebido').eq('user_id', user.id).eq('mes', mes).eq('ano', ano),
      ])
      setReservas(r.data || [])
      setReceita((rec.data || []).reduce((s: number, x: any) => s + x.valor_recebido, 0))
      setLoading(false)
    }
    carregar()
  }, [])

  function abrirEditar(r: Reserva) {
    setEditando(r)
    const info = TIPOS_INFO[r.tipo]
    setFormNome(r.nome || info?.label || r.tipo)
    setFormPct(r.percentual)
    setFormMeta(r.meta)
    setModalEditar(true)
  }

  async function salvarEditar() {
    if (!editando) return
    setSalvando(true)
    await supabase.from('reservas_flow').update({
      nome: formNome,
      percentual: formPct,
      meta: formMeta,
    }).eq('id', editando.id)
    setReservas(prev => prev.map(r => r.id === editando.id
      ? { ...r, nome: formNome, percentual: formPct, meta: formMeta }
      : r
    ))
    setSalvando(false)
    setModalEditar(false)
  }

  function abrirAporte(r: Reserva) {
    setModalAporte(r)
    setAporteValor(0)
    setAporteData(new Date().toISOString().split('T')[0])
  }

  async function confirmarAporte() {
    if (!modalAporte || aporteValor <= 0) return
    setSalvandoAporte(true)
    const novoAcum = modalAporte.valor_acumulado + aporteValor
    await Promise.all([
      supabase.from('reservas_flow').update({ valor_acumulado: novoAcum }).eq('id', modalAporte.id),
      supabase.from('aportes_reservas_flow').insert({
        user_id: userId,
        reserva_id: modalAporte.id,
        valor: aporteValor,
        data: aporteData,
      }),
    ])
    setReservas(prev => prev.map(r => r.id === modalAporte.id ? { ...r, valor_acumulado: novoAcum } : r))
    setSalvandoAporte(false)
    setModalAporte(null)
  }

  async function abrirHistorico(r: Reserva) {
    setModalHistorico(r)
    setLoadingHistorico(true)
    const { data } = await supabase.from('aportes_reservas_flow')
      .select('id, valor, data')
      .eq('reserva_id', r.id)
      .order('data', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  async function adicionarTipo(tipo: string) {
    if (!userId || reservas.find(r => r.tipo === tipo)) return
    const { data } = await supabase.from('reservas_flow').insert({
      user_id: userId, tipo, percentual: 5, valor_acumulado: 0, meta: 0,
    }).select().single()
    if (data) setReservas(prev => [...prev, data])
  }

  async function criarReservaPersonalizada() {
    if (!novaNome.trim() || !userId) return
    setSalvandoNova(true)
    const { data } = await supabase.from('reservas_flow').insert({
      user_id: userId,
      tipo: `custom_${Date.now()}`,
      nome: novaNome,
      percentual: novaPct,
      valor_acumulado: 0,
      meta: novaMeta,
    }).select().single()
    if (data) setReservas(prev => [...prev, data])
    setSalvandoNova(false)
    setModalNova(false)
    setNovaNome('')
    setNovaPct(5)
    setNovaMeta(0)
  }

  const totalAcumulado    = reservas.reduce((s, r) => s + r.valor_acumulado, 0)
  const totalAporteIdeal  = receita > 0 ? reservas.reduce((s, r) => s + (receita * r.percentual / 100), 0) : 0

  const inp: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }

  if (loading) return <div style={{ color: '#6B7280', padding: 40, textAlign: 'center' }}>Carregando...</div>

  const renderCard = (r: Reserva) => {
    const info = TIPOS_INFO[r.tipo]
    const label = r.nome || info?.label || r.tipo
    const desc  = info?.desc || ''
    const icon  = info?.icon || '💼'
    const cor   = info?.cor || INDIGO
    const pct   = r.meta > 0 ? Math.min(Math.round((r.valor_acumulado / r.meta) * 100), 100) : 0
    const aporteIdeal = receita > 0 ? receita * r.percentual / 100 : 0
    const isInfoAberto = infoAberto === r.id

    return (
      <div key={r.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px', cursor: 'pointer' }}
        onClick={() => abrirHistorico(r)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${cor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{label}</span>
                {desc && (
                  <button
                    onClick={e => { e.stopPropagation(); setInfoAberto(isInfoAberto ? null : r.id) }}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9CA3AF', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    i
                  </button>
                )}
              </div>
              {isInfoAberto && desc && (
                <div style={{ fontSize: 12, color: '#818CF8', marginTop: 4, maxWidth: 340, lineHeight: 1.5, background: 'rgba(79,70,229,0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(79,70,229,0.2)' }}>
                  {desc}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => abrirAporte(r)}
              style={{ background: `${cor}20`, border: `1px solid ${cor}40`, borderRadius: 8, padding: '7px 14px', fontSize: 13, color: cor, cursor: 'pointer', fontWeight: 600 }}>
              + Aporte
            </button>
            <button onClick={() => abrirEditar(r)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#9CA3AF', cursor: 'pointer' }}>
              Editar
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
          <div><div style={{ fontSize: 11, color: '#6B7280' }}>Acumulado</div><div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{fmt(r.valor_acumulado)}</div></div>
          <div><div style={{ fontSize: 11, color: '#6B7280' }}>Meta</div><div style={{ fontSize: 18, fontWeight: 600, color: r.meta > 0 ? cor : '#6B7280' }}>{r.meta > 0 ? fmt(r.meta) : '—'}</div></div>
          <div><div style={{ fontSize: 11, color: '#6B7280' }}>Aporte ideal/mês ({r.percentual}%)</div><div style={{ fontSize: 18, fontWeight: 600, color: cor }}>{fmt(aporteIdeal)}</div></div>
        </div>

        {r.meta > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
              <span>Progresso</span><span>{pct}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 4 }} />
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Reservas — P3</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Pague-se primeiro. Invista antes de gastar.</p>
        </div>
        <button onClick={() => setModalNova(true)}
          style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Nova reserva
        </button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Total acumulado em reservas</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{fmt(totalAcumulado)}</div>
        </div>
        <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Aporte ideal este mês ({receita > 0 ? fmt(receita) : 'sem receita'})</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: INDIGO }}>{fmt(totalAporteIdeal)}</div>
        </div>
      </div>

      {/* Dica */}
      <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#818CF8' }}>
        💡 Assim que receber qualquer valor, transfira ANTES de pagar qualquer coisa: 10% emergência → 10% meses fracos → 5-10% investimento.
      </div>

      {/* Cards de reserva */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14, marginBottom: 24 }}>
        {Object.entries(TIPOS_INFO).map(([tipo, info]) => {
          const r = reservas.find(x => x.tipo === tipo)
          if (!r) return (
            <div key={tipo} style={{ background: '#0D0F1A', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{info.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{info.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Não configurado</div>
                </div>
              </div>
              <button onClick={() => adicionarTipo(tipo)} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>+ Adicionar</button>
            </div>
          )
          return renderCard(r)
        })}

        {/* Reservas personalizadas */}
        {reservas.filter(r => !TIPOS_INFO[r.tipo]).map(r => renderCard(r))}
      </div>

      {/* MODAL EDITAR */}
      {modalEditar && editando && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModalEditar(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>
              Editar — {formNome}
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Nome</label>
              <input value={formNome} onChange={e => setFormNome(e.target.value)} style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>% da receita mensal</label>
              <input type="number" value={formPct} onChange={e => setFormPct(parseFloat(e.target.value) || 0)} style={inp} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Meta total (R$)</label>
              <input type="number" value={formMeta} onChange={e => setFormMeta(parseFloat(e.target.value) || 0)} style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalEditar(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarEditar} disabled={salvando} style={{ flex: 1, background: INDIGO, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: salvando ? 0.7 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL APORTE */}
      {modalAporte && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModalAporte(null)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Registrar aporte</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
              {modalAporte.nome || TIPOS_INFO[modalAporte.tipo]?.label} — acumulado: {fmt(modalAporte.valor_acumulado)}
            </p>
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
              <button onClick={confirmarAporte} disabled={salvandoAporte} style={{ flex: 1, background: INDIGO, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: salvandoAporte ? 0.7 : 1 }}>
                {salvandoAporte ? 'Salvando...' : 'Confirmar aporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO */}
      {modalHistorico && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModalHistorico(null)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
              {modalHistorico.nome || TIPOS_INFO[modalHistorico.tipo]?.label}
            </h2>
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
                    <span style={{ fontSize: 15, fontWeight: 600, color: VERDE }}>+ {fmt(a.valor)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '12px 16px', background: 'rgba(79,70,229,0.08)', borderRadius: 10, border: '1px solid rgba(79,70,229,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#818CF8', fontWeight: 600 }}>Total em aportes</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#818CF8' }}>{fmt(historico.reduce((s, a) => s + a.valor, 0))}</span>
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

      {/* MODAL NOVA RESERVA */}
      {modalNova && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModalNova(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>Nova reserva personalizada</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Nome da reserva *</label>
              <input value={novaNome} onChange={e => setNovaNome(e.target.value)} placeholder="Ex: Férias, Carro novo..." style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>% da receita mensal</label>
                <input type="number" value={novaPct} onChange={e => setNovaPct(parseFloat(e.target.value) || 0)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Meta total (R$)</label>
                <input type="number" value={novaMeta} onChange={e => setNovaMeta(parseFloat(e.target.value) || 0)} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Ícone</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {['💼','🏠','🚗','✈️','🎓','💍','🎯','📱','🌴','💡','🏋️','🎸'].map(ic => (
                  <button key={ic} onClick={() => setNovaIcon(ic)}
                    style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${novaIcon === ic ? INDIGO : 'rgba(255,255,255,0.1)'}`, background: novaIcon === ic ? 'rgba(79,70,229,0.15)' : 'transparent', fontSize: 18, cursor: 'pointer' }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalNova(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={criarReservaPersonalizada} disabled={salvandoNova} style={{ flex: 1, background: INDIGO, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: salvandoNova ? 0.7 : 1 }}>
                {salvandoNova ? 'Criando...' : 'Criar reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}