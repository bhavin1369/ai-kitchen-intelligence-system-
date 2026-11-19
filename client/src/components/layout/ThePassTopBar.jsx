import React, { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  ChefHat,
  Search,
  Sun,
  Moon,
  Grid,
  Calendar,
  Receipt,
  Boxes,
  Trash2,
  MoreHorizontal,
  LogOut,
  User,
  Bell
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

export const ThePassTopBar = ({ onOpenMore, onOpenSearch, onOpenQuickAction }) => {
  const { user, logout } = useAuth()
  const { theme, setTheme, isDark } = useTheme()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)

  const navItems = [
    { to: "/", label: "Today", icon: Calendar, exact: true },
    { to: "/sales", label: "Sell", icon: Receipt },
    { to: "/inventory", label: "Stock", icon: Boxes },
    { to: "/waste", label: "Waste", icon: Trash2 },
  ]

  const isItemActive = (item) => {
    if (item.exact) return location.pathname === "/"
    return location.pathname.startsWith(item.to)
  }

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date())

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 dark:bg-chalkboard-card/95 backdrop-blur-md border-b border-paper-border dark:border-chalkboard-border px-4 sm:px-6 transition-colors duration-150">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        {/* Brand & Pass Title */}
        <div className="flex items-center space-x-6">
          <NavLink to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-chilli flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="font-serif font-extrabold text-lg text-charcoal dark:text-chalk leading-none tracking-tight">
                The Pass
              </div>
              <div className="text-[11px] font-medium text-charcoal-muted dark:text-chalk-muted leading-tight mt-0.5">
                Kitchen Intelligence OS
              </div>
            </div>
          </NavLink>

          {/* Desktop 5-Item Navigation */}
          <nav className="hidden md:flex items-center space-x-1.5 ml-4">
            {navItems.map((item) => {
              const active = isItemActive(item)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-base font-medium transition-all duration-150 ${
                    active
                      ? "bg-chilli text-white shadow-xs font-semibold"
                      : "text-charcoal-muted dark:text-chalk-muted hover:text-charcoal dark:hover:text-chalk hover:bg-paper-200/70 dark:hover:bg-chalkboard-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}

            {/* "More" Trigger */}
            <button
              type="button"
              onClick={onOpenMore}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-base font-medium text-charcoal-muted dark:text-chalk-muted hover:text-charcoal dark:hover:text-chalk hover:bg-paper-200/70 dark:hover:bg-chalkboard-border transition cursor-pointer"
            >
              <Grid className="w-4 h-4" />
              <span>More</span>
            </button>
          </nav>
        </div>

        {/* Right Controls: Search, Date, Theme, User */}
        <div className="flex items-center space-x-3">
          {/* Search / Command Palette Pill */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden sm:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border text-charcoal-muted dark:text-chalk-muted hover:border-charcoal/30 text-xs transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="font-medium">Jump to...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          {/* Shift Date */}
          <div className="hidden lg:flex items-center px-2.5 py-1 rounded-lg bg-paper-100 dark:bg-chalkboard text-xs font-medium text-charcoal-muted dark:text-chalk-muted border border-paper-border dark:border-chalkboard-border">
            <span>{todayFormatted}</span>
          </div>

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border text-charcoal dark:text-chalk hover:bg-paper-200 dark:hover:bg-chalkboard-border transition cursor-pointer"
            aria-label="Toggle dark/light mode"
            title={isDark ? "Switch to Warm Paper (Light)" : "Switch to Chalkboard (Dark)"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-turmeric" />
            ) : (
              <Moon className="w-4 h-4 text-charcoal" />
            )}
          </button>

          {/* User Profile Menu */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-paper-200 dark:hover:bg-chalkboard-border transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-charcoal text-paper dark:bg-chalk dark:text-charcoal font-bold text-xs flex items-center justify-center">
                  {user.fullName ? user.fullName[0].toUpperCase() : "C"}
                </div>
                <div className="hidden xl:block text-left text-xs leading-tight">
                  <div className="font-bold text-charcoal dark:text-chalk truncate max-w-[120px]">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-charcoal-muted dark:text-chalk-muted">
                    {user.role}
                  </div>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 text-xs">
                  <div className="p-2 border-b border-paper-border dark:border-chalkboard-border mb-1">
                    <div className="font-bold text-charcoal dark:text-chalk">
                      {user.fullName}
                    </div>
                    <div className="text-charcoal-muted dark:text-chalk-muted text-[11px] truncate">
                      {user.email || user.username}
                    </div>
                    <div className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-paper-200 dark:bg-chalkboard text-[10px] font-semibold text-charcoal dark:text-chalk">
                      {user.role}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <NavLink
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-charcoal dark:text-chalk hover:bg-paper-100 dark:hover:bg-chalkboard-border font-medium"
                    >
                      Kitchen Settings
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-chilli hover:bg-chilli-light dark:hover:bg-chilli-darkLight font-medium cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
