'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const PERGUNTAS: Record<string, { label: string; perguntas: string[] }> = {
  segunda: {
    label: '🟦 Segunda — Início da Semana',
    perguntas: [
      'Quanto recebi nesta semana? Anotei tudo.',
      'Quais contas vencem esta semana? Verifiquei o calendário.',
      'Tenho saldo suficiente para pagar tudo?',
      'Fiz alguma proposta ou venda nova?',
      'Minha reserva de emergência está intocada?',
    ],
  },
  quarta: {
    label: '🟨 Quarta — Meio da Semana',
    perguntas: [
      'Revisei todos os gastos desde segunda?',
      'Gastei mais do que planejei em alguma categoria?',
      'Tenho fatura de cartão acumulando?',
      'Enviei cobranças e propostas pendentes?',
      'Estou dentro do orçamento semanal?',
    ],
  },
  domingo: {
    label: '🟩 Domingo — Fechamento da Semana',
    perguntas: [
      'Fechei todos os gastos da semana no Zynflow?',
      'Qual foi minha receita real vs prevista?',
      'Transferi para reserva/investimento?',
      'Alguma surpresa financeira? O que causou?',
      'Minha meta do mês está no caminho certo?',
    ],
  },
}

export default function ChecklistPFClient() {
  const hoje = new Date()
  const [userId, setUserId]   = useState<string | null>(null)
  const [mesSel, setMesSel]   = useState(hoje.getMonth() + 1)
  const [anoSel, setAnoSel]   = useState(hoje.getFullYear())
  const [semanaSel, setSemanaSel] = useState(Math.ceil(hoje.getDate() / 7))
  const [respostas, setRespostas] = useState<Record<string, boolean>>({})
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo]     = useState(false)
  const [checklistId, setChecklistId] = useState<string | null>(null)

  async function carregar(uid: string, mes: number, ano: number, semana: number) {
    const { data } = await supabase.from('checklist_flow').select('*')
      .eq('user_id', uid).eq('mes', mes).eq('ano', ano).eq('semana', semana).single()
    if (data) { setRespostas(data.respostas || {}); setChecklistId(data.id) }
    else { setRespostas({}); setChecklistId(null) }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await carregar(user.id, mesSel, anoSel, semanaSel)
    }
    init()
  }, [])

  useEffect(() => { if (userId) carregar(userId, mesSel, anoSel, semanaSel) }, [mesSel, anoSel, semanaSel])

  function toggle(key: string) {
    setRespostas(prev => ({ ...prev, [key]: !prev[key] }))
    setSalvo(false)
  }

  async function salvar() {
    setSalvando(true)
    if (checklistId) {
      await supabase.from('checklist_flow').update({ respostas }).eq('id', checklistId)
    } else {
      const { data } = await supabase.from('checklist_flow').insert({
        user_id: userId, mes: mesSel, ano: anoSel, semana: semanaSel, respostas,
      }).select().single()
      if (data) setChecklistId(data.id)
    }
    setSalvando(false); setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  const totalPerguntas = Object.values(PERGUNTAS).reduce((s, g) => s + g.perguntas.length, 0)
  const totalRespondidas = Object.values(respostas).filter(Boolean).length
  const pct = Math.round((totalRespondidas / totalPerguntas) * 100)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Checklist Semanal</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Reserve 15 minutos. Consistência é o que separa quem controla de quem sofre.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={semanaSel} onChange={e => setSemanaSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {[1,2,3,4,5].map(s => <option key={s} value={s}>Semana {s}</option>)}
          </select>
          <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Progresso */}
      <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Progresso da semana {semanaSel}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: pct === 100 ? '#22c55e' : INDIGO }}>{totalRespondidas}/{totalPerguntas} — {pct}%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#22c55e' : INDIGO, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        {pct === 100 && <p style={{ fontSize: 13, color: '#4ade80', marginTop: 8 }}>✅ Semana completa! Continue assim.</p>}
      </div>

      {/* Grupos */}
      {Object.entries(PERGUNTAS).map(([dia, grupo]) => {
        const respondidas = grupo.perguntas.filter((_, i) => respostas[`${dia}_${i}`]).length
        return (
          <div key={dia} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{grupo.label}</div>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{respondidas}/{grupo.perguntas.length}</span>
            </div>
            {grupo.perguntas.map((p, i) => {
              const key = `${dia}_${i}`
              const checked = !!respostas[key]
              return (
                <div key={key} onClick={() => toggle(key)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 0', borderBottom: i < grupo.perguntas.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${checked ? INDIGO : 'rgba(255,255,255,0.2)'}`,
                    background: checked ? INDIGO : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: checked ? '#6B7280' : '#E5E7EB', textDecoration: checked ? 'line-through' : 'none', lineHeight: 1.5 }}>{p}</span>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Botão salvar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={salvar} disabled={salvando} style={{
          background: salvo ? '#059669' : INDIGO, color: '#fff', border: 'none',
          borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', opacity: salvando ? 0.7 : 1,
        }}>
          {salvando ? 'Salvando...' : salvo ? '✓ Salvo!' : 'Salvar checklist'}
        </button>
      </div>
    </div>
  )
}