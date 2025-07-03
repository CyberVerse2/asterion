'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, BookOpen, Heart, Settings } from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import type { User } from '@/lib/types';
import { useState } from 'react';

interface UserProfile {
  farcasterUsername: string;
  totalTipped: number;
  novelsRead: number;
  chaptersLoved: number;
  tips: Array<{
    novelTitle: string;
    amount: number;
    date: string;
  }>;
}

export default function ProfilePage() {
  const {
    user: profile,
    userLoading: isLoading,
    userError
  } = useUser() as { user: User | null; userLoading: boolean; userError: string | null };
  const [showSpendPermission, setShowSpendPermission] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (userError) {
    return <div className="container mx-auto px-4 py-8 text-red-500">Error: {userError}</div>;
  }

  if (!profile) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage
              src={
                typeof profile?.pfpUrl === 'string' && profile.pfpUrl.length > 0
                  ? profile.pfpUrl
                  : '/placeholder.svg'
              }
            />
            <AvatarFallback className="text-2xl">
              {typeof profile?.username === 'string' && profile.username.length > 0
                ? profile.username.charAt(0).toUpperCase()
                : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              @{typeof profile?.username === 'string' ? profile.username : 'unknown'}
            </h1>
            <p className="text-muted-foreground">Asterion Reader & Supporter</p>
          </div>
          <Button className="flex items-center gap-2 bg-transparent">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tipped</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Placeholder: Sum of tip amounts */}
              <div className="text-2xl font-bold">
                $
                {Array.isArray(profile?.tips)
                  ? profile.tips
                      .reduce(
                        (sum, tip) => sum + (typeof tip.amount === 'number' ? tip.amount : 0),
                        0
                      )
                      .toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Supporting amazing authors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novels Read</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Placeholder: Number of bookmarks */}
              <div className="text-2xl font-bold">
                {Array.isArray(profile?.bookmarks) ? profile.bookmarks.length : 0}
              </div>
              <p className="text-xs text-muted-foreground">Stories discovered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chapters Loved</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Placeholder: Number of tips */}
              <div className="text-2xl font-bold">
                {Array.isArray(profile?.tips) ? profile.tips.length : 0}
              </div>
              <p className="text-xs text-muted-foreground">Double-clicked with love</p>
            </CardContent>
          </Card>
        </div>

        {/* Tipping History */}
        <Card>
          <CardHeader>
            <CardTitle>Tipping History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Array.isArray(profile?.tips) ? profile.tips : []).map((tip, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    {/* Placeholder: Show novelId instead of novelTitle */}
                    <div className="font-medium">Novel ID: {tip.novelId}</div>
                    <div className="text-sm text-muted-foreground">
                      {tip.date ? new Date(tip.date).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <Badge className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {typeof tip.amount === 'number' ? tip.amount.toFixed(2) : '0.00'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spend Limits Section */}
        <Card>
          <CardHeader>
            <CardTitle>Spend Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Daily Limit</div>
                  <div className="text-sm text-muted-foreground">Maximum tips per day</div>
                </div>
                <Badge>$50.00</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Monthly Limit</div>
                  <div className="text-sm text-muted-foreground">Maximum tips per month</div>
                </div>
                <Badge>$200.00</Badge>
              </div>
              <Button onClick={() => setShowSpendPermission((v) => !v)}>Adjust Limits</Button>
              {showSpendPermission && (
                <div className="mt-4">
                  <SpendPermission />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SpendPermission() {
  // Placeholder state for wallet connection and permission
  const [walletConnected, setWalletConnected] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  return (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
      <h3 className="font-semibold mb-2">Manage Spend Permission</h3>
      {!walletConnected ? (
        <Button onClick={() => setWalletConnected(true)}>Connect Wallet</Button>
      ) : !permissionGranted ? (
        <Button onClick={() => setPermissionGranted(true)}>Grant Spend Permission</Button>
      ) : (
        <div className="text-green-600 dark:text-green-400 font-medium">
          Spend Permission Granted!
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-2">
        This allows the app to spend up to your daily/monthly limit automatically.
      </div>
    </div>
  );
}
