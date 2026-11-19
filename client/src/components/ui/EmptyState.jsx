import React from "react"
import { BigButton } from "./BigButton"

export const EmptyState = ({
  icon: Icon = null,
  emoji = null,
  title,
  description,
  actionLabel = null,
  onAction = null,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white/60 dark:bg-chalkboard-card/60 border-2 border-dashed border-paper-border dark:border-chalkboard-border ${className}`}
    >
      {emoji ? (
        <span className="text-4xl sm:text-5xl mb-3 select-none" role="img" aria-hidden="true">
          {emoji}
        </span>
      ) : Icon ? (
        <div className="w-14 h-14 rounded-2xl bg-paper-200 dark:bg-chalkboard-border text-charcoal-muted dark:text-chalk-muted flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </div>
      ) : null}

      <h3 className="font-serif font-bold text-lg sm:text-xl text-charcoal dark:text-chalk">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-charcoal-muted dark:text-chalk-muted max-w-sm mt-1 mb-5">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <BigButton variant="primary" onClick={onAction}>
          {actionLabel}
        </BigButton>
      )}
    </div>
  )
}
