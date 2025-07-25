/**
 * Spend Permission Validation Utility
 *
 * This utility provides functions to validate user spend permissions for reading novels.
 * It supports both Coinbase spend permissions (wallet-only users) and ERC20 approvals (Farcaster users).
 */

import { User } from '@/lib/types';

export interface SpendPermissionData {
  account: string;
  spender: string;
  token: string;
  allowance: string;
  period: string;
  start: string;
  end: string;
  salt: string;
  extraData: string;
}

export interface SpendPermissionStatus {
  isValid: boolean;
  hasPermission: boolean;
  hasSignature: boolean;
  isExpired: boolean;
  isNotStarted: boolean;
  errorMessage?: string;
  expiresAt?: Date;
  startsAt?: Date;
  permissionType?: 'coinbase' | 'erc20';
}

/**
 * Validates if a user has a valid spend permission for reading
 * @param user - The user object to check
 * @returns SpendPermissionStatus object with validation results
 */
export function validateSpendPermission(user: User | null | undefined): SpendPermissionStatus {
  // Check if user exists
  if (!user) {
    return {
      isValid: false,
      hasPermission: false,
      hasSignature: false,
      isExpired: false,
      isNotStarted: false,
      errorMessage: 'User not found'
    };
  }

  // Determine if user is a Farcaster user (uses ERC20 approve) or wallet-only user (uses Coinbase spend permissions)
  const isFarcasterUser = Boolean(user.fid);

  // For both Farcaster and wallet users, check if they have spendPermissionSignature
  // This is the key indicator that they have completed the approval process
  if (!user.spendPermissionSignature) {
    return {
      isValid: false,
      hasPermission: false,
      hasSignature: false,
      isExpired: false,
      isNotStarted: false,
      errorMessage: isFarcasterUser
        ? 'ERC20 spending approval required'
        : 'Spend permission signature required',
      permissionType: isFarcasterUser ? 'erc20' : 'coinbase'
    };
  }

  if (isFarcasterUser) {
    // For Farcaster users, we use ERC20 approve transactions
    // Check if they have a wallet address
    if (!user.walletAddress) {
      return {
        isValid: false,
        hasPermission: false,
        hasSignature: false,
        isExpired: false,
        isNotStarted: false,
        errorMessage: 'Wallet address not found for Farcaster user',
        permissionType: 'erc20'
      };
    }

    // If they have spendPermissionSignature, assume the ERC20 approval is valid
    // TODO: In the future, we could add blockchain state checking here to verify the actual allowance
    return {
      isValid: true,
      hasPermission: true,
      hasSignature: true,
      isExpired: false,
      isNotStarted: false,
      permissionType: 'erc20'
    };
  }

  // For wallet-only users, check Coinbase spend permissions
  // Check if user has spend permission data
  if (!user.spendPermission) {
    return {
      isValid: false,
      hasPermission: false,
      hasSignature: true, // They have signature but no permission data
      isExpired: false,
      isNotStarted: false,
      errorMessage: 'No spend permission found',
      permissionType: 'coinbase'
    };
  }

  try {
    // Parse the spend permission data
    const spendPermission = user.spendPermission as SpendPermissionData;

    // Validate required fields
    if (!spendPermission.account || !spendPermission.spender || !spendPermission.token) {
      return {
        isValid: false,
        hasPermission: true,
        hasSignature: true,
        isExpired: false,
        isNotStarted: false,
        errorMessage: 'Invalid spend permission data: missing required fields',
        permissionType: 'coinbase'
      };
    }

    // Validate timestamps
    if (!spendPermission.start || !spendPermission.end) {
      return {
        isValid: false,
        hasPermission: true,
        hasSignature: true,
        isExpired: false,
        isNotStarted: false,
        errorMessage: 'Invalid spend permission data: missing timestamps',
        permissionType: 'coinbase'
      };
    }

    // Convert timestamps to numbers (they're stored as strings)
    const startTimestamp = parseInt(spendPermission.start);
    const endTimestamp = parseInt(spendPermission.end);
    const currentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds

    // Check if permission hasn't started yet
    if (currentTimestamp < startTimestamp) {
      return {
        isValid: false,
        hasPermission: true,
        hasSignature: true,
        isExpired: false,
        isNotStarted: true,
        errorMessage: 'Spend permission has not started yet',
        startsAt: new Date(startTimestamp * 1000),
        permissionType: 'coinbase'
      };
    }

    // Check if permission has expired
    if (currentTimestamp > endTimestamp) {
      return {
        isValid: false,
        hasPermission: true,
        hasSignature: true,
        isExpired: true,
        isNotStarted: false,
        errorMessage: 'Spend permission has expired',
        expiresAt: new Date(endTimestamp * 1000),
        permissionType: 'coinbase'
      };
    }

    // Permission is valid
    return {
      isValid: true,
      hasPermission: true,
      hasSignature: true,
      isExpired: false,
      isNotStarted: false,
      expiresAt: new Date(endTimestamp * 1000),
      startsAt: new Date(startTimestamp * 1000),
      permissionType: 'coinbase'
    };
  } catch (error) {
    console.error('Error validating spend permission:', error);
    return {
      isValid: false,
      hasPermission: true,
      hasSignature: true,
      isExpired: false,
      isNotStarted: false,
      errorMessage: 'Error parsing spend permission data',
      permissionType: 'coinbase'
    };
  }
}

/**
 * Checks if a user can read novels (has valid spend permission)
 * @param user - The user object to check
 * @returns boolean indicating if user can read
 */
export function canUserRead(user: User | null | undefined): boolean {
  const status = validateSpendPermission(user);
  return status.isValid;
}

/**
 * Gets a user-friendly message about their spend permission status
 * @param user - The user object to check
 * @returns string message describing the permission status
 */
export function getSpendPermissionMessage(user: User | null | undefined): string {
  const status = validateSpendPermission(user);

  if (status.isValid) {
    if (status.permissionType === 'erc20') {
      return 'ERC20 spending permission is active';
    }
    return `Spend permission is valid until ${status.expiresAt?.toLocaleDateString()}`;
  }

  if (!status.hasPermission) {
    if (status.permissionType === 'erc20') {
      return 'You need to approve ERC20 spending to read novels';
    }
    return 'You need to approve spend permission to read novels';
  }

  if (!status.hasSignature) {
    return 'Your spend permission is missing a signature';
  }

  if (status.isNotStarted) {
    return `Your spend permission will be active starting ${status.startsAt?.toLocaleDateString()}`;
  }

  if (status.isExpired) {
    return `Your spend permission expired on ${status.expiresAt?.toLocaleDateString()}. Please renew it to continue reading.`;
  }

  return status.errorMessage || 'Unknown spend permission error';
}

/**
 * Checks if a spend permission will expire soon (within 1 day)
 * @param user - The user object to check
 * @returns boolean indicating if permission expires soon
 */
export function isSpendPermissionExpiringSoon(user: User | null | undefined): boolean {
  const status = validateSpendPermission(user);

  if (!status.isValid || !status.expiresAt) {
    return false;
  }

  const oneDayFromNow = new Date();
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

  return status.expiresAt <= oneDayFromNow;
}

/**
 * Gets the remaining time until spend permission expires
 * @param user - The user object to check
 * @returns string describing time remaining or null if not applicable
 */
export function getSpendPermissionTimeRemaining(user: User | null | undefined): string | null {
  const status = validateSpendPermission(user);

  if (!status.isValid || !status.expiresAt) {
    return null;
  }

  const now = new Date();
  const timeRemaining = status.expiresAt.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return 'Expired';
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else {
    return 'Less than 1 hour remaining';
  }
}
