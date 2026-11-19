import React, { useState } from "react"
import {
  Settings,
  Building2,
  Cpu,
  Calendar,
  Users,
  Database,
  Save,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RotateCcw
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { indianCalendarEvents } from "../data/mockData"

export const SettingsPage = () => {
  const { user, switchRole } = useAuth()
  const [activeTab, setActiveTab] = useState("restaurant")
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Restaurant profile states
  const [restaurantName, setRestaurantName] = useState("SpiceCraft Kitchen & Dining")
  const [city, setCity] = useState("Hyderabad, Telangana")
  const [taxRate, setTaxRate] = useState(5)
  const [currency, setCurrency] = useState("INR (₹)")

  // AI settings
  const [safetyBuffer, setSafetyBuffer] = useState(15)
  const [fefoAlertWindow, setFefoAlertWindow] = useState(48)
  const [autoDraftPOs, setAutoDraftPOs] = useState(true)

  // Calendar multipliers
  const [events, setEvents] = useState(() => (indianCalendarEvents || []))

  const handleSave = (e) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const handleToggleEvent = (id) => {
    setEvents((prev) =>
      (prev || []).map((evt) => (evt.id === id ? { ...evt, isActive: !evt.isActive } : evt))
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            System Settings & Operations Configuration
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Configure restaurant parameters, AI safety thresholds, calendar multipliers, and staff access roles.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          <span>Save Changes</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span>Configuration saved successfully. Operational thresholds updated.</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="inline-flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg text-xs font-medium overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab("restaurant")}
          className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "restaurant"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Restaurant Profile</span>
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "ai"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI & Safety Buffers</span>
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "calendar"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Festival & Event Multipliers</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "users"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-semibold shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Kitchen Staff & Roles</span>
        </button>
      </div>

      {/* Tab 1: Restaurant Profile */}
      {activeTab === "restaurant" && (
        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 max-w-2xl text-xs">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Establishment Profile</h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Primary business identity and tax identification details</p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Restaurant Trade Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">City / Region</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Currency Standard</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 focus:outline-none"
                >
                  <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                  <option value="USD ($)">US Dollar ($)</option>
                  <option value="AED (د.إ)">UAE Dirham (AED)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Standard GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">POS Terminal ID</label>
                <input
                  type="text"
                  disabled
                  value="TERM-HYD-01"
                  className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI & Safety Buffers */}
      {activeTab === "ai" && (
        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 max-w-2xl text-xs">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">AI Predictive Engine Thresholds</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between font-medium mb-1.5">
                <span className="text-stone-700 dark:text-stone-300">Safety Par Stock Buffer:</span>
                <span className="font-mono font-semibold text-forest-900 dark:text-emerald-400">{safetyBuffer}% extra stock</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                className="w-full accent-forest-900 dark:accent-emerald-500"
              />
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                AI adds this percentage buffer over expected forecast demand to prevent stockouts during unexpected peak rushes.
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
              <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">FEFO Expiry Alert Trigger</label>
              <select
                value={fefoAlertWindow}
                onChange={(e) => setFefoAlertWindow(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:border-stone-400 focus:outline-none"
              >
                <option value={24}>24 Hours before expiration</option>
                <option value={48}>48 Hours before expiration (Recommended)</option>
                <option value={72}>72 Hours before expiration</option>
              </select>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                Batches expiring within this window trigger high-priority alerts and AI leftover upcycling specials.
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="font-medium text-stone-800 dark:text-stone-200">Auto-Generate Supplier Purchase Orders</span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  When stock falls below reorder points, automatically prepare draft POs grouped by vendor.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoDraftPOs}
                onChange={(e) => setAutoDraftPOs(e.target.checked)}
                className="w-4 h-4 accent-forest-900 dark:accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Calendar Multipliers */}
      {activeTab === "calendar" && (
        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 max-w-3xl text-xs">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Indian Festive & Seasonal Multipliers</h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              The AI incorporates these holiday weights into the ridge demand regression model.
            </p>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            {(events || []).map((evt) => (
              <div key={evt.id || evt.name} className="p-3.5 flex items-center justify-between hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition">
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs">{evt.name}</div>
                  <div className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">
                    {evt.dateRange || evt.date} • Affects: {evt.categoryImpact || "Demand Multiplier"}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-mono font-semibold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                    +{Math.round(((evt.multiplier || 1.3) - 1) * 100)}% ({evt.multiplier || 1.3}x)
                  </span>
                  <button
                    onClick={() => handleToggleEvent(evt.id)}
                    className={`cursor-pointer text-xs font-medium px-2.5 py-1 rounded-md transition ${
                      evt.isActive !== false
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                    }`}
                  >
                    {evt.isActive !== false ? "Active" : "Paused"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Kitchen Staff & Roles */}
      {activeTab === "users" && (
        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 max-w-3xl text-xs">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Kitchen Staff & Permission Roles</h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Switch role profile to simulate different permission views across the dashboard.
            </p>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            {[
              { id: 1, name: "Vikram Sharma", role: "Head Chef", email: "chef.vikram@spicecraft.com" },
              { id: 2, name: "Ananya Iyer", role: "Kitchen Manager", email: "ananya.iyer@spicecraft.com" },
              { id: 3, name: "Rahul Mehta", role: "Inventory Clerk", email: "rahul.mehta@spicecraft.com" },
              { id: 4, name: "Priya Rao", role: "POS Cashier", email: "priya.rao@spicecraft.com" },
            ].map((staff) => (
              <div key={staff.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-xs flex items-center justify-center">
                    {staff.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs">{staff.name}</div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">{staff.email}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                    {staff.role}
                  </span>
                  <button
                    onClick={() => switchRole(staff.role, staff.name)}
                    className="px-2.5 py-1 rounded-md bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium transition cursor-pointer shadow-xs"
                  >
                    Act As User
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
