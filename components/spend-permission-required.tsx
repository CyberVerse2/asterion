'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { User } from '@/lib/types';
import {
  validateSpendPermission,
  getSpendPermissionMessage,
  isSpendPermissionExpiringSoon,
  getSpendPermissionTimeRemaining
} from '@/lib/utils/spend-permission';

interface SpendPermissionRequiredProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onApproveClick?: () => void;
  showCloseButton?: boolean;
}

export default function SpendPermissionRequired({
  isOpen,
  onClose,
  user,
  onApproveClick,
  showCloseButton = true
}: SpendPermissionRequiredProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOpen) return null;

  const permissionStatus = validateSpendPermission(user);
  const message = getSpendPermissionMessage(user);
  const isExpiringSoon = isSpendPermissionExpiringSoon(user);
  const timeRemaining = getSpendPermissionTimeRemaining(user);

  const handleApprovePermission = () => {
    if (onApproveClick) {
      onApproveClick();
    } else {
      setIsRedirecting(true);
      router.push('/profile');
    }
  };

  const getStatusIcon = () => {
    if (permissionStatus.isValid) {
      return <CheckCircle className="h-6 w-6 text-green-400" />;
    } else if (permissionStatus.isExpired) {
      return <XCircle className="h-6 w-6 text-red-400" />;
    } else if (permissionStatus.isNotStarted) {
      return <Clock className="h-6 w-6 text-yellow-400" />;
    } else {
      return <AlertCircle className="h-6 w-6 text-orange-400" />;
    }
  };

  const getStatusBadge = () => {
    if (permissionStatus.isValid) {
      return (
        <Badge variant="secondary" className="bg-green-900/20 text-green-400 border-green-400/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Valid
        </Badge>
      );
    } else if (permissionStatus.isExpired) {
      return (
        <Badge variant="secondary" className="bg-red-900/20 text-red-400 border-red-400/20">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    } else if (permissionStatus.isNotStarted) {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-900/20 text-yellow-400 border-yellow-400/20"
        >
          <Clock className="h-3 w-3 mr-1" />
          Not Started
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="secondary"
          className="bg-orange-900/20 text-orange-400 border-orange-400/20"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Required
        </Badge>
      );
    }
  };

  const getTitle = () => {
    if (permissionStatus.isValid) {
      return isExpiringSoon ? 'Spend Permission Expiring Soon' : 'Spend Permission Valid';
    } else if (permissionStatus.isExpired) {
      return 'Spend Permission Expired';
    } else if (permissionStatus.isNotStarted) {
      return 'Spend Permission Not Active';
    } else {
      return 'Spend Permission Required';
    }
  };

  const getDescription = () => {
    if (permissionStatus.isValid) {
      return isExpiringSoon
        ? 'Your spend permission is expiring soon. Renew it to continue reading without interruption.'
        : 'Your spend permission is valid and you can read novels.';
    } else {
      return 'To read novels on Asterion, you need to approve spend permission for USDC. This allows you to tip chapters during your reading experience.';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <Card className="bg-gray-900/95 backdrop-blur-sm border-white/10 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-purple-900/20 border border-purple-400/20">
              <Shield className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <CardTitle className="text-xl text-white">{getTitle()}</CardTitle>
            {getStatusBadge()}
          </div>

          <CardDescription className="text-gray-300">{getDescription()}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Permission Status Details */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-start gap-3">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="text-sm text-gray-300 mb-1">{message}</p>
                {timeRemaining && <p className="text-xs text-gray-400">{timeRemaining}</p>}
              </div>
            </div>
          </div>

          {/* Permission Requirements */}
          {!permissionStatus.isValid && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">What you need to do:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  Go to your profile page
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  Approve spend permission for USDC
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  Return to continue reading
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {!permissionStatus.isValid && (
              <Button
                onClick={handleApprovePermission}
                disabled={isRedirecting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isRedirecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Redirecting...
                  </>
                ) : (
                  <>
                    Approve Spend Permission
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            {showCloseButton && (
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                {permissionStatus.isValid ? 'Continue Reading' : 'Close'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
