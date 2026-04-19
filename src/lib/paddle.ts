import { Paddle, Environment } from '@paddle/paddle-node-sdk'

export const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment:
    process.env.NODE_ENV === 'production'
      ? Environment.production
      : Environment.sandbox,
})
