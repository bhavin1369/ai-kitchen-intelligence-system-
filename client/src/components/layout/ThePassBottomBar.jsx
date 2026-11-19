import React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Calendar, Receipt, Boxes, Trash2, Grid } from "lucide-react"

export const ThePassBottomBar = ({ onOpenMore }) => {
  const location = useLocation()

  const tabs = [
    { to: "/", label: "Today", icon: Calendar, exact: true },
    { to: "/sales", label: "Sell", icon: Receipt },
    { to: "/inventory", label: "Stock", icon: Boxes },
    { to: "/waste", label: "Waste", icon: Trash2 },
  ]

  const isTabActive = (tab) => {
    if (tab.exact) return location.pathname === "/"
    return location.pathname.startsWith(tab.to)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-chalkboard-card/95 backdrop-blur-md border-t border-paper-border dark:border-chalkboard-border px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors duration-150"
      aria-label="Bottom Navigation"
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab)
        const Icon = tab.icon
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center justify-center min-h-[52px] min-w-[56px] px-2 py-1 rounded-xl transition-all select-none ${
              active
                ? "text-chilli font-bold scale-105"
                : "text-charcoal-muted dark:text-chalk-muted font-medium hover:text-charcoal dark:hover:text-chalk"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                active ? "bg-chilli-light dark:bg-chilli-darkLight text-chilli" : ""
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] leading-tight mt-0.5">{tab.label}</span>
          </NavLink>
        )
      })}

      {/* "More" module opener */}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center min-h-[52px] min-w-[56px] px-2 py-1 rounded-xl text-charcoal-muted dark:text-chalk-muted font-medium hover:text-charcoal dark:hover:text-chalk select-none cursor-pointer"
      >
        <div className="p-1.5 rounded-lg">
          <Grid className="w-5 h-5" />
        </div>
        <span className="text-[11px] leading-tight mt-0.5">More</span>
      </button>
    </nav>
  )
}
