import React from "react"
import { useNavigate } from "react-router-dom"
import {
  UtensilsCrossed,
  Layers,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  Leaf,
  BarChart3,
  Settings,
  ClipboardCheck,
  X,
  ChevronRight
} from "lucide-react"

export const MoreModulesSheet = ({ isOpen, onClose }) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  const modules = [
    {
      to: "/menu",
      title: "Menu & Pricing",
      desc: "Dishes, costs, categories, active status",
      icon: UtensilsCrossed,
      color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    },
    {
      to: "/recipes",
      title: "Recipe BOM & Margins",
      desc: "Ingredient breakdowns & portion costs",
      icon: Layers,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    },
    {
      to: "/forecast",
      title: "Demand Forecast",
      desc: "Expected covers, calendar & weather impact",
      icon: TrendingUp,
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    {
      to: "/purchase-planner",
      title: "Purchase Planner",
      desc: "Shopping lists & automated reorder batches",
      icon: ShoppingCart,
      color: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
    },
    {
      to: "/ai-recipes",
      title: "AI Leftover Recipes",
      desc: "Upcycling surplus into high-margin specials",
      icon: Sparkles,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    },
    {
      to: "/environmental",
      title: "Environmental Impact",
      desc: "Trees, water & carbon emissions saved",
      icon: Leaf,
      color: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
    },
    {
      to: "/analytics",
      title: "Reports & Backups",
      desc: "Financial summaries & CSV downloads",
      icon: BarChart3,
      color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
    },
    {
      to: "/daily-plan",
      title: "Full Daily Action Plan",
      desc: "Detailed chef prep station sheet",
      icon: ClipboardCheck,
      color: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    },
    {
      to: "/settings",
      title: "Kitchen Settings",
      desc: "Lead times, par thresholds & store info",
      icon: Settings,
      color: "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300",
    },
  ]

  const handleNavigate = (path) => {
    onClose()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-charcoal/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-paper-50 dark:bg-chalkboard-card rounded-t-3xl sm:rounded-2xl border border-paper-border dark:border-chalkboard-border shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-border dark:border-chalkboard-border bg-white dark:bg-chalkboard-card">
          <div>
            <h2 className="font-serif font-bold text-xl text-charcoal dark:text-chalk">
              All Kitchen Modules
            </h2>
            <p className="text-xs text-charcoal-muted dark:text-chalk-muted">
              Select any operations tool or system module
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-charcoal-muted dark:text-chalk-muted hover:bg-paper-200 dark:hover:bg-chalkboard-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modules Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar">
          {modules.map((m, idx) => {
            const Icon = m.icon
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleNavigate(m.to)}
                className="flex items-start p-3.5 rounded-xl bg-white dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border hover:border-chilli/40 dark:hover:border-chilli/40 shadow-xs hover:shadow-md transition-all text-left cursor-pointer group active:scale-[0.98]"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3.5 shrink-0 ${m.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm sm:text-base text-charcoal dark:text-chalk group-hover:text-chilli transition-colors flex items-center justify-between">
                    <span>{m.title}</span>
                    <ChevronRight className="w-4 h-4 text-charcoal-muted/50 group-hover:text-chilli group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5 line-clamp-1">
                    {m.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
