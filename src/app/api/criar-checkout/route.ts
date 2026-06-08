import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_IDS = {
  autonomo: 'price_1Tg8m8PI61I7rxR2NLJ4tbeq', // R$29,90/mês (atualizado 08/06/2026)
  pf:       'price_1TVbmEPI61I7rxR20oLEJ50e',  // R$34,90/mês
}

export async function POST(req: NextRequest) {
  const { user_id, email, nome } = await req.json()
  const sb = supabaseAdmin()

  // Buscar customer e perfil do usuário
  const { data: usuario } = await sb
    .from('usuarios_flow')
    .select('stripe_customer_id, perfil')
    .eq('user_id', user_id)
    .single()

  let customerId = usuario?.stripe_customer_id
  const perfil   = usuario?.perfil || 'autonomo'
  const priceId  = PRICE_IDS[perfil as keyof typeof PRICE_IDS] ?? PRICE_IDS.autonomo

  // Criar customer se não existir
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: nome,
      metadata: { user_id },
    })
    customerId = customer.id
    await sb.from('usuarios_flow').update({
      stripe_customer_id: customerId,
    }).eq('user_id', user_id)
  }

  // Criar sessão de checkout
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price:    priceId,
      quantity: 1,
    }],
    mode:        'subscription',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?assinatura=sucesso`,
    cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/assinar`,
    locale:      'pt-BR',
    metadata:    { user_id, perfil },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}