'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERDE  = '#22c55e'
const VERM   = '#ef4444'
const AMBER  = '#f59e0b'
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

interface MesData {
  mes: number
  receita: number
  fixas: number
  variaveis: number
  saldo: number
}

export default function HistoricoClient() {
  const hoje = new Date()
  const [userId, setUserId]   = useState<string | null>(null)
  const [anoSel, setAnoSel]   = useState(hoje.getFullYear())
  const [dados, setDados]     = useState<MesData[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null)

  async function carregar(uid: string, ano: number) {
    setLoading(true)
    const [rec, fix, vari] = await Promise.all([
      supabase.from('receitas_flow').select('mes, valor_recebido').eq('user_id', uid).eq('ano', ano),
      supabase.from('despesas_fixas_flow').select('mes, valor_mensal').eq('user_id', uid).eq('ano', ano),
      supabase.from('despesas_variaveis_flow').select('mes, valor').eq('user_id', uid).eq('ano', ano),
    ])

    const meses: MesData[] = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const receita  = (rec.data  || []).filter((r: any) => r.mes === m).reduce((s: number, r: any) => s + r.valor_recebido, 0)
      const fixas    = (fix.data  || []).filter((r: any) => r.mes === m).reduce((s: number, r: any) => s + r.valor_mensal, 0)
      const variaveis = (vari.data || []).filter((r: any) => r.mes === m).reduce((s: number, r: any) => s + r.valor, 0)
      return { mes: m, receita, fixas, variaveis, saldo: receita - fixas - variaveis }
    })

    setDados(meses)
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await carregar(user.id, anoSel)
    }
    init()
  }, [])

  useEffect(() => { if (userId) carregar(userId, anoSel) }, [anoSel])

  const totalReceita  = dados.reduce((s, d) => s + d.receita, 0)
  const totalFixas    = dados.reduce((s, d) => s + d.fixas, 0)
  const totalVar      = dados.reduce((s, d) => s + d.variaveis, 0)
  const totalSaldo    = dados.reduce((s, d) => s + d.saldo, 0)
  const maxReceita    = Math.max(...dados.map(d => d.receita), 1)

  const mesAtual = dados.find(d => d.mes === mesSelecionado)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Histórico Anual</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Veja suas sazonalidades e planeje os meses fracos</p>
        </div>
        <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
          style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
          {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* KPIs anuais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Receita total', val: totalReceita, cor: VERDE },
          { label: 'Fixas total', val: totalFixas, cor: '#fff' },
          { label: 'Variáveis total', val: totalVar, cor: VERM },
          { label: 'Saldo acumulado', val: totalSaldo, cor: totalSaldo >= 0 ? VERDE : VERM },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: k.cor }}>{fmt(k.val)}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de barras */}
      {loading ? <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Carregando...</div> : (
        <>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '24px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 20 }}>Receita vs Gastos por mês</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, paddingBottom: 24, position: 'relative' as const }}>
              {/* Linha de base */}
              <div style={{ position: 'absolute' as const, bottom: 24, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              {dados.map(d => {
                const maxVal = Math.max(...dados.map(x => Math.max(x.receita, x.fixas + x.variaveis)), 1)
                const pctRec  = d.receita > 0 ? Math.max((d.receita / maxVal) * 120, 6) : 0
                const pctGast = (d.fixas + d.variaveis) > 0 ? Math.max(((d.fixas + d.variaveis) / maxVal) * 120, 6) : 0
                const temDados = d.receita > 0 || d.fixas > 0 || d.variaveis > 0
                const isMes = d.mes === hoje.getMonth() + 1 && anoSel === hoje.getFullYear()
                const selecionado = mesSelecionado === d.mes
                return (
                  <div key={d.mes} onClick={() => setMesSelecionado(selecionado ? null : d.mes)}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: 'pointer', opacity: mesSelecionado && !selecionado ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center', marginBottom: 4 }}>
                      <div style={{ width: '42%', height: pctRec, minHeight: temDados && d.receita > 0 ? 6 : 0, background: VERDE, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' }} />
                      <div style={{ width: '42%', height: pctGast, minHeight: temDados && (d.fixas + d.variaveis) > 0 ? 6 : 0, background: VERM, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: 9, color: isMes ? '#818CF8' : selecionado ? '#fff' : '#4B5563', fontWeight: isMes || selecionado ? 700 : 400, whiteSpace: 'nowrap' as const }}>{MESES[d.mes - 1]}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: VERDE, display: 'inline-block' }} />Receita</span>
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: VERM, display: 'inline-block' }} />Gastos</span>
            </div>
          </div>

          {/* Detalhe do mês selecionado */}
          {mesSelecionado && mesAtual && (
            <div style={{ background: '#0D0F1A', border: `1px solid ${INDIGO}40`, borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16 }}>
                {MESES_FULL[mesSelecionado - 1]} {anoSel}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Receita', val: mesAtual.receita, cor: VERDE },
                  { label: 'Fixas', val: mesAtual.fixas, cor: '#fff' },
                  { label: 'Variáveis', val: mesAtual.variaveis, cor: VERM },
                  { label: 'Saldo', val: mesAtual.saldo, cor: mesAtual.saldo >= 0 ? VERDE : VERM },
                ].map(k => (
                  <div key={k.label}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: k.cor }}>{fmt(k.val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela */}
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Mês','Receita','Fixas','Variáveis','Saldo'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left' as const, fontSize: 12, fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((d, i) => {
                  const isAtual = d.mes === hoje.getMonth() + 1 && anoSel === hoje.getFullYear()
                  const temDados = d.receita > 0 || d.fixas > 0 || d.variaveis > 0
                  return (
                    <tr key={d.mes} style={{
                      borderBottom: i < 11 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isAtual ? 'rgba(79,70,229,0.06)' : 'transparent',
                      opacity: temDados || isAtual ? 1 : 0.4,
                    }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: isAtual ? '#818CF8' : '#E5E7EB', fontWeight: isAtual ? 600 : 400 }}>
                        {MESES_FULL[d.mes - 1]}{isAtual ? ' ←' : ''}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: d.receita > 0 ? VERDE : '#4B5563', fontWeight: 500 }}>{temDados || isAtual ? fmt(d.receita) : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: d.fixas > 0 ? '#E5E7EB' : '#4B5563' }}>{temDados || isAtual ? fmt(d.fixas) : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: d.variaveis > 0 ? VERM : '#4B5563' }}>{temDados || isAtual ? fmt(d.variaveis) : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: d.saldo > 0 ? VERDE : d.saldo < 0 ? VERM : '#4B5563', fontWeight: 600 }}>
                        {temDados || isAtual ? fmt(d.saldo) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, color: '#4B5563', marginTop: 12, textAlign: 'center' as const }}>
            💡 Olhe para este histórico trimestralmente. Você verá seus meses fracos, sazonalidades e tendências.
          </p>
        </>
      )}
    </div>
  )
}