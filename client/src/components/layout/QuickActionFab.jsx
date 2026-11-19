import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Receipt, Trash2, Boxes, UtensilsCrossed, X } from "lucide-react"

export const QuickActionFab = ({ onTriggerAction }) => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const actions = [
    {
      id: "sale",
      label: "Record Sale",
      desc: "Add order to current shift",
      icon: Receipt,
      path: "/sales",
      color: "bg-chilli text-white",
    },
    {
      id: "waste",
      label: "Log Waste",
      desc: "Record spoilage or leftovers",
      icon: Trash2,
      path: "/waste",
      color: "bg-turmeric text-charcoal",
    },
    {
      id: "stock",
      label: "Update Stock",
      desc: "Receive batch or adjust par",
      icon: Boxes,
      path: "/inventory",
      color: "bg-leaf text-white",
    },
    {
      id: "dish",
      label: "Add Dish",
      desc: "New menu recipe or price",
      icon: UtensilsCrossed,
      path: "/menu",
      color: "bg-charcoal text-paper dark:bg-chalk dark:text-charcoal",
    },
  ]

  const handleSelect = (act) => {
    setOpen(false)
    if (onTriggerAction) {
      onTriggerAction(act.id)
    }
    navigate(act.path)
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 md:bottom-8 right-5 z-40 w-14 h-14 rounded-2xl bg-chilli text-white shadow-xl hover:bg-chilli-hover active:scale-95 flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chilli focus-visible:ring-offset-2"
        aria-label="Quick Kitchen Actions"
        title="Quick Kitchen Actions (+)"
      >
        <Plus className={`w-7 h-7 transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
      </button>

      {/* Quick Action Bottom Sheet / Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-charcoal/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md bg-paper-50 dark:bg-chalkboard-card rounded-t-3xl sm:rounded-2xl border border-paper-border dark:border-chalkboard-border shadow-2xl z-10 overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-paper-border dark:border-chalkboard-border bg-white dark:bg-chalkboard-card">
              <div>
                <h3 className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
                  Quick Action
                </h3>
                <p className="text-xs text-charcoal-muted dark:text-chalk-muted">
                  What do you need to log right now?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-charcoal-muted dark:text-chalk-muted hover:bg-paper-200 dark:hover:bg-chalkboard-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              {actions.map((act) => {
                const Icon = act.icon
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleSelect(act)}
                    className="w-full flex items-center p-3.5 rounded-xl bg-white dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border hover:border-chilli/40 shadow-xs hover:shadow-md transition text-left cursor-pointer active:scale-[0.98] group"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3.5 shrink-0 shadow-xs ${act.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-base text-charcoal dark:text-chalk group-hover:text-chilli transition-colors">
                        {act.label}
                      </div>
                      <div className="text-xs text-charcoal-muted dark:text-chalk-muted">
                        {act.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
