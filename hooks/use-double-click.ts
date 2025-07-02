"use client"

import type React from "react"

import { useCallback, useRef } from "react"

interface UseDoubleClickOptions {
  onSingleClick?: (event: React.MouseEvent) => void
  onDoubleClick?: (event: React.MouseEvent) => void
  delay?: number
}

export function useDoubleClick({ onSingleClick, onDoubleClick, delay = 300 }: UseDoubleClickOptions) {
  const clickCountRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      clickCountRef.current += 1

      if (clickCountRef.current === 1) {
        timeoutRef.current = setTimeout(() => {
          if (clickCountRef.current === 1) {
            onSingleClick?.(event)
          }
          clickCountRef.current = 0
        }, delay)
      } else if (clickCountRef.current === 2) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        onDoubleClick?.(event)
        clickCountRef.current = 0
      }
    },
    [onSingleClick, onDoubleClick, delay],
  )

  return handleClick
}
