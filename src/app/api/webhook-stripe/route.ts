import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

const resend = new Resend(process.env.RESEND_API_KEY!)

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_IDS: Record<string, string> = {
  autonomo: 'price_1TTQTZPI61I7rxR2xph7S0Ht',
  pf:       'price_1TVbmEPI61I7rxR20oLEJ50e',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  const sb = supabaseAdmin()

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = session.metadata?.user_id
      const perfil  = session.metadata?.perfil || 'autonomo'
      if (!userId) break

      const sub    = await stripe.subscriptions.retrieve(session.subscription as string)
      const endsAt = new Date((sub as any).current_period_end * 1000).toISOString()

      await sb.from('usuarios_flow').update({
        plano:                  'pro',
        status:                 'ativo',
        stripe_subscription_id: sub.id,
        stripe_price_id:        PRICE_IDS[perfil] ?? PRICE_IDS.autonomo,
        subscription_ends_at:   endsAt,
      }).eq('user_id', userId)

      // Notificação interna
      try {
        const { data: u } = await sb
          .from('usuarios_flow')
          .select('email, nome')
          .eq('user_id', userId)
          .single()

        await resend.emails.send({
          from:    'noreply@zynplan.com.br',
          to:      'j.ulioschwartz@hotmail.com',
          subject: `💳 Nova assinatura Zynflow ${perfil === 'pf' ? 'PF' : 'Autônomo'}!`,
          html:    `<p><strong>${u?.nome}</strong> (${u?.email}) assinou o Zynflow ${perfil === 'pf' ? 'PF — R$ 34,90/mês' : 'Autônomo — R$ 19,90/mês'}!</p>`,
        })
      } catch (_) {}
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId   = (invoice as any).subscription as string
      if (!subId) break

      const sub    = await stripe.subscriptions.retrieve(subId)
      const endsAt = new Date((sub as any).current_period_end * 1000).toISOString()
      const custId = invoice.customer as string

      await sb.from('usuarios_flow').update({
        status:               'ativo',
        subscription_ends_at: endsAt,
      }).eq('stripe_customer_id', custId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const custId  = invoice.customer as string

      await sb.from('usuarios_flow').update({
        status: 'inadimplente',
      }).eq('stripe_customer_id', custId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const custId = sub.customer as string

      await sb.from('usuarios_flow').update({
        status:                 'cancelado',
        stripe_subscription_id: null,
      }).eq('stripe_customer_id', custId)
      break
    }

    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription
      const custId = sub.customer as string
      const endsAt = new Date((sub as any).current_period_end * 1000).toISOString()

      await sb.from('usuarios_flow').update({
        status:               sub.status === 'active' ? 'ativo' : sub.status,
        subscription_ends_at: endsAt,
      }).eq('stripe_customer_id', custId)
      break
    }

    case 'customer.subscription.trial_will_end': {
      const sub    = event.data.object as Stripe.Subscription
      const custId = sub.customer as string

      const { data: u } = await sb
        .from('usuarios_flow')
        .select('email, nome, perfil')
        .eq('stripe_customer_id', custId)
        .single()

      if (u?.email) {
        const isPF    = u.perfil === 'pf'
        const preco   = isPF ? 'R$ 34,90/mês' : 'R$ 19,90/mês'
        const produto = isPF ? 'Zynflow PF' : 'Zynflow'
        const desc    = isPF
          ? 'controle financeiro completo, módulo de investimentos e apuração de IRPF'
          : 'Método 3 Passos, teto semanal automático e Fundo de Meses Fracos'

        try {
          await resend.emails.send({
            from:    'noreply@zynplan.com.br',
            to:      u.email,
            subject: `⏰ Seu trial do ${produto} termina em 3 dias`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#07080F;color:#E8EAF2;padding:40px;border-radius:16px;">
                <div style="text-align:center;margin-bottom:32px;">
                  <div style="width:48px;height:48px;border-radius:12px;background:#4F46E5;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;">Z</div>
                  <h2 style="color:#fff;margin:16px 0 4px;">Seu trial termina em breve</h2>
                  <p style="color:#6B7280;margin:0;">${produto} — Controle Financeiro</p>
                </div>
                <p style="color:#9CA3AF;line-height:1.7;">Olá, <strong style="color:#fff;">${u.nome}</strong>!</p>
                <p style="color:#9CA3AF;line-height:1.7;">Seu período gratuito de 30 dias no ${produto} termina em <strong style="color:#fff;">3 dias</strong>. Para continuar tendo acesso ao ${desc}, ative sua assinatura por apenas <strong style="color:#818CF8;">${preco}</strong>.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/assinar" style="background:#4F46E5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">Ativar minha assinatura →</a>
                </div>
                <p style="color:#4B5563;font-size:13px;text-align:center;">Cancele quando quiser. Sem multa.</p>
              </div>
            `,
          })
        } catch (_) {}
      }
      break
    }
  }

  return NextResponse.json({ ok: true })
}