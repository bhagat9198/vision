"use client"

import * as React from "react"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delayDuration?: number
}

export function Tooltip({
  children,
  content,
  side = "top",
  delayDuration = 200,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showTooltip, setShowTooltip] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true)
      setShowTooltip(true)
    }, delayDuration)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(false)
    setTimeout(() => setShowTooltip(false), 150)
  }

  const getPositionClasses = () => {
    switch (side) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2"
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2"
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2"
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2"
    }
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && (
        <div
          className={`
            absolute z-50 px-3 py-1.5 text-xs font-medium rounded-md shadow-md
            bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900
            whitespace-nowrap
            transition-opacity duration-150
            ${isOpen ? "opacity-100" : "opacity-0"}
            ${getPositionClasses()}
          `}
        >
          {content}
          {/* Arrow */}
          <div
            className={`
              absolute w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45
              ${side === "top" ? "bottom-[-4px] left-1/2 -translate-x-1/2" : ""}
              ${side === "bottom" ? "top-[-4px] left-1/2 -translate-x-1/2" : ""}
              ${side === "left" ? "right-[-4px] top-1/2 -translate-y-1/2" : ""}
              ${side === "right" ? "left-[-4px] top-1/2 -translate-y-1/2" : ""}
            `}
          />
        </div>
      )}
    </div>
  )
}

