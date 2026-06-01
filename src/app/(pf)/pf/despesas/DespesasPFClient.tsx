'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const INDIGO = '#4F46E5'
const VERDE  = '#22c55e'
const VERM   = '#ef4444'
const AMBER  = '#f59e0b'
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATS_FIXA     = ['Moradia','Financiamento','Plano de Saúde','Educação','Assinaturas','Seguros','Investimento Fixo','Impostos/MEI','Outro']
const CATS_VARIAVEL = ['Cartão de Crédito','Conta de Luz','Água/Gás','Condomínio','Combustível','Internet/Telefone','Supermercado','Outro']
const CATS_DIARIA   = ['Restaurante','Delivery','Mercado','Lazer','Roupas','Farmácia','Presente','Viagem','Outro']

const INFO_FIXA       = 'Despesas fixas são contas com valor definido que se repetem todo mês, como aluguel, financiamento e plano de saúde.'
const INFO_VARIAVEL   = 'Despesas variáveis são contas que chegam todo mês mas o valor pode mudar, como luz, água e cartão de crédito.'
const INFO_DIARIA     = 'Gastos diários são despesas do dia a dia sem data fixa de vencimento, como alimentação, lazer e compras.'
const INFO_CONSOLIDAR = 'Mostra todas as despesas do mês em uma só tela — fixas, variáveis e diárias juntas — para você ter uma visão geral completa.'

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function parseMoeda(s: string) { return parseFloat(s.replace(',', '.')) || 0 }

type TipoAba = 'fixa' | 'variavel' | 'diaria' | 'consolidado'

interface Fixa {
  id: string; tipo: string; categoria: string; descricao: string
  valor_mensal: number; dia_vencimento: number | null
  pago: boolean; valor_pago: number; mes: number; ano: number; conta_id: string | null
  retroativo: boolean
}
interface Diaria {
  id: string; categoria: string; descricao: string; valor: number
  data: string; mes: number; ano: number; conta_id: string | null
}
interface Conta { id: string; nome: string; saldo_inicial: number }

const VAZIO_F = { tipo: 'fixa',     categoria: 'Moradia',           descricao: '', valor_mensal: '' as any, dia_vencimento: null as number | null, pago: false, valor_pago: 0, conta_id: '', retroativo: false }
const VAZIO_V = { tipo: 'variavel', categoria: 'Cartão de Crédito', descricao: '', valor_mensal: '' as any, dia_vencimento: null as number | null, pago: false, valor_pago: 0, conta_id: '', retroativo: false }
const VAZIO_D = { categoria: 'Restaurante', descricao: '', valor: '' as any, data: new Date().toISOString().split('T')[0], conta_id: '' }

