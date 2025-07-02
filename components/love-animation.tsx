"use client"

import { useEffect, useState } from "react"

interface LoveAnimationProps {
  x: number
  y: number
  onComplete: () => void
}

export default function LoveAnimation({ x, y, onComplete }: LoveAnimationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onComplete, 300) // Wait for fade out animation
    }, 1200) // Show for 1.2 seconds

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      className={`fixed pointer-events-none z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-150"
      }`}
      style={{
        left: x - 30, // Center the emoji (60px width / 2)
        top: y - 30, // Center the emoji (60px height / 2)
        transform: isVisible ? "translateY(0)" : "translateY(-20px)",
      }}
    >
      <div className="love-emoji-animation">❤️</div>
    </div>
  )
}
