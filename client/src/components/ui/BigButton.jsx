import React from "react"
import { Loader2 } from "lucide-react"

export const BigButton = ({
  children,
  variant = "primary",
  size = "default",
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = "left",
  fullWidth = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl select-none transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"

  const sizeStyles = {
    sm: "min-h-[40px] px-3.5 py-2 text-sm space-x-1.5",
    default: "min-h-[48px] px-5 py-3 text-base space-x-2.5", // minimum 48px tap target
    lg: "min-h-[56px] px-6 py-4 text-lg font-semibold space-x-3", // oversized kitchen prep button
  }

  const variantStyles = {
    primary:
      "bg-chilli text-white hover:bg-chilli-hover active:bg-chilli-hover shadow-sm hover:shadow-md focus-visible:ring-chilli",
    secondary:
      "bg-paper-50 dark:bg-chalkboard text-charcoal dark:text-chalk border border-paper-border dark:border-chalkboard-border hover:bg-paper-200 dark:hover:bg-chalkboard-border focus-visible:ring-charcoal",
    success:
      "bg-leaf text-white hover:bg-leaf-hover active:bg-leaf-hover shadow-sm focus-visible:ring-leaf",
    warning:
      "bg-turmeric text-charcoal font-semibold hover:bg-turmeric-hover active:bg-turmeric-hover shadow-sm focus-visible:ring-turmeric",
    ghost:
      "bg-transparent text-charcoal dark:text-chalk hover:bg-paper-200/60 dark:hover:bg-chalkboard-border focus-visible:ring-charcoal",
    danger:
      "bg-chilli-light dark:bg-chilli-darkLight text-chilli dark:text-chilli-light border border-chilli/30 hover:bg-chilli hover:text-white transition-colors focus-visible:ring-chilli",
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.default} ${
        variantStyles[variant] || variantStyles.primary
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon className="w-5 h-5 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === "right" && <Icon className="w-5 h-5 shrink-0" />}
        </>
      )}
    </button>
  )
}
