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
      } else {
        // User doesn't have valid spend permission, show modal
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
