import React from "react"

export const StatNumber = ({
  label,
  value,
  prefix = "",
  suffix = "",
  subtext = null,
  delta = null, // e.g. "+14%", "-5%"
  deltaType = "neutral", // 'good' | 'bad' | 'neutral'
  accent = null, // 'chilli' | 'leaf' | 'turmeric'
  className = "",
}) => {
  const accentClasses = {
    chilli: "border-l-4 border-chilli",
    leaf: "border-l-4 border-leaf",
    turmeric: "border-l-4 border-turmeric",
  }

  return (
    <div
      className={`p-4 sm:p-5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket dark:shadow-ticket-dark transition-all duration-150 ${
        accent ? accentClasses[accent] : ""
      } ${className}`}
    >
      <div className="text-xs sm:text-sm font-medium text-charcoal-muted dark:text-chalk-muted uppercase tracking-wider mb-1">
        {label}
      </div>

      <div className="flex items-baseline space-x-1.5 flex-wrap">
        {prefix && (
          <span className="font-serif text-lg sm:text-2xl font-bold text-charcoal dark:text-chalk">
            {prefix}
          </span>
        )}
        <span className="font-serif text-2xl sm:text-4xl font-extrabold text-charcoal dark:text-chalk tracking-tight">
          {value}
        </span>
        {suffix && (
          <span className="text-sm font-medium text-charcoal-muted dark:text-chalk-muted">
            {suffix}
          </span>
        )}

        {delta && (
          <span
            className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
              deltaType === "good"
                ? "bg-leaf-light dark:bg-leaf-darkLight text-leaf"
                : deltaType === "bad"
                ? "bg-chilli-light dark:bg-chilli-darkLight text-chilli"
                : "bg-paper-200 dark:bg-chalkboard-border text-charcoal dark:text-chalk"
            }`}
          >
            {delta}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-1.5 text-xs text-charcoal-muted dark:text-chalk-muted truncate">
          {subtext}
        </div>
      )}
    </div>
  )
}
