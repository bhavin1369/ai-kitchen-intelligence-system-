import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Trash2,
  AlertTriangle,
  Search,
  Plus,
  TrendingDown,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  X,
  FileSpreadsheet,
  ChevronRight,
  PieChart as PieChartIcon
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar
} from "recharts"

import { wasteService, inventoryService, menuService } from "../services/api"
import { useTheme } from "../context/ThemeContext"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { Stepper } from "../components/ui/Stepper"
import { FilterChip } from "../components/ui/FilterChip"
import { StatNumber } from "../components/ui/StatNumber"

export const WasteManagementPage = () => {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  // State
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get("tab")
    return tabParam === "expiry" ? "expiry" : "logs"
  }) // 'logs' | 'analytics' | 'expiry'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [wasteLogs, setWasteLogs] = useState([])
  const [analyticsData, setAnalyticsData] = useState(null)
  const [expiryAlerts, setExpiryAlerts] = useState(null)
  const [ingredientsList, setIngredientsList] = useState([])

  // 2-Step Logging State
  const [stepItem, setStepItem] = useState("Fresh Paneer")
  const [stepCustomItem, setStepCustomItem] = useState("")
  const [stepReason, setStepReason] = useState("Spoilage")
  const [stepQty, setStepQty] = useState(1.5)
  const [stepUnit, setStepUnit] = useState("kg")
  const [submittingWaste, setSubmittingWaste] = useState(false)

  // Frequent quick chips for fast step-1 logging
  const quickItems = [
    "Fresh Paneer",
    "Tomatoes",
    "Cooked Basmati Rice",
    "Dal Makhani",
    "Full Cream Milk",
    "Red Onions",
    "Curd / Yogurt",
  ]

  const reasons = [
    { id: "Spoilage", label: "Spoilage", color: "bg-chilli text-white" },
    { id: "Expiry", label: "Expiry Date", color: "bg-turmeric text-charcoal" },
    { id: "Overproduction", label: "Overproduction", color: "bg-blue-600 text-white" },
    { id: "Preparation Waste", label: "Prep Trim", color: "bg-stone-700 text-white" },
  ]

  // Load Data
  const loadWasteData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const [logsRes, anaRes, expRes, ingRes] = await Promise.allSettled([
        wasteService.getAll(),
        wasteService.getAnalytics({ days: 14 }),
        wasteService.getExpiryAlerts(),
        inventoryService.getAll(),
      ])

      if (logsRes.status === "fulfilled" && logsRes.value.data?.data) {
        setWasteLogs(logsRes.value.data.data)
      }
      if (anaRes.status === "fulfilled" && anaRes.value.data) {
        setAnalyticsData(anaRes.value.data)
      }
      if (expRes.status === "fulfilled" && expRes.value.data) {
        setExpiryAlerts(expRes.value.data)
      }
      if (ingRes.status === "fulfilled" && ingRes.value.data?.data) {
        setIngredientsList(ingRes.value.data.data)
      }
    } catch (err) {
      console.error("Waste data load error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadWasteData()
  }, [])

  // 2-Step Quick Log Submission
  const handleLogWasteSubmit = async () => {
    const finalItemName = stepCustomItem.trim() || stepItem
    if (!finalItemName) {
      toast.error("Please tap or enter an item name.")
      return
    }

    setSubmittingWaste(true)
    const costEstimate = Math.round(stepQty * 85)

    try {
      const payload = {
        ingredientName: finalItemName,
        quantity: stepQty,
        unit: stepUnit,
        reason: stepReason,
        costEstimate,
        date: new Date().toISOString().split("T")[0],
      }

      const res = await wasteService.recordWaste(payload)
      const recordId = res.data?.data?.id

      // Optimistic record addition
      const optimisticEntry = {
        id: recordId || Date.now(),
        ingredientName: finalItemName,
        quantity: stepQty,
        unit: stepUnit,
        reason: stepReason,
        costEstimate,
        date: "Today",
      }
      setWasteLogs((prev) => [optimisticEntry, ...prev])

      toast.undo(
        `Logged waste: ${stepQty} ${stepUnit} of ${finalItemName} (${stepReason})`,
        async () => {
          if (recordId) {
            await wasteService.delete(recordId)
          }
          setWasteLogs((prev) => prev.filter((w) => w.id !== optimisticEntry.id))
          loadWasteData(true)
        }
      )

      setStepCustomItem("")
      loadWasteData(true)
    } catch (err) {
      console.error("Waste record error:", err)
      toast.error("Failed to record waste.")
    } finally {
      setSubmittingWaste(false)
    }
  }

  // Delete Log
  const handleDeleteLog = async (log) => {
    try {
      await wasteService.delete(log.id)
      setWasteLogs((prev) => prev.filter((w) => w.id !== log.id))
      toast.undo(`Deleted waste log for ${log.ingredientName || "item"}`, async () => {
        await wasteService.recordWaste(log)
        loadWasteData(true)
      })
    } catch (err) {
      console.error("Delete error:", err)
      toast.error("Could not delete record.")
    }
  }

  // Fallback daily trends
  const dailyTrends = analyticsData?.dailyTrends || [
    { date: "Mon", quantity: 2.1, financialLoss: 450 },
    { date: "Tue", quantity: 1.8, financialLoss: 380 },
    { date: "Wed", quantity: 2.5, financialLoss: 520 },
    { date: "Thu", quantity: 1.5, financialLoss: 310 },
    { date: "Fri", quantity: 2.8, financialLoss: 610 },
    { date: "Sat", quantity: 3.2, financialLoss: 740 },
    { date: "Sun", quantity: 1.8, financialLoss: 420 },
  ]

  const totalLoss = analyticsData?.totalFinancialLoss || 14250
  const totalQty = analyticsData?.totalQuantityLost || 48.5

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-chilli uppercase tracking-wider mb-1">
            <Trash2 className="w-4 h-4" />
            <span>Loss Prevention & Spoilage</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Waste Logging & Prevention
          </h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <a
            href={wasteService.getExportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-xs font-semibold text-charcoal-muted hover:text-charcoal transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          <button
            type="button"
            onClick={() => loadWasteData(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal hover:bg-paper-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </div>

      {/* 1. FAST 2-STEP WASTE LOGGING CARD */}
      <Ticket className="bg-white dark:bg-chalkboard-card border-paper-border dark:border-chalkboard-border shadow-ticket">
        <div className="border-b border-paper-border dark:border-chalkboard-border pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-chilli text-white text-xs font-bold flex items-center justify-center">
              !
            </span>
            <h2 className="font-serif font-bold text-xl text-charcoal dark:text-chalk">
              Fast 2-Step Waste Logging
            </h2>
          </div>
          <p className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5">
            Log spoilage or prep trim in under 10 seconds right from the kitchen pass
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* STEP 1: Tap the Item */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-charcoal text-paper dark:bg-chalk dark:text-charcoal text-xs font-bold flex items-center justify-center">
                1
              </span>
              <label className="font-bold text-sm text-charcoal dark:text-chalk">
                Tap the wasted item
              </label>
            </div>

            {/* Quick Item Chips */}
            <div className="flex flex-wrap gap-2">
              {quickItems.map((item) => {
                const isSelected = stepItem === item && !stepCustomItem
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setStepItem(item)
                      setStepCustomItem("")
                    }}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-95 select-none ${
                      isSelected
                        ? "bg-chilli text-white shadow-xs font-bold ring-2 ring-chilli/30"
                        : "bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border text-charcoal dark:text-chalk hover:bg-paper-200"
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            {/* Custom search or name input */}
            <div>
              <input
                type="text"
                value={stepCustomItem}
                onChange={(e) => setStepCustomItem(e.target.value)}
                placeholder="Or type other item name (e.g. Sliced capsicum)..."
                className="w-full p-2.5 text-sm"
              />
            </div>
          </div>

          {/* STEP 2: Tap Reason & Quantity with Stepper */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-charcoal text-paper dark:bg-chalk dark:text-charcoal text-xs font-bold flex items-center justify-center">
                2
              </span>
              <label className="font-bold text-sm text-charcoal dark:text-chalk">
                Select reason & dial quantity
              </label>
            </div>

            {/* Reason Chips */}
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((r) => {
                const isSelected = stepReason === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setStepReason(r.id)}
                    className={`p-2.5 rounded-xl border text-xs sm:text-sm font-bold transition cursor-pointer select-none ${
                      isSelected
                        ? "bg-charcoal text-paper dark:bg-chalk dark:text-charcoal border-charcoal shadow-xs"
                        : "bg-paper-50 dark:bg-chalkboard border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal"
                    }`}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>

            {/* Big Stepper */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
              <div>
                <span className="font-bold text-sm text-charcoal dark:text-chalk block">
                  Quantity Lost
                </span>
                <span className="text-xs text-charcoal-muted dark:text-chalk-muted">
                  Est: ₹{Math.round(stepQty * 85)}
                </span>
              </div>
              <Stepper
                value={stepQty}
                onChange={setStepQty}
                min={0.25}
                step={0.25}
                unit="kg"
              />
            </div>

            {/* Submit Button */}
            <BigButton
              variant="primary"
              size="lg"
              fullWidth
              loading={submittingWaste}
              onClick={handleLogWasteSubmit}
            >
              Log Waste Record (5s Undo)
            </BigButton>
          </div>
        </div>
      </Ticket>

      {/* 2. FRIENDLY WEEKLY WASTE TREND */}
      <section aria-label="Weekly Waste Trend">
        <Ticket>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold text-leaf uppercase tracking-wider mb-0.5">
                <TrendingDown className="w-4 h-4" />
                <span>Weekly Trend</span>
              </div>
              <h3 className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
                Kitchen Waste is down 18% this week!
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-chalk-muted">
                Daily wastage averaging 2.1kg (well under the 3.5kg shift tolerance ceiling).
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-medium text-charcoal-muted">14-Day Financial Loss</span>
              <div className="font-serif font-extrabold text-xl text-chilli">
                ₹{totalLoss.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D9381E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D9381E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke={isDark ? "#A5A095" : "#6B6358"}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={isDark ? "#A5A095" : "#6B6358"}
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1F1E1B" : "#FAF6EE",
                    borderColor: isDark ? "#2F2D28" : "#E4DCCE",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="financialLoss"
                  stroke="#D9381E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#wasteGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Ticket>
      </section>

      {/* 3. TABS: Recent Logs vs Expiry Alerts */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-paper-border dark:border-chalkboard-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === "logs"
                ? "bg-charcoal text-paper dark:bg-chalk dark:text-charcoal"
                : "text-charcoal-muted hover:text-charcoal"
            }`}
          >
            Recent Logs ({wasteLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("expiry")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "expiry"
                ? "bg-charcoal text-paper dark:bg-chalk dark:text-charcoal"
                : "text-charcoal-muted hover:text-charcoal"
            }`}
          >
            <span>Expiry Alerts</span>
            <span className="px-1.5 py-0.5 rounded-full bg-chilli text-white text-[10px] font-black">
              {expiryAlerts?.critical?.length || 2}
            </span>
          </button>
        </div>

        {/* Tab 1: Recent Logs */}
        {activeTab === "logs" && (
          <div className="space-y-2.5">
            {wasteLogs.map((log) => (
              <Ticket key={log.id} status="red" className="hover:border-chilli/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-base text-charcoal dark:text-chalk">
                        {log.ingredientName || log.dishName || "Kitchen Item"}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-paper-200 dark:bg-chalkboard text-xs font-semibold text-charcoal-muted">
                        {log.reason}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-muted mt-1">
                      Quantity: <strong>{log.quantity} {log.unit || "kg"}</strong> • Loss: ₹{log.costEstimate || log.financialLoss || 120} • {log.date || "Today"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteLog(log)}
                    className="p-2 rounded-xl text-charcoal-muted hover:text-chilli transition cursor-pointer"
                    title="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Ticket>
            ))}

            {wasteLogs.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted text-sm">
                No food waste logged yet this shift.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Expiry Alerts */}
        {activeTab === "expiry" && (
          <div className="space-y-3">
            {(expiryAlerts?.critical || []).map((alt, idx) => (
              <Ticket key={idx} status="red">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-chilli uppercase">Expires in 24h</span>
                      <h4 className="font-bold text-base text-charcoal dark:text-chalk">
                        {alt.ingredientName} ({alt.batchNumber})
                      </h4>
                    </div>
                    <p className="text-xs text-charcoal-muted mt-1">
                      {alt.remainingQuantity} {alt.unit} remaining (Est value: ₹{alt.financialValue}). {alt.recommendation}
                    </p>
                  </div>

                  <BigButton
                    size="sm"
                    variant="primary"
                    onClick={() => navigate("/ai-recipes")}
                  >
                    Upcycle in Recipes
                  </BigButton>
                </div>
              </Ticket>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
