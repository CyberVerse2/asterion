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
      return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 flex-shrink-0" />;
    } else if (permissionStatus.isExpired) {
      return <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400 flex-shrink-0" />;
    } else if (permissionStatus.isNotStarted) {
      return <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 flex-shrink-0" />;
    } else {
      return <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 flex-shrink-0" />;
    }
  };

  const getStatusBadge = () => {
    if (permissionStatus.isValid) {
      return (
        <Badge
          variant="secondary"
          className="bg-green-900/20 text-green-400 border-green-400/20 text-xs sm:text-sm px-2 sm:px-3 py-1"
        >
          <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>Valid</span>
        </Badge>
      );
    } else if (permissionStatus.isExpired) {
      return (
        <Badge
          variant="secondary"
          className="bg-red-900/20 text-red-400 border-red-400/20 text-xs sm:text-sm px-2 sm:px-3 py-1"
        >
          <XCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>Expired</span>
        </Badge>
      );
    } else if (permissionStatus.isNotStarted) {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-900/20 text-yellow-400 border-yellow-400/20 text-xs sm:text-sm px-2 sm:px-3 py-1"
        >
          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>Not Started</span>
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="secondary"
          className="bg-orange-900/20 text-orange-400 border-orange-400/20 text-xs sm:text-sm px-2 sm:px-3 py-1"
        >
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>Required</span>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-2 sm:p-4">
      <Card className="bg-gray-900/95 backdrop-blur-sm border-white/10 w-full max-w-sm sm:max-w-md mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center pb-4 sm:pb-6">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-full bg-purple-900/20 border border-purple-400/20">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
            <CardTitle className="text-lg sm:text-xl text-white leading-tight px-2 sm:px-0">
              {getTitle()}
            </CardTitle>
            <div className="flex justify-center">{getStatusBadge()}</div>
          </div>

          <CardDescription className="text-sm sm:text-base text-gray-300 leading-relaxed px-2 sm:px-0">
            {getDescription()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {/* Permission Status Details */}
          <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700/50">
            <div className="flex items-start gap-2 sm:gap-3">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 mb-1 leading-relaxed">{message}</p>
                {timeRemaining && (
                  <p className="text-xs text-gray-400 leading-relaxed">{timeRemaining}</p>
                )}
              </div>
            </div>
          </div>

          {/* Permission Requirements */}
          {!permissionStatus.isValid && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">What you need to do:</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span className="leading-relaxed">Go to your profile page</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span className="leading-relaxed">Approve spend permission for USDC</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span className="leading-relaxed">Return to continue reading</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {!permissionStatus.isValid && (
              <Button
                onClick={handleApprovePermission}
                disabled={isRedirecting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 sm:py-2 text-sm sm:text-base font-medium"
              >
                {isRedirecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Redirecting...
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-center">Approve Spend Permission</span>
                    <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
                  </>
                )}
              </Button>
            )}

            {showCloseButton && (
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 py-3 sm:py-2 text-sm sm:text-base font-medium"
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
