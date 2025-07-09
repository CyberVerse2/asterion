import React from 'react';
import { Button } from './button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="text-2xl font-bold text-red-400 mb-2">Error</div>
      <div className="text-red-300 mb-4 text-base max-w-md">{message}</div>
      {onRetry && (
        <Button onClick={onRetry} className="bg-purple-600 hover:bg-purple-700 text-white">
          Retry
        </Button>
      )}
    </div>
  );
}