function InfoTooltip({ texto }: { texto: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative' as const, display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setShow(v => !v)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 18, height: 18, fontSize: 10, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>
        i
      </button>
      {show && (
        <div style={{ position: 'absolute' as const, bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#D1D5DB', width: 220, zIndex: 200, marginBottom: 6, lineHeight: 1.5 }}>
          {texto}
        </div>
      )}
    </span>
  )
}

// Helpers para atualizar saldo_inicial da conta
async function creditarConta(contaId: string, valor: number) {
  const { data } = await supabase.from('contas_flow').select('saldo_inicial').eq('id', contaId).single()
  if (data) await supabase.from('contas_flow').update({ saldo_inicial: data.saldo_inicial + valor }).eq('id', contaId)
}
async function debitarConta(contaId: string, valor: number) {
  const { data } = await supabase.from('contas_flow').select('saldo_inicial').eq('id', contaId).single()
  if (data) await supabase.from('contas_flow').update({ saldo_inicial: data.saldo_inicial - valor }).eq('id', contaId)
}

export default function DespesasPFClient() {
  const hoje = new Date()
  const [userId, setUserId]             = useState<string | null>(null)
  const [aba, setAba]                   = useState<TipoAba>('fixa')
  const [mesSel, setMesSel]             = useState(hoje.getMonth() + 1)
  const [anoSel, setAnoSel]             = useState(hoje.getFullYear())
  const [fixas, setFixas]               = useState<Fixa[]>([])
  const [variaveis, setVariaveis]       = useState<Fixa[]>([])
  const [diarias, setDiarias]           = useState<Diaria[]>([])
  const [contas, setContas]             = useState<Conta[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(false)
  const [editandoF, setEditandoF]       = useState<Fixa | null>(null)
  const [editandoD, setEditandoD]       = useState<Diaria | null>(null)
  const [formF, setFormF]               = useState<any>(VAZIO_F)
  const [formV, setFormV]               = useState<any>(VAZIO_V)
  const [formD, setFormD]               = useState<any>(VAZIO_D)
  const [salvando, setSalvando]         = useState(false)
  const [erro, setErro]                 = useState('')
  const [replicando, setReplicando]     = useState(false)
  const [modalConfirmPago, setModalConfirmPago] = useState<{ despesa: Fixa } | null>(null)
  const [modalReplicar, setModalReplicar] = useState(false)
  const [selecionadosReplicar, setSelecionadosReplicar] = useState<string[]>([])

  async function carregarContas(uid: string) {
    const { data } = await supabase.from('contas_flow').select('id, nome, saldo_inicial').eq('user_id', uid)
    setContas(data || [])
  }

  async function carregar(uid: string, mes: number, ano: number) {
    setLoading(true)
    const [fx, vr, dr] = await Promise.all([
      supabase.from('despesas_fixas_flow').select('*').eq('user_id', uid).eq('mes', mes).eq('ano', ano).eq('tipo', 'fixa').order('dia_vencimento', { ascending: true, nullsFirst: false }),
      supabase.from('despesas_fixas_flow').select('*').eq('user_id', uid).eq('mes', mes).eq('ano', ano).eq('tipo', 'variavel').order('dia_vencimento', { ascending: true, nullsFirst: false }),
      supabase.from('despesas_variaveis_flow').select('*').eq('user_id', uid).eq('mes', mes).eq('ano', ano).order('data', { ascending: false }),
    ])
    setFixas(fx.data || [])
    setVariaveis(vr.data || [])
    setDiarias(dr.data || [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await Promise.all([
        carregar(user.id, mesSel, anoSel),
        carregarContas(user.id),
      ])
    }
    init()
  }, [])

  useEffect(() => { if (userId) carregar(userId, mesSel, anoSel) }, [mesSel, anoSel])

  function abrirNova() {
    if (aba === 'fixa')          { setEditandoF(null); setFormF({ ...VAZIO_F }) }
    else if (aba === 'variavel') { setEditandoF(null); setFormV({ ...VAZIO_V }) }
    else if (aba === 'diaria' || aba === 'consolidado') { setEditandoD(null); setFormD({ ...VAZIO_D, data: new Date().toISOString().split('T')[0] }) }
    setErro(''); setModal(true)
  }

  function abrirEditarF(f: Fixa) {
    setEditandoF(f)
    if (f.tipo === 'fixa') {
      setFormF({ tipo: 'fixa', categoria: f.categoria, descricao: f.descricao, valor_mensal: f.valor_mensal, dia_vencimento: f.dia_vencimento, pago: f.pago, valor_pago: f.valor_pago, conta_id: f.conta_id || '', retroativo: f.retroativo || false })
    } else {
      setFormV({ tipo: 'variavel', categoria: f.categoria, descricao: f.descricao, valor_mensal: f.valor_mensal, dia_vencimento: f.dia_vencimento, pago: f.pago, valor_pago: f.valor_pago, conta_id: f.conta_id || '', retroativo: f.retroativo || false })
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
    const abaEfetiva = aba === 'consolidado' ? (editandoF ? (editandoF.tipo === 'fixa' ? 'fixa' : 'variavel') : 'diaria') : aba

    if (abaEfetiva === 'fixa' || abaEfetiva === 'variavel') {
      const form = abaEfetiva === 'fixa' ? formF : formV
      if (!form.descricao.trim()) { setErro('Informe a descrição.'); setSalvando(false); return }
      if (!form.conta_id) { setErro('Selecione a conta de pagamento.'); setSalvando(false); return }
      const retroativo = (form as any).retroativo || false
      const valor = parseMoeda(String(form.valor_mensal))
      const p = {
        tipo: form.tipo, categoria: form.categoria, descricao: form.descricao,
        valor_mensal: valor,
        dia_vencimento: form.dia_vencimento, pago: form.pago,
        valor_pago: form.valor_pago, conta_id: form.conta_id || null,
        retroativo,
        mes: mesSel, ano: anoSel,
      }

      if (editandoF) {
        // Se estava pago antes e não era retroativo: precisa ajustar conta
        const estavaPago     = editandoF.pago && !editandoF.retroativo
        const contaAnterior  = editandoF.conta_id
        const valorAnterior  = editandoF.valor_mensal
        const ficaPago       = form.pago && !retroativo
        const contaNova      = form.conta_id || null
        const valorNovo      = valor

        if (estavaPago && contaAnterior) {
          // Estorna da conta anterior
          await creditarConta(contaAnterior, valorAnterior)
        }
        if (ficaPago && contaNova) {
          // Debita da conta nova
          await debitarConta(contaNova, valorNovo)
        }
        await supabase.from('despesas_fixas_flow').update(p).eq('id', editandoF.id)
      } else {
        // Nova despesa: se já marcada como paga e não retroativa, debita da conta
        if (form.pago && !retroativo && form.conta_id) {
          await debitarConta(form.conta_id, valor)
        }
        await supabase.from('despesas_fixas_flow').insert({ ...p, user_id: userId })
      }
    } else {
      // Diária
      if (!formD.descricao.trim()) { setErro('Informe a descrição.'); setSalvando(false); return }
      if (!formD.conta_id) { setErro('Selecione a conta.'); setSalvando(false); return }
      const valor = parseMoeda(String(formD.valor))
      if (!valor || valor <= 0) { setErro('Informe o valor.'); setSalvando(false); return }
      const d = new Date(formD.data + 'T12:00:00')
      const p = {
        categoria: formD.categoria, descricao: formD.descricao, valor,
        data: formD.data, conta_id: formD.conta_id || null,
        mes: d.getMonth() + 1, ano: d.getFullYear(),
      }
      if (editandoD) {
        // Ajusta diferença de valor/conta na conta
        const valorAnterior = editandoD.valor
        const contaAnterior = editandoD.conta_id
        const contaNova     = formD.conta_id || null

        if (contaAnterior) await creditarConta(contaAnterior, valorAnterior)
        if (contaNova)     await debitarConta(contaNova, valor)
        await supabase.from('despesas_variaveis_flow').update(p).eq('id', editandoD.id)
      } else {
        // Nova diária: sempre debita (diária = sempre paga no ato)
        if (formD.conta_id) await debitarConta(formD.conta_id, valor)
        await supabase.from('despesas_variaveis_flow').insert({ ...p, user_id: userId })
      }
    }

    await carregarContas(userId!)
    await carregar(userId!, mesSel, anoSel)
    setSalvando(false); setModal(false)
  }

  async function excluirF(id: string) {
    if (!confirm('Excluir esta despesa?')) return
    const despesa = [...fixas, ...variaveis].find(f => f.id === id)
    // Se estava paga e não era retroativa: estorna da conta
    if (despesa && despesa.pago && !despesa.retroativo && despesa.conta_id) {
      await creditarConta(despesa.conta_id, despesa.valor_mensal)
      await carregarContas(userId!)
    }
    await supabase.from('despesas_fixas_flow').delete().eq('id', id)
    setFixas(prev => prev.filter(f => f.id !== id))
    setVariaveis(prev => prev.filter(f => f.id !== id))
  }

  async function excluirD(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    const diaria = diarias.find(d => d.id === id)
    // Diária sempre foi paga: estorna da conta
    if (diaria && diaria.conta_id) {
      await creditarConta(diaria.conta_id, diaria.valor)
      await carregarContas(userId!)
    }
    await supabase.from('despesas_variaveis_flow').delete().eq('id', id)
    setDiarias(prev => prev.filter(d => d.id !== id))
  }

  function pedirConfirmPago(f: Fixa) {
    if (f.pago) {
      togglePagoConfirmado(f, false)
    } else {
      setModalConfirmPago({ despesa: f })
    }
  }

  async function togglePagoConfirmado(f: Fixa, pago: boolean) {
    // Não movimenta conta se for retroativo
    if (!f.retroativo && f.conta_id) {
      if (pago) {
        // Marcando como pago: debita da conta
        await debitarConta(f.conta_id, f.valor_mensal)
      } else {
        // Desmarcando: estorna para a conta
        await creditarConta(f.conta_id, f.valor_mensal)
      }
      await carregarContas(userId!)
    }
    await supabase.from('despesas_fixas_flow').update({ pago, valor_pago: pago ? f.valor_mensal : 0 }).eq('id', f.id)
    const setter = f.tipo === 'fixa' ? setFixas : setVariaveis
    setter(prev => prev.map(x => x.id === f.id ? { ...x, pago, valor_pago: pago ? x.valor_mensal : 0 } : x))
    setModalConfirmPago(null)
  }

  function abrirModalReplicar() {
    const itens = aba === 'fixa' ? fixas : variaveis
    setSelecionadosReplicar(itens.map(f => f.id))
    setModalReplicar(true)
  }

  async function replicarSelecionados() {
    if (!userId) return
    setReplicando(true)
    const proxMes = mesSel === 12 ? 1 : mesSel + 1
    const proxAno = mesSel === 12 ? anoSel + 1 : anoSel
    const itens = (aba === 'fixa' ? fixas : variaveis).filter(f => selecionadosReplicar.includes(f.id))
    const inserir = itens.map(f => ({
      user_id: userId, tipo: f.tipo, categoria: f.categoria, descricao: f.descricao,
      valor_mensal: f.valor_mensal, dia_vencimento: f.dia_vencimento,
      pago: false, valor_pago: 0, conta_id: f.conta_id,
      mes: proxMes, ano: proxAno,
    }))
    if (inserir.length > 0) await supabase.from('despesas_fixas_flow').insert(inserir)
    setReplicando(false)
    setModalReplicar(false)
    alert(`${itens.length} despesa(s) replicada(s) para ${MESES[proxMes - 1]}/${proxAno}!`)
  }

  const totalFixas          = fixas.reduce((s, f) => s + f.valor_mensal, 0)
  const totalFixasPagas     = fixas.filter(f => f.pago).reduce((s, f) => s + f.valor_mensal, 0)
  const totalVariaveis      = variaveis.reduce((s, f) => s + f.valor_mensal, 0)
  const totalVariaveisPagas = variaveis.filter(f => f.pago).reduce((s, f) => s + f.valor_mensal, 0)
  const totalDiarias        = diarias.reduce((s, d) => s + d.valor, 0)
  const totalGeral          = totalFixas + totalVariaveis + totalDiarias
  const totalPagoGeral      = totalFixasPagas + totalVariaveisPagas + totalDiarias

  const catMapD: Record<string, number> = {}
  diarias.forEach(d => { catMapD[d.categoria] = (catMapD[d.categoria] || 0) + d.valor })
  const catsD = Object.entries(catMapD).sort((a, b) => b[1] - a[1])

  const corStatus = (f: Fixa) => {
    if (f.pago) return { bg: 'rgba(34,197,94,0.1)', txt: '#4ade80', label: 'pago' }
    if (f.dia_vencimento && f.dia_vencimento <= hoje.getDate() && mesSel === hoje.getMonth() + 1)
      return { bg: 'rgba(239,68,68,0.1)', txt: '#FCA5A5', label: 'vencida' }
    return { bg: 'rgba(255,255,255,0.05)', txt: '#9CA3AF', label: 'pendente' }
  }

  const inp: React.CSSProperties = { width: '100%', background: '#07080F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }

  const renderCardFV = (f: Fixa) => {
    const st = corStatus(f)
    const nomeConta = contas.find(c => c.id === f.conta_id)?.nome
    return (
      <div key={f.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px' }}>
        <div className="desp-card-row">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{f.descricao}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: st.bg, color: st.txt }}>{st.label}</span>
              <span style={{ fontSize: 11, color: '#6B7280', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 100 }}>
                {f.tipo === 'fixa' ? 'Fixa' : 'Variável'}
              </span>
              {f.retroativo && <span style={{ fontSize: 11, color: '#fcd34d', background: 'rgba(245,158,11,0.08)', padding: '2px 8px', borderRadius: 100 }}>retroativo</span>}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {f.categoria}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}{nomeConta ? ` · ${nomeConta}` : ''}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: VERM }}>{fmt(f.valor_mensal)}</span>
          </div>
          <div className="desp-card-actions">
            <button onClick={() => pedirConfirmPago(f)} style={{ background: f.pago ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${f.pago ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, color: f.pago ? '#4ade80' : '#9CA3AF', cursor: 'pointer' }}>
              {f.pago ? '✓ Pago' : 'Pagar'}
            </button>
            <button onClick={() => abrirEditarF(f)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>Editar</button>
            <button onClick={() => excluirF(f.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#FCA5A5', cursor: 'pointer' }}>Excluir</button>
          </div>
        </div>
      </div>
    )
  }

  const renderCardD = (d: Diaria) => (
    <div key={d.id} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px' }}>
      <div className="desp-card-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{d.descricao}</span>
            <span style={{ fontSize: 11, color: '#6B7280', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 100 }}>Diária</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>pago</span>
          </div>
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
  )

  return (
    <div>
      <style>{`
        .desp-card-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .desp-card-actions { display: flex; gap: 8px; flex-shrink: 0; }
        @media (max-width: 768px) {
          .desp-card-row { flex-direction: column; align-items: flex-start; }
          .desp-card-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Despesas</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Controle fixas, variáveis e diárias.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
          <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
            style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}>
            {[2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {aba !== 'consolidado' && (
            <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {aba === 'fixa' ? '+ Nova fixa' : aba === 'variavel' ? '+ Nova variável' : '+ Lançar gasto'}
            </button>
          )}
        </div>
      </div>

      {/* RESUMO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Fixas do mês',     val: totalFixas,     sub: `${fmt(totalFixasPagas)} pago` },
          { label: 'Variáveis do mês', val: totalVariaveis, sub: `${fmt(totalVariaveisPagas)} pago` },
          { label: 'Diárias do mês',   val: totalDiarias,   sub: `${diarias.length} lançamento(s)` },
        ].map(k => (
          <div key={k.label} style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{k.label}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: VERM }}>{fmt(k.val)}</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#0D0F1A', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' as const }}>
        {([
          { key: 'fixa',        label: `Fixas (${fixas.length})`,        info: INFO_FIXA },
          { key: 'variavel',    label: `Variáveis (${variaveis.length})`, info: INFO_VARIAVEL },
          { key: 'diaria',      label: `Diárias (${diarias.length})`,     info: INFO_DIARIA },
          { key: 'consolidado', label: `Consolidar`,                      info: INFO_CONSOLIDAR },
        ] as { key: TipoAba; label: string; info: string }[]).map(t => (
          <button key={t.key} onClick={() => setAba(t.key)}
            style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: aba === t.key ? 600 : 400, background: aba === t.key ? (t.key === 'consolidado' ? '#0f766e' : INDIGO) : 'transparent', color: aba === t.key ? '#fff' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Botão replicar */}
      {(aba === 'fixa' || aba === 'variavel') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={abrirModalReplicar}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 16px', fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>
            📋 Replicar para {MESES[mesSel === 12 ? 0 : mesSel]}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#6B7280', textAlign: 'center', padding: 40 }}>Carregando...</div>
      ) : (
        <>
          {/* ABA FIXAS */}
          {aba === 'fixa' && (
            fixas.length === 0 ? (
              <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏠</div>
                <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma despesa fixa para {MESES[mesSel-1]}</p>
                <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Adicionar despesa fixa</button>
              </div>
            ) : <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>{fixas.map(f => renderCardFV(f))}</div>
          )}

          {/* ABA VARIÁVEIS */}
          {aba === 'variavel' && (
            variaveis.length === 0 ? (
              <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Nenhuma despesa variável para {MESES[mesSel-1]}</p>
                <button onClick={abrirNova} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Adicionar despesa variável</button>
              </div>
            ) : <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>{variaveis.map(f => renderCardFV(f))}</div>
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
                  {diarias.map(d => renderCardD(d))}
                </div>
              )}
            </div>
          )}

          {/* ABA CONSOLIDADO */}
          {aba === 'consolidado' && (
            <div>
              <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>Total do mês — {MESES[mesSel-1]}/{anoSel}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: VERM }}>{fmt(totalGeral)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                    <div style={{ textAlign: 'center' as const }}>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Pago</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: VERDE }}>{fmt(totalPagoGeral)}</div>
                    </div>
                    <div style={{ textAlign: 'center' as const }}>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>Pendente</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: AMBER }}>{fmt(totalGeral - totalPagoGeral)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {fixas.length === 0 && variaveis.length === 0 && diarias.length === 0 ? (
                <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ color: '#6B7280', fontSize: 14 }}>Nenhuma despesa lançada em {MESES[mesSel-1]}</p>
                </div>
              ) : (
                <>
                  <style>{`.consol-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; } @media(max-width:768px){ .consol-cols { grid-template-columns: 1fr !important; } }`}</style>
                  <div className="consol-cols">
                    {/* Fixas */}
                    <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Fixas ({fixas.length})</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: VERM }}>{fmt(totalFixas)}</span>
                      </div>
                      {fixas.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: '#4B5563', fontSize: 13 }}>Nenhuma</div>
                      ) : fixas.map(f => {
                        const st = corStatus(f)
                        return (
                          <div key={f.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{f.descricao}</div>
                              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{f.categoria}{f.dia_vencimento ? ` · dia ${f.dia_vencimento}` : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: VERM }}>{fmt(f.valor_mensal)}</div>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 100, background: st.bg, color: st.txt }}>{st.label}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Variáveis */}
                    <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Variáveis ({variaveis.length})</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: VERM }}>{fmt(totalVariaveis)}</span>
                      </div>
                      {variaveis.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: '#4B5563', fontSize: 13 }}>Nenhuma</div>
                      ) : variaveis.map(f => {
                        const st = corStatus(f)
                        return (
                          <div key={f.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{f.descricao}</div>
                              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{f.categoria}{f.dia_vencimento ? ` · dia ${f.dia_vencimento}` : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: VERM }}>{fmt(f.valor_mensal)}</div>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 100, background: st.bg, color: st.txt }}>{st.label}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Diárias */}
                    <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Diárias ({diarias.length})</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: VERM }}>{fmt(totalDiarias)}</span>
                      </div>
                      {diarias.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center' as const, color: '#4B5563', fontSize: 13 }}>Nenhuma</div>
                      ) : diarias.map(d => (
                        <div key={d.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d.descricao}</div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{d.categoria} · {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                          </div>
                          <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: VERM }}>{fmt(d.valor)}</div>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 100, background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>pago</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL CONFIRMAÇÃO PAGAMENTO */}
      {modalConfirmPago && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: '0 0 12px' }}>Confirmar pagamento</h3>
            <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 8, lineHeight: 1.6 }}>
              Você está marcando <strong style={{ color: '#fff' }}>{modalConfirmPago.despesa.descricao}</strong> como paga.
            </p>
            <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 8, lineHeight: 1.6 }}>
              Valor: <strong style={{ color: VERM }}>{fmt(modalConfirmPago.despesa.valor_mensal)}</strong>
            </p>
            {modalConfirmPago.despesa.conta_id && !modalConfirmPago.despesa.retroativo && (
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
                ⚠️ Este valor será deduzido da conta <strong style={{ color: '#fff' }}>{contas.find(c => c.id === modalConfirmPago!.despesa.conta_id)?.nome || ''}</strong>.
              </p>
            )}
            {modalConfirmPago.despesa.retroativo && (
              <p style={{ fontSize: 13, color: '#fcd34d', marginBottom: 20, lineHeight: 1.6 }}>
                📅 Lançamento retroativo — o saldo da conta <strong>não será alterado</strong>.
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalConfirmPago(null)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => togglePagoConfirmado(modalConfirmPago.despesa, true)}
                style={{ flex: 1, background: VERDE, border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                ✓ Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPLICAR */}
      {modalReplicar && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' as const }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
              Replicar para {MESES[mesSel === 12 ? 0 : mesSel]}/{mesSel === 12 ? anoSel + 1 : anoSel}
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>Selecione quais despesas deseja replicar para o mês seguinte.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => setSelecionadosReplicar((aba === 'fixa' ? fixas : variaveis).map(f => f.id))}
                style={{ background: 'none', border: 'none', color: '#818CF8', fontSize: 13, cursor: 'pointer' }}>Selecionar todas</button>
              <button onClick={() => setSelecionadosReplicar([])}
                style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer' }}>Limpar seleção</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 20 }}>
              {(aba === 'fixa' ? fixas : variaveis).map(f => (
                <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: selecionadosReplicar.includes(f.id) ? 'rgba(79,70,229,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selecionadosReplicar.includes(f.id) ? 'rgba(79,70,229,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selecionadosReplicar.includes(f.id)}
                    onChange={e => {
                      if (e.target.checked) setSelecionadosReplicar(prev => [...prev, f.id])
                      else setSelecionadosReplicar(prev => prev.filter(id => id !== f.id))
                    }}
                    style={{ width: 16, height: 16, accentColor: '#4F46E5' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{f.descricao}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{f.categoria}{f.dia_vencimento ? ` · dia ${f.dia_vencimento}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: VERM }}>{fmt(f.valor_mensal)}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalReplicar(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={replicarSelecionados} disabled={replicando || selecionadosReplicar.length === 0}
                style={{ flex: 2, background: selecionadosReplicar.length === 0 ? 'rgba(79,70,229,0.3)' : '#4F46E5', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, color: '#fff', cursor: selecionadosReplicar.length === 0 ? 'not-allowed' : 'pointer', opacity: replicando ? 0.7 : 1 }}>
                {replicando ? 'Replicando...' : `Replicar ${selecionadosReplicar.length} despesa(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO/EDITAR */}
      {modal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' as const }}>
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
                    <select value={aba === 'fixa' ? formF.categoria : formV.categoria}
                      onChange={e => aba === 'fixa' ? setFormF((p: any) => ({ ...p, categoria: e.target.value })) : setFormV((p: any) => ({ ...p, categoria: e.target.value }))}
                      style={inp}>
                      {(aba === 'fixa' ? CATS_FIXA : CATS_VARIAVEL).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Dia vencimento</label>
                    <input type="number" min="1" max="31"
                      value={aba === 'fixa' ? formF.dia_vencimento || '' : formV.dia_vencimento || ''}
                      onChange={e => {
                        const v = parseInt(e.target.value) || null
                        aba === 'fixa' ? setFormF((p: any) => ({ ...p, dia_vencimento: v })) : setFormV((p: any) => ({ ...p, dia_vencimento: v }))
                      }}
                      placeholder="Ex: 10" style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Descrição *</label>
                  <input value={aba === 'fixa' ? formF.descricao : formV.descricao}
                    onChange={e => aba === 'fixa' ? setFormF((p: any) => ({ ...p, descricao: e.target.value })) : setFormV((p: any) => ({ ...p, descricao: e.target.value }))}
                    placeholder={aba === 'fixa' ? 'Ex: Aluguel, Plano de saúde...' : 'Ex: Cartão Bradesco, Conta Luz...'}
                    style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                    <input type="text" inputMode="numeric"
                      value={aba === 'fixa' ? formF.valor_mensal : formV.valor_mensal}
                      onFocus={e => { if (e.target.value === '0') aba === 'fixa' ? setFormF((p: any) => ({ ...p, valor_mensal: '' })) : setFormV((p: any) => ({ ...p, valor_mensal: '' })) }}
                      onChange={e => aba === 'fixa' ? setFormF((p: any) => ({ ...p, valor_mensal: e.target.value })) : setFormV((p: any) => ({ ...p, valor_mensal: e.target.value }))}
                      placeholder="0,00" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Conta de pagamento *</label>
                    <select value={aba === 'fixa' ? formF.conta_id : formV.conta_id}
                      onChange={e => aba === 'fixa' ? setFormF((p: any) => ({ ...p, conta_id: e.target.value })) : setFormV((p: any) => ({ ...p, conta_id: e.target.value }))}
                      style={inp}>
                      <option value="">Selecione a conta *</option>
                      {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <input type="checkbox" id="pago"
                    checked={aba === 'fixa' ? formF.pago : formV.pago}
                    onChange={e => aba === 'fixa' ? setFormF((p: any) => ({ ...p, pago: e.target.checked })) : setFormV((p: any) => ({ ...p, pago: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: INDIGO }} />
                  <label htmlFor="pago" style={{ fontSize: 14, color: '#9CA3AF', cursor: 'pointer' }}>Já pago</label>
                </div>
                {(aba === 'fixa' ? formF.pago : formV.pago) && (
                  <div style={{ marginBottom: 20, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <input type="checkbox" id="retroativo"
                        checked={aba === 'fixa' ? formF.retroativo : formV.retroativo}
                        onChange={e => aba === 'fixa' ? setFormF((p: any) => ({ ...p, retroativo: e.target.checked })) : setFormV((p: any) => ({ ...p, retroativo: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: AMBER, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <label htmlFor="retroativo" style={{ fontSize: 13, color: '#fcd34d', fontWeight: 600, cursor: 'pointer', display: 'block', marginBottom: 3 }}>
                          📅 Lançamento retroativo
                        </label>
                        <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                          Esta conta já foi paga antes de você começar a usar o Zynflow. Marque esta opção para registrá-la sem deduzir do saldo atual das suas contas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Categoria</label>
                    <select value={formD.categoria} onChange={e => setFormD((p: any) => ({ ...p, categoria: e.target.value }))} style={inp}>
                      {CATS_DIARIA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Data</label>
                    <input type="date" value={formD.data} onChange={e => setFormD((p: any) => ({ ...p, data: e.target.value }))} style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Descrição *</label>
                  <input value={formD.descricao} onChange={e => setFormD((p: any) => ({ ...p, descricao: e.target.value }))}
                    placeholder="Ex: Almoço, Camiseta, Remédio..." style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Valor (R$) *</label>
                    <input type="text" inputMode="numeric"
                      value={formD.valor}
                      onFocus={e => { if (e.target.value === '0') setFormD((p: any) => ({ ...p, valor: '' })) }}
                      onChange={e => setFormD((p: any) => ({ ...p, valor: e.target.value }))}
                      placeholder="0,00" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Conta *</label>
                    <select value={formD.conta_id} onChange={e => setFormD((p: any) => ({ ...p, conta_id: e.target.value }))} style={inp}>
                      <option value="">Selecione a conta *</option>
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