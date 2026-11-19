import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChefHat, Lock, User, ArrowRight, Sparkles } from "lucide-react"

import { useAuth } from "../context/AuthContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"

export const LoginPage = () => {
  const [username, setUsername] = useState("chef_vikram")
  const [password, setPassword] = useState("chef123")
  const [selectedRole, setSelectedRole] = useState("Head Chef")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const rolePresets = [
    { label: "Head Chef", user: "chef_vikram", pass: "chef123", icon: "👨‍🍳" },
    { label: "Manager", user: "manager_pooja", pass: "manager123", icon: "📋" },
    { label: "Inventory Clerk", user: "clerk_rahul", pass: "clerk123", icon: "📦" },
    { label: "Admin", user: "admin_aditya", pass: "admin123", icon: "🛡️" },
  ]

  const handleSelectRole = (r) => {
    setSelectedRole(r.label)
    setUsername(r.user)
    setPassword(r.pass)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(username, password)
      if (res.success) {
        navigate("/")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-chalkboard p-4 font-sans text-charcoal dark:text-chalk transition-colors duration-150">
      <div className="w-full max-w-md">
        <Ticket className="p-8 sm:p-10 shadow-2xl bg-white dark:bg-chalkboard-card border-paper-border dark:border-chalkboard-border">
          {/* Large Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-chilli items-center justify-center mb-4 shadow-chilli-glow text-white">
              <ChefHat className="w-9 h-9" />
            </div>
            <h1 className="font-serif font-extrabold text-2xl sm:text-3xl text-charcoal dark:text-chalk tracking-tight">
              The Pass
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-muted dark:text-chalk-muted font-medium mt-1">
              SpiceCraft Kitchen Intelligence OS
            </p>
          </div>

          {/* Tappable Role Chips */}
          <div className="mb-6 space-y-2">
            <label className="block text-[11px] font-bold text-charcoal-muted dark:text-chalk-muted uppercase tracking-wider text-center">
              Tap a Role to Sign In
            </label>
            <div className="grid grid-cols-2 gap-2">
              {rolePresets.map((r) => {
                const isSelected = selectedRole === r.label
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={`flex items-center space-x-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 text-left ${
                      isSelected
                        ? "bg-charcoal text-paper dark:bg-chalk dark:text-charcoal border-charcoal shadow-xs ring-2 ring-charcoal/30"
                        : "bg-paper-50 dark:bg-chalkboard border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal hover:bg-paper-200"
                    }`}
                  >
                    <span className="text-base select-none">{r.icon}</span>
                    <span className="truncate">{r.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted mb-1">
                Username / Staff ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 text-sm"
                  placeholder="Staff username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted mb-1">
                Security PIN / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal-muted absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <BigButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
            >
              Sign In to The Pass
            </BigButton>
          </form>

          <div className="mt-6 text-center text-xs text-charcoal-muted">
            <span>Fast, greasy-finger friendly kitchen operations</span>
          </div>
        </Ticket>
      </div>
    </div>
  )
}
