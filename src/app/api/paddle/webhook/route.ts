import { NextRequest, NextResponse } from 'next/server'
import { paddle } from '@/lib/paddle'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('paddle-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 400 })
  }

  let event

  try {
    event = await paddle.webhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.eventType) {
      case 'transaction.completed': {
        const userId = (event.data.customData as { userId?: string })?.userId
        console.log('Transaction completed:', {
          transactionId: event.data.id,
          userId,
          subscriptionId: event.data.subscriptionId,
        })
        // TODO: Update profiles.plan = 'pro', save paddle_subscription_id
        break
      }

      case 'subscription.updated': {
        console.log('Subscription updated:', {
          subscriptionId: event.data.id,
          customerId: event.data.customerId,
          status: event.data.status,
        })
        // TODO: Sync profiles.plan based on subscription status
        break
      }

      case 'subscription.canceled': {
        console.log('Subscription canceled:', {
          subscriptionId: event.data.id,
          customerId: event.data.customerId,
        })
        // TODO: Set profiles.plan = 'free'
        break
      }

      default:
        console.log(`Unhandled Paddle event: ${event.eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
