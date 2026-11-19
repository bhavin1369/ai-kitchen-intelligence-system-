import React from "react"
import { StatusTab } from "./StatusTab"

export const Ticket = ({
  children,
  status = null,
  perforated = true,
  className = "",
  onClick = null,
  highlighted = false,
  role = undefined,
  tabIndex = undefined,
  ...props
}) => {
  const isClickable = typeof onClick === "function"

  return (
    <div
      onClick={onClick}
      role={role || (isClickable ? "button" : undefined)}
      tabIndex={tabIndex ?? (isClickable ? 0 : undefined)}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick(e)
              }
            }
          : undefined
      }
      className={`relative flex items-stretch rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket dark:shadow-ticket-dark transition-all duration-150 overflow-hidden ${
        perforated ? "ticket-perforated" : ""
      } ${
        highlighted ? "ring-2 ring-chilli" : ""
      } ${
        isClickable
          ? "cursor-pointer hover:shadow-ticket-hover active:scale-[0.99] hover:border-charcoal/20 dark:hover:border-chalk/20"
          : ""
      } ${className}`}
      {...props}
    >
      {/* Left-edge status indicator stripe */}
      {status && <StatusTab status={status} />}

      {/* Ticket body */}
      <div className="flex-1 p-4 sm:p-5 min-w-0">{children}</div>
    </div>
  )
}
