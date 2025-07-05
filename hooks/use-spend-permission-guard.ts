import { useState, useCallback } from 'react';
import { User } from '@/lib/types';
import {
  validateSpendPermission,
  isSpendPermissionExpiringSoon
} from '@/lib/utils/spend-permission';

interface UseSpendPermissionGuardReturn {
  isModalOpen: boolean;
  checkPermissionAndProceed: (user: User | null, onSuccess: () => void) => boolean;
  closeModal: () => void;
  openModal: () => void;
}

export function useSpendPermissionGuard(): UseSpendPermissionGuardReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkPermissionAndProceed = useCallback(
    (user: User | null, onSuccess: () => void): boolean => {
      const permissionStatus = validateSpendPermission(user);

      if (permissionStatus.isValid && !isSpendPermissionExpiringSoon(user)) {
        // User has valid spend permission and it's not expiring soon, proceed with reading
        onSuccess();
        return true;
      } else {
        // User doesn't have valid spend permission OR it's expiring within 1 day, show modal
        setIsModalOpen(true);
        return false;
      }
    },
    []
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  return {
    isModalOpen,
    checkPermissionAndProceed,
    closeModal,
    openModal
  };
}
