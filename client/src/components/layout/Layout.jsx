import React, { useState } from "react"
import { Outlet } from "react-router-dom"
import { ThePassTopBar } from "./ThePassTopBar"
import { ThePassBottomBar } from "./ThePassBottomBar"
import { MoreModulesSheet } from "./MoreModulesSheet"
import { QuickActionFab } from "./QuickActionFab"
import { CommandPalette } from "../ui/CommandPalette"

export const Layout = () => {
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="min-h-screen bg-paper dark:bg-chalkboard text-charcoal dark:text-chalk font-sans antialiased transition-colors duration-150 flex flex-col selection:bg-chilli/10 selection:text-chilli">
      {/* Desktop & Tablet Top Navigation */}
      <ThePassTopBar
        onOpenMore={() => setMoreOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Main Workspace Rail */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-12 transition-all">
        <Outlet />
      </main>

      {/* Mobile & Tablet 5-Item Bottom Bar */}
      <ThePassBottomBar onOpenMore={() => setMoreOpen(true)} />

      {/* Persistent Floating "+" Quick-Action Button */}
      <QuickActionFab />

      {/* "More Modules" Full Grid Overlay */}
      <MoreModulesSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* Global Cmd+K Command Palette */}
      <CommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onQuickAction={() => setSearchOpen(false)}
      />
    </div>
  )
}
