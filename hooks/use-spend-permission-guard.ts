import { useState, useCallback } from 'react';
import { User } from '@/lib/types';
import { validateSpendPermission } from '@/lib/utils/spend-permission';

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

      if (permissionStatus.isValid) {
        // User has valid spend permission, proceed with reading
        onSuccess();
        return true;
      } else if (!permissionStatus.hasPermission || !permissionStatus.hasSignature) {
        // User doesn't have spend permission at all, show modal
        setIsModalOpen(true);
        return false;
      } else {
        // User has permission but it's expired or not started - still allow reading
        // since they've already approved spending, just log the issue
        console.log('Spend permission issue:', permissionStatus.errorMessage);
        onSuccess();
        return true;
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
