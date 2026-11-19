import React, { createContext, useContext, useState, useCallback, useRef } from "react"
import { CheckCircle2, AlertCircle, RotateCcw, X } from "lucide-react"

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(({ message, type = "info", duration = 4000, onUndo }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)

    const newToast = {
      id,
      message,
      type,
      duration,
      onUndo,
      createdAt: Date.now(),
    }

    setToasts((prev) => [...prev.slice(-3), newToast]) // keep max 4 toasts

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [removeToast])

  const showUndo = useCallback((message, onUndo, duration = 5000) => {
    return showToast({
      message,
      type: "undo",
      duration,
      onUndo,
    })
  }, [showToast])

  const success = useCallback((message, duration = 3500) => {
    return showToast({ message, type: "success", duration })
  }, [showToast])

  const error = useCallback((message, duration = 4500) => {
    return showToast({ message, type: "error", duration })
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, showUndo, success, error, removeToast }}>
      {children}

      {/* Toast container floating above mobile bottom bar or bottom desktop */}
      <div
        className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2 pointer-events-none w-full max-w-md px-4"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between space-x-3 w-full p-3.5 sm:p-4 rounded-xl shadow-xl border text-sm transition-all duration-200 transform animate-in fade-in slide-in-from-bottom-2 ${
              t.type === "undo"
                ? "bg-charcoal text-paper dark:bg-chalk dark:text-charcoal border-charcoal/20"
                : t.type === "success"
                ? "bg-leaf-light dark:bg-leaf-darkLight text-leaf-hover dark:text-leaf border-leaf/30"
                : t.type === "error"
                ? "bg-chilli-light dark:bg-chilli-darkLight text-chilli dark:text-chilli-light border-chilli/30"
                : "bg-white dark:bg-chalkboard-card text-charcoal dark:text-chalk border-paper-border dark:border-chalkboard-border"
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0 text-leaf" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 shrink-0 text-chilli" />}
              {t.type === "undo" && <RotateCcw className="w-5 h-5 shrink-0 text-turmeric animate-pulse" />}
              <span className="font-medium truncate text-sm sm:text-base">{t.message}</span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {t.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      t.onUndo()
                    } catch (err) {
                      console.error("Undo error:", err)
                    }
                    removeToast(t.id)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-turmeric text-charcoal font-bold text-xs uppercase tracking-wider hover:bg-turmeric-hover active:scale-95 transition cursor-pointer"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-md opacity-70 hover:opacity-100 transition cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
