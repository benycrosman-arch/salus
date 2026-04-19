import { NextRequest, NextResponse } from 'next/server'
import { paddle } from '@/lib/paddle'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email' },
        { status: 400 }
      )
    }

    const transaction = await paddle.transactions.create({
      items: [{ priceId: process.env.PADDLE_PRICE_ID!, quantity: 1 }],
      customData: { userId },
      checkout: {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?upgrade=success`,
      },
    })

    return NextResponse.json({ url: transaction.checkout?.url })
  } catch (error) {
    console.error('Paddle checkout error:', error)
    return NextResponse.json(
      { error: 'Falha ao criar sessão de pagamento' },
      { status: 500 }
    )
  }
}
