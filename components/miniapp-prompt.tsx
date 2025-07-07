'use client';

import { useState, useEffect } from 'react';
import { useMiniKit, useAddFrame, useNotification } from '@coinbase/onchainkit/minikit';
import { useUser } from '@/providers/UserProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Check, Bell } from 'lucide-react';

interface MiniappPromptProps {
  onClose?: () => void;
}

export default function MiniappPrompt({ onClose }: MiniappPromptProps) {
  const { context, isFrameReady } = useMiniKit();
  const { user } = useUser();
  const addFrame = useAddFrame();
  const sendNotification = useNotification();
  const [isAdding, setIsAdding] = useState(false);
  const [hasAdded, setHasAdded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  // Check if user has already added the miniapp
  useEffect(() => {
    if (user && !user.hasAddedMiniapp && isFrameReady) {
      setShowPrompt(true);
    }
  }, [user, isFrameReady]);

  const handleAddFrame = async () => {
    if (!user) return;

    setIsAdding(true);
    try {
      const result = await addFrame();
      if (result) {
        console.log('Frame added:', result.url, result.token);
        setHasAdded(true);

        // Update user's hasAddedMiniapp status in the database
        await fetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            hasAddedMiniapp: true
          })
        });

        // Send a welcome notification
        try {
          await sendNotification({
            title: 'Welcome to Asterion! 📚',
            body: "You've successfully added Asterion to your mini apps. Start exploring amazing novels!"
          });
          setNotificationSent(true);
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }

        // Close the prompt after a short delay
        setTimeout(() => {
          setShowPrompt(false);
          onClose?.();
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to add frame:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    onClose?.();
  };

  if (!showPrompt || !user || user.hasAddedMiniapp) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-white text-lg">Add Asterion to Your Mini Apps</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-gray-300 text-sm">
            <p className="mb-3">Add Asterion to your mini apps to:</p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-400" />
                Get notifications about new chapters
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-400" />
                Quick access to your reading progress
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-400" />
                Discover trending novels
              </li>
              <li className="flex items-center gap-2">
                <Bell className="h-3 w-3 text-blue-400" />
                Receive welcome notification
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAddFrame}
              disabled={isAdding || hasAdded}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isAdding ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </div>
              ) : hasAdded ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {notificationSent ? 'Added & Notified!' : 'Added!'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add to Mini Apps
                </div>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleClose}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
