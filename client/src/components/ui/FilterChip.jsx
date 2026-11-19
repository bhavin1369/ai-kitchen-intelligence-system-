import React from "react"

export const FilterChip = ({
  label,
  active = false,
  onClick,
  count = null,
  icon: Icon = null,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer select-none active:scale-95 space-x-2 shrink-0 ${
        active
          ? "bg-charcoal text-white dark:bg-chalk dark:text-charcoal shadow-sm"
          : "bg-white dark:bg-chalkboard-card text-charcoal-muted dark:text-chalk-muted border border-paper-border dark:border-chalkboard-border hover:border-charcoal/30 dark:hover:border-chalk/30 hover:text-charcoal dark:hover:text-chalk"
      } ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{label}</span>
      {count !== null && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
            active
              ? "bg-white/20 text-white dark:bg-charcoal/20 dark:text-charcoal"
              : "bg-paper-200 dark:bg-chalkboard-border text-charcoal dark:text-chalk"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}
