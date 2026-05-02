import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  const { email, senha, nome } = await req.json()

  const sb = supabaseAdmin()

  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  await sb.from('usuarios_flow').insert({
    email,
    user_id: userId,
    nome,
    plano: 'trial',
    status: 'trial',
  })

  // Reservas padrão
  await sb.from('reservas_flow').insert([
    { user_id: userId, tipo: 'emergencia',    percentual: 10, valor_acumulado: 0, meta: 0 },
    { user_id: userId, tipo: 'meses_fracos',  percentual: 10, valor_acumulado: 0, meta: 0 },
    { user_id: userId, tipo: 'investimento',  percentual: 5,  valor_acumulado: 0, meta: 0 },
  ])

  // Notificação interna
  try {
    await resend.emails.send({
      from: 'noreply@zynplan.com.br',
      to: 'j.ulioschwartz@hotmail.com',
      subject: '🆕 Novo cadastro Zynflow',
      html: `<p>Novo usuário: <strong>${nome}</strong> (${email})</p><p>Trial de 7 dias iniciado.</p>`,
    })
  } catch (_) {}

  return NextResponse.json({ ok: true })
}