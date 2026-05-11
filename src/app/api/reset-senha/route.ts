import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
  }

  const sb = supabaseAdmin()

  // Verifica se o usuário existe
  const { data: listData } = await sb.auth.admin.listUsers()
  const usuario = listData?.users?.find(u => u.email === email)

  if (!usuario) {
    // Retorna sucesso mesmo assim — segurança (não revela se email existe)
    return NextResponse.json({ ok: true })
  }

  // Gera link de reset pelo Supabase
  const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: 'https://zynflow.app.br/auth/nova-senha',
    },
  })

  if (linkError || !linkData) {
    return NextResponse.json({ error: 'Erro ao gerar link de redefinição.' }, { status: 500 })
  }

  const resetLink = linkData.properties?.action_link

  if (!resetLink) {
    return NextResponse.json({ error: 'Erro ao gerar link.' }, { status: 500 })
  }

  const primeiroNome = (usuario.user_metadata?.nome || email.split('@')[0]).split(' ')[0]

  // Envia email via Resend com layout Zynflow
  try {
    await resend.emails.send({
      from: 'Zynflow <noreply@zyncompany.com.br>',
      to: email,
      subject: 'Redefinição de senha — Zynflow',
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <tr><td style="background:#07080F;border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
      <tr><td style="width:56px;height:56px;background:#4F46E5;border-radius:14px;text-align:center;vertical-align:middle;">
        <span style="font-size:28px;font-weight:900;color:#fff;line-height:56px;">Z</span>
      </td></tr>
    </table>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#FFFFFF;">Zynflow</h1>
    <p style="margin:0;font-size:13px;color:#818CF8;">Controle financeiro inteligente</p>
  </td></tr>

  <tr><td style="background:#FFFFFF;padding:40px;">
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0F172A;">Redefinição de senha</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.7;">
      Olá, <strong style="color:#0F172A;">${primeiroNome}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta Zynflow. Clique no botão abaixo para criar uma nova senha:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="text-align:center;">
        <a href="${resetLink}"
          style="display:inline-block;background:#4F46E5;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;">
          Redefinir minha senha →
        </a>
      </td></tr>
    </table>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">
        ⏰ Este link expira em <strong>1 hora</strong>.<br/>
        Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:#94A3B8;">
      Se o botão não funcionar, copie e cole este link no navegador:<br/>
      <span style="color:#4F46E5;word-break:break-all;">${resetLink}</span>
    </p>
  </td></tr>

  <tr><td style="background:#F8FAFC;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #E2E8F0;">
    <p style="margin:0;font-size:12px;color:#94A3B8;">Zynflow — Controle Financeiro Inteligente · Um produto <strong style="color:#4F46E5;">Zyncompany</strong></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
    })
  } catch (e) {
    console.error('Erro ao enviar email de reset:', e)
    return NextResponse.json({ error: 'Erro ao enviar e-mail.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}