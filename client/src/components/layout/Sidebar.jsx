import React from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  ClipboardCheck,
  Receipt,
  UtensilsCrossed,
  Layers,
  Boxes,
  TrendingUp,
  ShoppingCart,
  Trash2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Leaf,
  Settings,
  LogOut,
  X,
  ChefHat
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"

export const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/daily-plan", label: "Daily Action Plan", icon: ClipboardCheck },
    ]
  },
  {
    title: "Operations",
    items: [
      { to: "/sales", label: "Sales & POS", icon: Receipt },
      { to: "/menu", label: "Menu Catalog", icon: UtensilsCrossed },
      { to: "/recipes", label: "Recipe BOM", icon: Layers },
      { to: "/inventory", label: "Inventory & Stock", icon: Boxes },
      { to: "/purchase-planner", label: "Purchase Planning", icon: ShoppingCart },
    ]
  },
  {
    title: "Kitchen Intelligence",
    items: [
      { to: "/forecast", label: "Demand Forecast", icon: TrendingUp },
      { to: "/waste", label: "Waste Management", icon: Trash2 },
      { to: "/waste?tab=expiry", label: "Expiry Alerts", icon: AlertTriangle, badge: "3" },
      { to: "/ai-recipes", label: "Leftover Upcycling", icon: Sparkles },
    ]
  },
  {
    title: "Insights & Admin",
    items: [
      { to: "/analytics", label: "Executive Reports", icon: BarChart3 },
      { to: "/environmental", label: "Environmental Impact", icon: Leaf },
      { to: "/settings", label: "Settings", icon: Settings },
    ]
  }
]

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  // Exact route and query param aware active indicator
  const isItemActive = (item) => {
    const currentPath = location.pathname
    const currentSearch = location.search

    if (item.to === "/") {
      return currentPath === "/"
    }

    if (item.to.includes("?")) {
      const [path, query] = item.to.split("?")
      return currentPath === path && currentSearch.includes(query)
    }

    if (item.to === "/inventory") {
      return currentPath === "/inventory"
    }

    if (item.to === "/waste") {
      return currentPath === "/waste" && !currentSearch.includes("tab=expiry")
    }

    return currentPath === item.to || currentPath.startsWith(item.to + "/")
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-r border-stone-200 dark:border-stone-800 flex flex-col h-screen transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-white dark:bg-stone-900">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 dark:bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm tracking-tight font-sans block leading-none">
                Kitchen Intel
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Commercial OS</span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isItemActive(item)
                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      onClick={() => {
                        if (onClose) onClose()
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        active
                          ? "bg-emerald-700 text-white font-semibold dark:bg-emerald-600 shadow-xs"
                          : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800/70"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active
                              ? "text-white"
                              : "text-stone-400 dark:text-stone-500 group-hover:text-stone-600"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Quick Footer with User Profile & Logout */}
        {user && (
          <div className="p-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 mt-auto text-xs bg-stone-50 dark:bg-stone-900/90">
            <div className="min-w-0 pr-2">
              <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">{user.fullName}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
