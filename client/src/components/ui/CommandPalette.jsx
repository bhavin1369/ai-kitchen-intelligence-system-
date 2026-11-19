import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Receipt,
  Boxes,
  Trash2,
  Calendar,
  UtensilsCrossed,
  Layers,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  BarChart3,
  Leaf,
  Settings,
  PlusCircle,
  X,
  ArrowRight
} from "lucide-react"

export const CommandPalette = ({ isOpen, onClose, onQuickAction }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (isOpen) onClose()
        else onClose(true) // toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const items = [
    // Fast Quick Actions
    {
      type: "action",
      actionId: "sale",
      title: "Record New Sale / Bill",
      category: "Quick Actions",
      icon: Receipt,
      hotkey: "S",
    },
    {
      type: "action",
      actionId: "waste",
      title: "Log Food Waste",
      category: "Quick Actions",
      icon: Trash2,
      hotkey: "W",
    },
    {
      type: "action",
      actionId: "stock",
      title: "Receive Stock Batch",
      category: "Quick Actions",
      icon: Boxes,
      hotkey: "B",
    },
    {
      type: "action",
      actionId: "dish",
      title: "Add New Menu Dish",
      category: "Quick Actions",
      icon: PlusCircle,
      hotkey: "M",
    },
    // Navigation Modules
    {
      type: "nav",
      to: "/",
      title: "Today's Pass (Home)",
      category: "Navigation",
      icon: Calendar,
    },
    {
      type: "nav",
      to: "/sales",
      title: "Sell (Sales & POS Pad)",
      category: "Navigation",
      icon: Receipt,
    },
    {
      type: "nav",
      to: "/inventory",
      title: "Stock & Inventory (Use First)",
      category: "Navigation",
      icon: Boxes,
    },
    {
      type: "nav",
      to: "/waste",
      title: "Waste Prevention & Logs",
      category: "Navigation",
      icon: Trash2,
    },
    {
      type: "nav",
      to: "/forecast",
      title: "Demand Forecast & Covers",
      category: "Navigation",
      icon: TrendingUp,
    },
    {
      type: "nav",
      to: "/purchase-planner",
      title: "Purchase Planner (Shopping List)",
      category: "Navigation",
      icon: ShoppingCart,
    },
    {
      type: "nav",
      to: "/menu",
      title: "Menu Items & Pricing",
      category: "Navigation",
      icon: UtensilsCrossed,
    },
    {
      type: "nav",
      to: "/recipes",
      title: "Recipe BOM & Margins",
      category: "Navigation",
      icon: Layers,
    },
    {
      type: "nav",
      to: "/ai-recipes",
      title: "AI Leftover Recipes (Upcycling)",
      category: "Navigation",
      icon: Sparkles,
    },
    {
      type: "nav",
      to: "/environmental",
      title: "Environmental Impact (Eco)",
      category: "Navigation",
      icon: Leaf,
    },
    {
      type: "nav",
      to: "/analytics",
      title: "Reports & Backups",
      category: "Navigation",
      icon: BarChart3,
    },
    {
      type: "nav",
      to: "/settings",
      title: "Kitchen Settings",
      category: "Navigation",
      icon: Settings,
    },
  ]

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (item) => {
    onClose()
    if (item.type === "nav") {
      navigate(item.to)
    } else if (item.type === "action" && onQuickAction) {
      onQuickAction(item.actionId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      <div
        className="fixed inset-0 bg-charcoal/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-chalkboard-card rounded-2xl border border-paper-border dark:border-chalkboard-border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[75vh]">
        {/* Search Input bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-paper-border dark:border-chalkboard-border">
          <Search className="w-5 h-5 text-charcoal-muted dark:text-chalk-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to screen... (e.g. 'Sell', 'Waste')"
            className="w-full text-base bg-transparent border-0 p-0 text-charcoal dark:text-chalk placeholder:text-charcoal-muted/60 dark:placeholder:text-chalk-muted/60 focus:ring-0 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-charcoal-muted dark:text-chalk-muted hover:text-charcoal dark:hover:text-chalk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-charcoal-muted dark:text-chalk-muted">
              No matching pages or kitchen commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-paper-100 dark:hover:bg-chalkboard-border text-left transition cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-paper-200 dark:bg-chalkboard flex items-center justify-center text-charcoal dark:text-chalk shrink-0 group-hover:bg-chilli group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="font-medium text-sm sm:text-base text-charcoal dark:text-chalk truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-charcoal-muted dark:text-chalk-muted">
                        {item.category}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-charcoal-muted dark:text-chalk-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 bg-paper-50 dark:bg-chalkboard border-t border-paper-border dark:border-chalkboard-border flex items-center justify-between text-xs text-charcoal-muted dark:text-chalk-muted">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-paper-200 dark:bg-chalkboard-card font-mono text-[11px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-paper-200 dark:bg-chalkboard-card font-mono text-[11px]">K</kbd> anytime</span>
          <span>Kitchen Intelligence OS</span>
        </div>
      </div>
    </div>
  )
}
