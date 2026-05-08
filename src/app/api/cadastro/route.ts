import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, password, nome, perfil } = await req.json()
  const sb = supabaseAdmin()

  // Trial de 30 dias
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 30)
  trialEndsAt.setHours(12, 0, 0, 0)

  // 1. Tentar criar usuário no auth
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {

      const { data: listData } = await sb.auth.admin.listUsers()
      const usuarioExistente = listData?.users?.find(u => u.email === email)

      if (!usuarioExistente) {
        return NextResponse.json({ error: 'Erro ao localizar usuário.' }, { status: 400 })
      }

      const userId = usuarioExistente.id

      const { data: perfilExistente } = await sb
        .from('usuarios_flow')
        .select('id, status, setup_concluido')
        .eq('user_id', userId)
        .maybeSingle()

      if (perfilExistente) {
        return NextResponse.json({ ok: true, userId, jaExistia: true })
      }

      await sb.auth.admin.updateUserById(userId, { password })

      await sb.from('usuarios_flow').insert({
        user_id:         userId,
        email,
        nome:            nome || email.split('@')[0],
        plano:           'trial',
        status:          'trial',
        trial_ends_at:   trialEndsAt.toISOString(),
        setup_concluido: false,
        perfil:          perfil || 'autonomo',
      })

      await enviarEmailBoasVindas(email, nome, trialEndsAt)
      await enviarNotificacaoInterna(email, nome, trialEndsAt)

      return NextResponse.json({ ok: true, userId, jaExistia: false })
    }

    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 400 })
  }

  // 2. Usuário novo — criar perfil normalmente
  await sb.from('usuarios_flow').insert({
    user_id:         authData.user.id,
    email,
    nome:            nome || email.split('@')[0],
    plano:           'trial',
    status:          'trial',
    trial_ends_at:   trialEndsAt.toISOString(),
    setup_concluido: false,
    perfil:          perfil || 'autonomo',
  })

  await enviarEmailBoasVindas(email, nome, trialEndsAt)
  await enviarNotificacaoInterna(email, nome, trialEndsAt)

  return NextResponse.json({ ok: true, userId: authData.user.id, jaExistia: false })
}

