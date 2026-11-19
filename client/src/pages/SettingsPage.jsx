import React, { useState } from "react"
import {
  Settings,
  Building2,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  User,
  Bell,
  Save,
  RotateCcw
} from "lucide-react"

import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"

export const SettingsPage = () => {
  const { user, switchRole } = useAuth()
  const toast = useToast()

  // Store profile
  const [restaurantName, setRestaurantName] = useState("SpiceCraft Kitchen & Dining")
  const [city, setCity] = useState("Hyderabad, Telangana")
  const [taxRate, setTaxRate] = useState(5)

  // Toggles instead of dropdowns
  const [autoDraftPOs, setAutoDraftPOs] = useState(true)
  const [fefoAlerts, setFefoAlerts] = useState(true)
  const [weatherMultiplier, setWeatherMultiplier] = useState(true)
  const [festivalMultiplier, setFestivalMultiplier] = useState(true)
  const [lowStockSms, setLowStockSms] = useState(false)
  const [soundAlerts, setSoundAlerts] = useState(true)

  const handleSave = (e) => {
    e.preventDefault()
    toast.success("Kitchen settings saved successfully!")
  }

  const roles = [
    { role: "Head Chef", name: "Vikram Sharma" },
    { role: "Kitchen Manager", name: "Pooja Hegde" },
    { role: "Inventory Clerk", name: "Rahul Mehta" },
    { role: "Administrator", name: "Aditya Verma" },
  ]

  // Toggle Switch Component
  const ToggleSwitch = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-paper-50 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
      <div className="min-w-0 pr-4">
        <div className="font-bold text-sm text-charcoal dark:text-chalk">{label}</div>
        {description && (
          <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5">
            {description}
          </div>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-leaf" : "bg-paper-border dark:bg-chalkboard-border"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-charcoal-muted uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Kitchen Configuration</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Settings & Preferences
          </h1>
        </div>

        <BigButton type="submit" variant="primary" icon={Save}>
          Save Settings
        </BigButton>
      </div>

      {/* SECTION 1: Kitchen Profile */}
      <Ticket>
        <div className="border-b border-paper-border dark:border-chalkboard-border pb-2.5 mb-4">
          <h2 className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
            Kitchen & Restaurant Profile
          </h2>
          <p className="text-xs text-charcoal-muted">
            Display identity for ticket rails and receipts
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1.5">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1.5">
              Location / City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1.5">
              Default GST Tax Rate (%)
            </label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full p-2.5 text-sm"
            />
          </div>
        </div>
      </Ticket>

      {/* SECTION 2: Inventory & FEFO Rules (Toggles) */}
      <Ticket>
        <div className="border-b border-paper-border dark:border-chalkboard-border pb-2.5 mb-4">
          <h2 className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
            Inventory & FEFO Rules
          </h2>
          <p className="text-xs text-charcoal-muted">
            Automated stock rotation and par reorder behavior
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleSwitch
            checked={autoDraftPOs}
            onChange={setAutoDraftPOs}
            label="Auto-Draft Purchase Orders"
            description="Automatically generate draft orders when stock drops below par"
          />

          <ToggleSwitch
            checked={fefoAlerts}
            onChange={setFefoAlerts}
            label="Enforce FEFO Batch Sorting"
            description="Prioritize oldest active batches first across all recipes"
          />

          <ToggleSwitch
            checked={soundAlerts}
            onChange={setSoundAlerts}
            label="Audio Bleeps on Order Complete"
            description="Play confirmation beep for loud kitchen pass environments"
          />

          <ToggleSwitch
            checked={lowStockSms}
            onChange={setLowStockSms}
            label="Emergency Low Stock SMS"
            description="Send mobile notification to manager when critical staples hit zero"
          />
        </div>
      </Ticket>

      {/* SECTION 3: AI Intelligence Multipliers (Toggles) */}
      <Ticket>
        <div className="border-b border-paper-border dark:border-chalkboard-border pb-2.5 mb-4">
          <h2 className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
            AI Demand Forecast Factors
          </h2>
          <p className="text-xs text-charcoal-muted">
            Fine-tune automatic multipliers in the prediction engine
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleSwitch
            checked={festivalMultiplier}
            onChange={setFestivalMultiplier}
            label="Diwali / Indian Calendar Lift (+35%)"
            description="Account for major regional festival surges automatically"
          />

          <ToggleSwitch
            checked={weatherMultiplier}
            onChange={setWeatherMultiplier}
            label="Rain & Temperature Modifiers"
            description="Adjust hot soup & beverage predictions based on live weather"
          />
        </div>
      </Ticket>

      {/* SECTION 4: Active Role Switcher */}
      <Ticket>
        <div className="border-b border-paper-border dark:border-chalkboard-border pb-2.5 mb-4">
          <h2 className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
            Demo Kitchen Staff Role
          </h2>
          <p className="text-xs text-charcoal-muted">
            Tap a role to switch user context instantly
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {roles.map((r) => {
            const isCurrent = user?.role === r.role
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => {
                  switchRole(r.role, r.name)
                  toast.success(`Switched role to ${r.role} (${r.name})`)
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer select-none active:scale-95 ${
                  isCurrent
                    ? "bg-chilli text-white border-chilli font-bold shadow-xs"
                    : "bg-paper-50 dark:bg-chalkboard border-paper-border dark:border-chalkboard-border text-charcoal dark:text-chalk hover:bg-paper-200"
                }`}
              >
                <div className="font-serif font-bold text-sm sm:text-base">{r.role}</div>
                <div className="text-xs opacity-80 mt-0.5">{r.name}</div>
              </button>
            )
          })}
        </div>
      </Ticket>
    </form>
  )
}
