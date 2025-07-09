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
// @ts-ignore
import { DollarSign, Heart, CheckCircle } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

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
  const [tipStatus, setTipStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [successMessage, setSuccessMessage] = useState('');

  const tipAmount = Number.parseFloat(amount) || 0;
  const distribution = calculateTipDistribution(tipAmount);

  const handleTip = async () => {
    if (!amount || tipAmount <= 0) return;
    if (!user) return;

    setIsLoading(true);
    setTipStatus('processing');

    try {
      // Check if user has spend permission
      if (!user.spendPermission || !user.spendPermissionSignature) {
        setTipStatus('error');
        alert('Please approve spend permission in your profile before tipping.');
        setIsLoading(false);
        return;
      }

      // Use the spend permission system via /api/collect
      const response = await fetch('/api/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spendPermission: user.spendPermission,
          signature: user.spendPermissionSignature,
          userId: user.id,
          novelId,
          amount: tipAmount
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setTipStatus('success');
          setSuccessMessage(`Tipped $${tipAmount.toFixed(2)}!`);
          onTipSuccess();

          // Show success for 2 seconds then close
          setTimeout(() => {
            onClose();
            setAmount('');
            setTipStatus('idle');
            setSuccessMessage('');
          }, 2000);
        } else {
          setTipStatus('error');
          alert('Tip failed. Please try again.');
        }
      } else {
        const errorData = await response.json();
        setTipStatus('error');
        alert(`Tip failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing tip:', error);
      setTipStatus('error');
      alert('Error processing tip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setAmount('');
      setTipStatus('idle');
      setSuccessMessage('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tipStatus === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Heart className="h-5 w-5 text-red-500" />
            )}
            {tipStatus === 'success' ? 'Tip Successful!' : 'Tip the Author'}
          </DialogTitle>
          <DialogDescription>
            {tipStatus === 'success'
              ? `You successfully supported ${author}!`
              : `Support ${author} for "${novelTitle}"`}
          </DialogDescription>
        </DialogHeader>

        {tipStatus === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-600">{successMessage}</p>
            <p className="text-sm text-gray-600 mt-2">Thank you for supporting the author!</p>
          </div>
        ) : (
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
                  disabled={isLoading}
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

            {user && (!user.spendPermission || !user.spendPermissionSignature) && (
              <div className="bg-orange-100 border border-orange-400 text-orange-700 px-3 py-2 rounded">
                <p className="text-sm">
                  Please approve spend permission in your profile before tipping.
                </p>
              </div>
            )}

            {tipStatus === 'processing' && (
              <div className="flex flex-col items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded">
                <Spinner size={24} className="mb-1" />
                <p className="text-sm font-medium">Tipping in progress...</p>
                <p className="text-xs">Please wait while we process your tip on the blockchain.</p>
              </div>
            )}
          </div>
        )}

        {tipStatus !== 'success' && (
          <DialogFooter>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleTip} disabled={!amount || tipAmount <= 0 || isLoading}>
              {tipStatus === 'processing' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Tipping in progress...
                </div>
              ) : (
                `Tip $${tipAmount.toFixed(2)}`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