async function enviarEmailBoasVindas(email: string, nome: string, trialEndsAt: Date) {
  const primeiroNome = (nome || email.split('@')[0]).split(' ')[0]
  const dataExpiracao = trialEndsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zynflow.app.br'

  try {
    await resend.emails.send({
      from: 'Zynflow <noreply@zyncompany.com.br>',
      to: email,
      subject: `${primeiroNome}, seu controle financeiro começa agora 🚀`,
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
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#FFFFFF;">Bem-vindo ao Zynflow</h1>
    <p style="margin:0;font-size:14px;color:#818CF8;">Controle Financeiro do Autônomo</p>
  </td></tr>
  <tr><td style="background:#FFFFFF;padding:40px;">
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0F172A;">Olá, ${primeiroNome}! 👋</p>
    <p style="margin:0 0 28px;font-size:15px;color:#64748B;line-height:1.7;">Sua conta foi criada com sucesso. Você tem <strong style="color:#0F172A;">30 dias grátis</strong> para descobrir o que é ter controle real do seu dinheiro.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#4F46E5;border-radius:12px;padding:24px 28px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#C7D2FE;letter-spacing:0.1em;text-transform:uppercase;">Sua transformação começa agora</p>
        <p style="margin:0;font-size:16px;color:#FFFFFF;line-height:1.65;">Autônomos que controlam as finanças param de se preocupar com o fim do mês e começam a planejar o futuro.</p>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0F172A;">📋 O que fazer primeiro:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
      <td width="46" valign="top"><div style="width:36px;height:36px;background:#4F46E5;border-radius:9px;text-align:center;line-height:36px;font-size:15px;font-weight:800;color:#fff;">1</div></td>
      <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0F172A;">Configure seu perfil financeiro</p>
        <p style="margin:0;font-size:13px;color:#64748B;">No primeiro acesso, preencha sua renda, despesas e objetivo. Leva menos de 2 minutos.</p>
      </td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
      <td width="46" valign="top"><div style="width:36px;height:36px;background:#4F46E5;border-radius:9px;text-align:center;line-height:36px;font-size:15px;font-weight:800;color:#fff;">2</div></td>
      <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0F172A;">Lance sua renda do mês — P1</p>
        <p style="margin:0;font-size:13px;color:#64748B;">Acesse <strong>Receitas</strong> e registre o que entrou esse mês. Use sempre o valor conservador.</p>
      </td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
      <td width="46" valign="top"><div style="width:36px;height:36px;background:#4F46E5;border-radius:9px;text-align:center;line-height:36px;font-size:15px;font-weight:800;color:#fff;">3</div></td>
      <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0F172A;">Ative seu Fundo de Meses Fracos — P3</p>
        <p style="margin:0;font-size:13px;color:#64748B;">Acesse <strong>Reservas</strong> — o diferencial que protege você quando a renda cai.</p>
      </td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:#FFF7ED;border:1px solid #FED7AA;border-left:4px solid #F97316;border-radius:10px;padding:18px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#C2410C;text-transform:uppercase;">💡 Dica exclusiva</p>
        <p style="margin:0;font-size:14px;color:#7C2D12;line-height:1.65;"><strong>Nunca planeje com a renda do mês bom.</strong> Use sempre o valor mais baixo. Quando vier mais, vai para as reservas.</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 20px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">⏰ Trial gratuito até <strong>${dataExpiracao}</strong>.<br/>Após, continue por apenas <strong>R$ 19,90/mês</strong>.</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="text-align:center;">
        <a href="${siteUrl}/dashboard" style="display:inline-block;background:#4F46E5;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:12px;">Acessar meu Zynflow →</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#F8FAFC;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #E2E8F0;">
    <p style="margin:0;font-size:12px;color:#94A3B8;">Zynflow — Controle Financeiro do Autônomo · Um produto <strong style="color:#4F46E5;">Zyncompany</strong></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
    })
  } catch (e) {
    console.error('Erro ao enviar email boas-vindas:', e)
  }
}

async function enviarNotificacaoInterna(email: string, nome: string, trialEndsAt: Date) {
  const dataExpiracao = trialEndsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  try {
    await resend.emails.send({
      from: 'Zynflow <noreply@zyncompany.com.br>',
      to: 'suportezynflow@gmail.com',
      subject: `🎉 Novo cadastro Zynflow: ${nome || email}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#07080F;color:#fff;border-radius:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
            <div style="width:42px;height:42px;background:#4F46E5;border-radius:10px;text-align:center;line-height:42px;font-size:22px;font-weight:900;color:#fff;">Z</div>
            <div>
              <div style="font-size:15px;font-weight:700;color:#fff;letter-spacing:2px;">ZYNFLOW</div>
              <div style="font-size:10px;color:#818CF8;letter-spacing:3px;">NOVO CADASTRO</div>
            </div>
          </div>
          <h2 style="color:#818CF8;margin:0 0 24px;">🎉 Novo usuário no Zynflow!</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:13px;width:140px;">Nome</td>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:600;">${nome || '—'}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:13px;">E-mail</td>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:600;color:#818CF8;">${email}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:13px;">Plano</td>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:600;">Trial (30 dias grátis)</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:13px;">Trial até</td>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:600;color:#818CF8;">${dataExpiracao}</td>
            </tr>
	    <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:13px;">Perfil</td>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:600;color:#10b981;">${perfil === 'pf' ? '💼 CLT/Assalariado' : '🚀 Autônomo'}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:rgba(255,255,255,0.4);font-size:13px;">Data/hora</td>
              <td style="padding:12px 0;font-weight:600;">${agora}</td>
            </tr>
          </table>
        </div>
      `,
    })
  } catch (e) {
    console.error('Erro ao enviar notificação interna:', e)
  }
}