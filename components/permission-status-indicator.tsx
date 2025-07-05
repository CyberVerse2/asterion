"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { User } from '@/lib/types';
import { 
  validateSpendPermission, 
  isSpendPermissionExpiringSoon,
  getSpendPermissionTimeRemaining 
} from '@/lib/utils/spend-permission';

interface PermissionStatusIndicatorProps {
  user: User | null;
  variant?: 'compact' | 'full' | 'badge-only';
  showAction?: boolean;
  onActionClick?: () => void;
  className?: string;
}

export default function PermissionStatusIndicator({ 
  user, 
  variant = 'compact',
  showAction = false,
  onActionClick,
  className = '' 
}: PermissionStatusIndicatorProps) {
  const permissionStatus = validateSpendPermission(user);
  const isExpiringSoon = isSpendPermissionExpiringSoon(user);
  const timeRemaining = getSpendPermissionTimeRemaining(user);

  const getStatusIcon = (size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    
    if (permissionStatus.isValid) {
      return <CheckCircle className={`${sizeClass} text-green-400`} />;
    } else if (permissionStatus.isExpired) {
      return <XCircle className={`${sizeClass} text-red-400`} />;
    } else if (permissionStatus.isNotStarted) {
      return <Clock className={`${sizeClass} text-yellow-400`} />;
    } else {
      return <AlertCircle className={`${sizeClass} text-orange-400`} />;
    }
  };

  const getStatusBadge = (showIcon: boolean = true) => {
    if (permissionStatus.isValid) {
      const bgClass = isExpiringSoon ? 'bg-yellow-900/20 border-yellow-400/20' : 'bg-green-900/20 border-green-400/20';
      const textClass = isExpiringSoon ? 'text-yellow-400' : 'text-green-400';
      
      return (
        <Badge variant="secondary" className={`${bgClass} ${textClass}`}>
          {showIcon && getStatusIcon()}
          {showIcon && <span className="ml-1"></span>}
          {isExpiringSoon ? 'Expiring Soon' : 'Valid'}
        </Badge>
      );
    } else if (permissionStatus.isExpired) {
      return (
        <Badge variant="secondary" className="bg-red-900/20 text-red-400 border-red-400/20">
          {showIcon && getStatusIcon()}
          {showIcon && <span className="ml-1"></span>}
          Expired
        </Badge>
      );
    } else if (permissionStatus.isNotStarted) {
      return (
        <Badge variant="secondary" className="bg-yellow-900/20 text-yellow-400 border-yellow-400/20">
          {showIcon && getStatusIcon()}
          {showIcon && <span className="ml-1"></span>}
          Not Started
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-orange-900/20 text-orange-400 border-orange-400/20">
          {showIcon && getStatusIcon()}
          {showIcon && <span className="ml-1"></span>}
          Required
        </Badge>
      );
    }
  };

  const getStatusText = () => {
    if (permissionStatus.isValid) {
      return isExpiringSoon ? 'Spend permission expiring soon' : 'Spend permission valid';
    } else if (permissionStatus.isExpired) {
      return 'Spend permission expired';
    } else if (permissionStatus.isNotStarted) {
      return 'Spend permission not active';
    } else {
      return 'Spend permission required';
    }
  };

  const handleActionClick = () => {
    if (onActionClick) {
      onActionClick();
    }
  };

  // Badge-only variant
  if (variant === 'badge-only') {
    return (
      <div className={className}>
        {getStatusBadge()}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusBadge()}
        {showAction && !permissionStatus.isValid && (
          <Button
            onClick={handleActionClick}
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs border-purple-400/20 text-purple-400 hover:bg-purple-900/20"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Approve
          </Button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            {getStatusIcon('md')}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white">
                Spend Permission
              </span>
              {getStatusBadge(false)}
            </div>
            <p className="text-xs text-gray-400">
              {getStatusText()}
            </p>
            {timeRemaining && (
              <p className="text-xs text-gray-500 mt-1">
                {timeRemaining}
              </p>
            )}
          </div>
        </div>
        
        {showAction && !permissionStatus.isValid && (
          <Button
            onClick={handleActionClick}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3"
          >
            <Shield className="h-3 w-3 mr-1" />
            Approve
          </Button>
        )}
      </div>
    </div>
  );
} 