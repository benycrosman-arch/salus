'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade?: () => void
}

export function PaywallModal({ isOpen, onClose, onUpgrade }: PaywallModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      if (onUpgrade) {
        await onUpgrade()
      }
    } catch (error) {
      console.error('Upgrade error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Unlock Premium
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Get full access to all features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-foreground">Unlimited meal logging</h4>
              <p className="text-sm text-muted-foreground">
                Track every meal, every day, with no restrictions
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-foreground">AI-powered meal plans</h4>
              <p className="text-sm text-muted-foreground">
                Personalized 7-day meal plans tailored to your goals
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-foreground">One-tap grocery ordering</h4>
              <p className="text-sm text-muted-foreground">
                Auto-generated shopping lists from your meal plans
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold text-foreground">$19</div>
            <div className="text-sm text-muted-foreground">per month</div>
          </div>

          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-6 text-base"
            size="lg"
          >
            {isLoading ? 'Loading...' : 'Start 14-day free trial'}
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
            disabled={isLoading}
          >
            Maybe later
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Cancel anytime. No commitment required.
        </p>
      </DialogContent>
    </Dialog>
  )
}
