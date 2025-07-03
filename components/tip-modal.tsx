'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { calculateTipDistribution } from '@/lib/tip-calculator';
import { DollarSign, Heart } from 'lucide-react';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  novelId: string;
  novelTitle: string;
  author: string;
  onTipSuccess: () => void;
  user: any;
}

export default function TipModal({
  isOpen,
  onClose,
  novelId,
  novelTitle,
  author,
  onTipSuccess,
  user
}: TipModalProps) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const tipAmount = Number.parseFloat(amount) || 0;
  const distribution = calculateTipDistribution(tipAmount);

  const handleTip = async () => {
    if (!amount || tipAmount <= 0) return;
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          amount: tipAmount,
          novelId,
          userId: user.id
        })
      });

      if (response.ok) {
        onTipSuccess();
        onClose();
        setAmount('');
      }
    } catch (error) {
      console.error('Error processing tip:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Tip the Author
          </DialogTitle>
          <DialogDescription>
            Support {author} for "{novelTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Tip Amount ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {tipAmount > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
              <div className="font-medium">Distribution Breakdown:</div>
              <div className="flex justify-between">
                <span>Author ({author}):</span>
                <span className="font-medium">${distribution.authorAmount.toFixed(2)} (91%)</span>
              </div>
              <div className="flex justify-between">
                <span>Zora Infrastructure:</span>
                <span>${distribution.zoraAmount.toFixed(2)} (0.4%)</span>
              </div>
              <div className="flex justify-between">
                <span>Liquidity Pool:</span>
                <span>${distribution.liquidityAmount.toFixed(2)} (1%)</span>
              </div>
              <div className="flex justify-between">
                <span>Asterion Platform:</span>
                <span>${distribution.asterionAmount.toFixed(2)} (9.6%)</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleTip} disabled={!amount || tipAmount <= 0 || isLoading}>
            {isLoading ? 'Processing...' : `Tip $${tipAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
