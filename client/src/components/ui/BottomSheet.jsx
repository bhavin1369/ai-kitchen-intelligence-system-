import React, { useEffect } from "react"
import { X } from "lucide-react"

export const BottomSheet = ({
  isOpen,
  onClose,
  title,
  subtitle = null,
  children,
  maxWidth = "max-w-xl",
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-charcoal/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Drawer Card */}
      <div
        className={`relative w-full ${maxWidth} max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-paper-50 dark:bg-chalkboard-card rounded-t-3xl sm:rounded-2xl border border-paper-border dark:border-chalkboard-border shadow-2xl z-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-200`}
      >
        {/* Pull handle indicator on mobile */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-paper-border dark:bg-chalkboard-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-border dark:border-chalkboard-border bg-white dark:bg-chalkboard-card">
          <div className="min-w-0 pr-3">
            <h2 className="font-serif font-bold text-lg sm:text-xl text-charcoal dark:text-chalk truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-charcoal-muted dark:text-chalk-muted truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-charcoal-muted dark:text-chalk-muted hover:text-charcoal dark:hover:text-chalk hover:bg-paper-200 dark:hover:bg-chalkboard-border transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  )
}
