import React from "react"
import { Minus, Plus } from "lucide-react"

export const Stepper = ({
  value = 0,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit = "",
  size = "default", // 'default' | 'lg'
  disabled = false,
  className = "",
}) => {
  const numValue = parseFloat(value) || 0

  const handleDecrement = (e) => {
    e.stopPropagation()
    if (disabled) return
    const next = Math.max(min, Math.round((numValue - step) * 100) / 100)
    onChange(next)
  }

  const handleIncrement = (e) => {
    e.stopPropagation()
    if (disabled) return
    const next = Math.min(max, Math.round((numValue + step) * 100) / 100)
    onChange(next)
  }

  const handleInputChange = (e) => {
    const parsed = parseFloat(e.target.value)
    if (isNaN(parsed)) {
      onChange(0)
    } else {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
  }

  const btnDimensions = size === "lg" ? "w-14 h-14" : "w-12 h-12" // minimum 48px
  const iconSize = size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <div
      className={`inline-flex items-center rounded-xl bg-paper-50 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border p-1 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled || numValue <= min}
        onClick={handleDecrement}
        className={`${btnDimensions} flex items-center justify-center rounded-lg bg-white dark:bg-chalkboard-card text-charcoal dark:text-chalk shadow-xs border border-paper-border dark:border-chalkboard-border hover:bg-paper-200 dark:hover:bg-chalkboard-border active:scale-90 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none`}
        aria-label="Decrease quantity"
      >
        <Minus className={iconSize} />
      </button>

      <div className="px-3 min-w-[70px] text-center flex flex-col items-center justify-center">
        <input
          type="number"
          value={numValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={handleInputChange}
          className="w-full text-center font-bold text-lg text-charcoal dark:text-chalk bg-transparent border-0 p-0 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && (
          <span className="text-[11px] font-medium text-charcoal-muted dark:text-chalk-muted uppercase tracking-wider">
            {unit}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || numValue >= max}
        onClick={handleIncrement}
        className={`${btnDimensions} flex items-center justify-center rounded-lg bg-chilli text-white shadow-xs hover:bg-chilli-hover active:scale-90 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none`}
        aria-label="Increase quantity"
      >
        <Plus className={iconSize} />
      </button>
    </div>
  )
}
