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

interface Reserva { id: string; tipo: string; percentual: number; valor_acumulado: number; meta: number }

export default function ReservasClient() {
  const [userId, setUserId]   = useState<string | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [receita, setReceita] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Reserva | null>(null)
  const [modal, setModal]     = useState(false)
  const [formPct, setFormPct] = useState(0)
  const [formMeta, setFormMeta] = useState(0)
  const [formAcum, setFormAcum] = useState(0)
  const [salvando, setSalvando] = useState(false)

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
    setFormPct(r.percentual)
    setFormMeta(r.meta)
    setFormAcum(r.valor_acumulado)
    setModal(true)
  }

  async function salvar() {
    if (!editando) return
    setSalvando(true)
    await supabase.from('reservas_flow').update({
      percentual: formPct, meta: formMeta, valor_acumulado: formAcum,
    }).eq('id', editando.id)
    setReservas(prev => prev.map(r => r.id === editando.id
      ? { ...r, percentual: formPct, meta: formMeta, valor_acumulado: formAcum }
      : r
    ))
    setSalvando(false)
    setModal(false)
  }

  async function adicionarTipo(tipo: string) {
    if (!userId || reservas.find(r => r.tipo === tipo)) return
    const { data } = await supabase.from('reservas_flow').insert({
      user_id: userId, tipo, percentual: 5, valor_acumulado: 0, meta: 0,
    }).select().single()
    if (data) setReservas(prev => [...prev, data])
  }

  const totalAcumulado = reservas.reduce((s, r) => s + r.valor_acumulado, 0)
  const totalAporteIdeal = receita > 0 ? reservas.reduce((s, r) => s + (receita * r.percentual / 100), 0) : 0

  if (loading) return <div style={{ color: '#6B7280', padding: 40, textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Reservas — P3</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Pague-se primeiro. Invista antes de gastar.</p>
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
          const pct = r.meta > 0 ? Math.min(Math.round((r.valor_acumulado / r.meta) * 100), 100) : 0
          const aporteIdeal = receita > 0 ? receita * r.percentual / 100 : 0
          return (
            <div key={tipo} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${info.cor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{info.icon}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, maxWidth: 380 }}>{info.desc}</div>
                  </div>
                </div>
                <button onClick={() => abrirEditar(r)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: '#9CA3AF', cursor: 'pointer' }}>Editar</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
                <div><div style={{ fontSize: 11, color: '#6B7280' }}>Acumulado</div><div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{fmt(r.valor_acumulado)}</div></div>
                <div><div style={{ fontSize: 11, color: '#6B7280' }}>Meta</div><div style={{ fontSize: 18, fontWeight: 600, color: r.meta > 0 ? info.cor : '#6B7280' }}>{r.meta > 0 ? fmt(r.meta) : '—'}</div></div>
                <div><div style={{ fontSize: 11, color: '#6B7280' }}>Aporte ideal/mês ({r.percentual}%)</div><div style={{ fontSize: 18, fontWeight: 600, color: info.cor }}>{fmt(aporteIdeal)}</div></div>
              </div>

              {r.meta > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                    <span>Progresso</span><span>{pct}%</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: info.cor, borderRadius: 4 }} />
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modal && editando && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 24 }}>
              Editar — {TIPOS_INFO[editando.tipo]?.label}
            </h2>
            {[
              { label: '% da receita mensal', val: formPct, set: setFormPct },
              { label: 'Valor acumulado hoje (R$)', val: formAcum, set: setFormAcum },
              { label: 'Meta total (R$)', val: formMeta, set: setFormMeta },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input type="number" value={f.val} onChange={e => f.set(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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