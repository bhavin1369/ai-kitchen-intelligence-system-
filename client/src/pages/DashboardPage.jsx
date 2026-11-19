import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  Boxes,
  Receipt,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  Square,
  TrendingUp,
  RefreshCw,
  ChefHat,
  ArrowRight,
  Flame,
  Plus,
  ShieldAlert,
  Utensils
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from "recharts"

import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { StatNumber } from "../components/ui/StatNumber"
import { BigButton } from "../components/ui/BigButton"
import { ProgressRing } from "../components/ui/ProgressRing"
import { Stepper } from "../components/ui/Stepper"
import { BottomSheet } from "../components/ui/BottomSheet"
import { FilterChip } from "../components/ui/FilterChip"

import {
  reportsService,
  salesService,
  menuService,
  inventoryService,
  forecastService,
  wasteService,
  actionPlanService
} from "../services/api"

import {
  dashboardSummary as fallbackSummary,
  hourlySalesTrend as fallbackHourly,
  demandComparison as fallbackDemand,
  inventoryItems as fallbackInventory,
  inventoryBatches as fallbackBatches,
  menuCatalog as fallbackMenu
} from "../data/mockData"

export const DashboardPage = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // Data
  const [stats, setStats] = useState(fallbackSummary)
  const [hourlySales, setHourlySales] = useState(fallbackHourly)
  const [demandComp, setDemandComp] = useState(fallbackDemand)
  const [lowStockItems, setLowStockItems] = useState([])
  const [nearExpiryList, setNearExpiryList] = useState([])
  const [menuItems, setMenuItems] = useState([])

  // Daily Action Plan / Today's Prep Tasks
  const [selectedStation, setSelectedStation] = useState("all")
  const [prepTasks, setPrepTasks] = useState([
    {
      taskId: "task-1",
      station: "Curry Station",
      dishName: "Makhani Gravy Base",
      portions: 45,
      unit: "litres",
      assignedTo: "Chef Vikram",
      completed: true,
      timeEst: "40 min",
    },
    {
      taskId: "task-2",
      station: "Curry Station",
      dishName: "Onion-Tomato Masala",
      portions: 30,
      unit: "kg",
      assignedTo: "Chef Vikram",
      completed: true,
      timeEst: "35 min",
    },
    {
      taskId: "task-3",
      station: "Tandoor & Grill",
      dishName: "Paneer Tikka Marinade",
      portions: 60,
      unit: "skewers",
      assignedTo: "Chef Ramesh",
      completed: false,
      timeEst: "25 min",
    },
    {
      taskId: "task-4",
      station: "Tandoor & Grill",
      dishName: "Tandoori Roti Dough Batch",
      portions: 120,
      unit: "portions",
      assignedTo: "Chef Ramesh",
      completed: false,
      timeEst: "30 min",
    },
    {
      taskId: "task-5",
      station: "Cold Prep & Veg",
      dishName: "Sliced Red Onions & Herbs",
      portions: 25,
      unit: "kg",
      assignedTo: "Kitchen Commis",
      completed: true,
      timeEst: "20 min",
    },
    {
      taskId: "task-6",
      station: "Cold Prep & Veg",
      dishName: "Mint & Coriander Chutney",
      portions: 8,
      unit: "litres",
      assignedTo: "Kitchen Commis",
      completed: false,
      timeEst: "15 min",
    },
    {
      taskId: "task-7",
      station: "Rice & Biryani",
      dishName: "Dum Biryani Basmati Parboil",
      portions: 75,
      unit: "portions",
      assignedTo: "Senior Chef",
      completed: false,
      timeEst: "45 min",
    },
  ])

  // Modals
  const [quickSaleOpen, setQuickSaleOpen] = useState(false)
  const [quickWasteOpen, setQuickWasteOpen] = useState(false)
  const [selectedDishForSale, setSelectedDishForSale] = useState(null)
  const [salePortions, setSalePortions] = useState(1)
  const [wasteItemName, setWasteItemName] = useState("")
  const [wasteQty, setWasteQty] = useState(1)
  const [wasteReason, setWasteReason] = useState("Spoilage")

  // Load Dashboard + Plan data
  const loadPassData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const todayStr = new Date().toISOString().split("T")[0]

      const [dashRes, ingRes, batchRes, menuRes, planRes] = await Promise.allSettled([
        reportsService.getDashboard(),
        inventoryService.getIngredients({ limit: 100 }),
        inventoryService.getBatches({ status: "active", limit: 50 }),
        menuService.getAll(),
        actionPlanService.getPlan({ date: todayStr }),
      ])

      if (dashRes.status === "fulfilled" && dashRes.value.data?.success) {
        const d = dashRes.value.data.data || {}
        setStats((prev) => ({ ...prev, ...d }))
        if (d.hourlySalesTrend?.length) setHourlySales(d.hourlySalesTrend)
        if (d.demandComparison?.length) setDemandComp(d.demandComparison)
      }

      if (ingRes.status === "fulfilled" && ingRes.value.data?.success) {
        const allIngs = ingRes.value.data.data || []
        const low = allIngs.filter(
          (i) => i.currentStock <= i.reorderPoint || (i.status && i.status.toLowerCase().includes("low"))
        ).slice(0, 3)
        setLowStockItems(low.length ? low : fallbackInventory.slice(0, 2))
      }

      if (batchRes.status === "fulfilled" && batchRes.value.data?.success) {
        const allBatches = batchRes.value.data.data || []
        const near = allBatches.filter((b) => b.urgency === "critical" || b.daysLeft <= 2).slice(0, 3)
        setNearExpiryList(near.length ? near : fallbackBatches.slice(0, 2))
      }

      if (menuRes.status === "fulfilled" && menuRes.value.data?.success) {
        const items = menuRes.value.data.data || []
        setMenuItems(items.length ? items : fallbackMenu)
        if (items.length && !selectedDishForSale) {
          setSelectedDishForSale(items[0])
        }
      }

      if (planRes.status === "fulfilled" && planRes.value.data?.data?.prepTasks?.length) {
        setPrepTasks(planRes.value.data.data.prepTasks)
      }
    } catch (err) {
      console.error("Pass data load error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadPassData()
  }, [])

  // Greeting helper
  const getGreeting = () => {
    const hr = new Date().getHours()
    if (hr < 12) return "Good morning"
    if (hr < 16) return "Good afternoon"
    return "Good evening"
  }

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  // Toggle prep task
  const toggleTask = (taskId) => {
    setPrepTasks((prev) =>
      prev.map((t) => {
        if (t.taskId === taskId) {
          const next = !t.completed
          if (next) {
            toast.undo(`Marked "${t.dishName || t.taskName}" as prep complete`, () => {
              setPrepTasks((current) =>
                current.map((curr) => (curr.taskId === taskId ? { ...curr, completed: false } : curr))
              )
            })
          }
          return { ...t, completed: next }
        }
        return t
      })
    )
  }

  // Prep stats
  const completedCount = prepTasks.filter((t) => t.completed).length
  const totalCount = prepTasks.length

  const stations = ["all", ...new Set(prepTasks.map((t) => t.station || "General Prep"))]

  const filteredTasks = prepTasks.filter((t) => {
    if (selectedStation === "all") return true
    return (t.station || "General Prep") === selectedStation
  })

  // Quick Sale submission
  const handleRecordSale = async () => {
    if (!selectedDishForSale) return
    try {
      await salesService.create({
        menuItemId: selectedDishForSale.id,
        quantity: salePortions,
        channel: "Dine-in",
        tableNumber: "Pass Quick Sale",
        customerName: "Walk-in Guest",
        paymentMethod: "UPI",
        totalAmount: (selectedDishForSale.price || 250) * salePortions,
      })
      toast.success(`Logged sale: ${salePortions}x ${selectedDishForSale.name}`)
      setQuickSaleOpen(false)
      setSalePortions(1)
      loadPassData(true)
    } catch (err) {
      console.error("Quick sale failed:", err)
      toast.error("Could not record sale. Please try again.")
    }
  }

  // Quick Waste submission
  const handleRecordWaste = async () => {
    if (!wasteItemName) return
    try {
      await wasteService.recordWaste({
        ingredientName: wasteItemName,
        quantity: wasteQty,
        unit: "kg",
        reason: wasteReason,
        costEstimate: wasteQty * 85,
      })
      toast.success(`Recorded waste: ${wasteQty}kg ${wasteItemName}`)
      setQuickWasteOpen(false)
      setWasteItemName("")
      setWasteQty(1)
      loadPassData(true)
    } catch (err) {
      console.error("Quick waste failed:", err)
      toast.error("Could not record waste.")
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* 1. TOP RAIL: Greeting + Kitchen Name + Event Chip */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-charcoal-muted dark:text-chalk-muted uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-leaf inline-block animate-ping" />
            <span>SpiceCraft Kitchen</span>
            <span>•</span>
            <span>The Pass Live Station</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-charcoal dark:text-chalk tracking-tight">
            {getGreeting()}, {user?.fullName ? user.fullName.split(" ")[0] : "Chef"}
          </h1>
          <p className="text-sm sm:text-base text-charcoal-muted dark:text-chalk-muted mt-1 font-medium">
            {todayFormatted}
          </p>
        </div>

        {/* Festival / Event Chip if active */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-turmeric-light dark:bg-turmeric-darkLight border border-turmeric/40 text-charcoal dark:text-turmeric text-xs sm:text-sm font-bold shadow-xs">
            <Flame className="w-4 h-4 text-turmeric shrink-0 fill-turmeric/20" />
            <span>Diwali Weekend Prep</span>
            <span className="px-1.5 py-0.5 rounded bg-turmeric text-charcoal font-black text-[10px]">
              +35% DEMAND
            </span>
          </div>

          <button
            type="button"
            onClick={() => loadPassData(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted dark:text-chalk-muted hover:text-charcoal hover:bg-paper-200 transition cursor-pointer"
            title="Refresh The Pass"
            aria-label="Refresh Pass"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </section>

      {/* 2. THREE BIG NUMBERS ONLY: Sales Today, Waste Today, Money Saved This Week */}
      <section aria-label="Key Performance Numbers">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatNumber
            label="Sales Today"
            prefix="₹"
            value={stats.salesToday?.toLocaleString() || "48,500"}
            delta="+18%"
            deltaType="good"
            subtext="On pace for busy dinner service"
            accent="leaf"
          />
          <StatNumber
            label="Waste Logged Today"
            value="1.8"
            suffix="kg"
            delta="-32%"
            deltaType="good"
            subtext="Down from 2.6kg daily target"
            accent="chilli"
          />
          <StatNumber
            label="Money Saved This Week"
            prefix="₹"
            value="14,250"
            delta="Saved"
            deltaType="good"
            subtext="Via AI portioning & leftover upcycling"
            accent="turmeric"
          />
        </div>
      </section>

      {/* 3. "NEEDS ATTENTION" STRIP: Max 3 items only with ONE clear action button */}
      <section aria-label="Needs Attention Strip" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-xl text-charcoal dark:text-chalk flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-chilli" />
            <span>Needs Attention Right Now</span>
          </h2>
          <span className="text-xs font-semibold text-charcoal-muted dark:text-chalk-muted uppercase tracking-wider">
            3 Critical Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Expiring Soon */}
          <Ticket status="red" className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-chilli uppercase tracking-wider">
                  Use Today
                </span>
                <span className="text-[11px] font-medium text-charcoal-muted dark:text-chalk-muted">
                  Expires in 4 hrs
                </span>
              </div>
              <h3 className="font-bold text-base text-charcoal dark:text-chalk">
                Fresh Paneer (Batch #P-104)
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1">
                4.5 kg remaining in walk-in cooler. Prioritize in today's lunch rush.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-paper-border dark:border-chalkboard-border">
              <BigButton
                size="sm"
                variant="primary"
                fullWidth
                onClick={() => {
                  setQuickSaleOpen(true)
                  const paneerDish = menuItems.find((m) => m.name.toLowerCase().includes("paneer"))
                  if (paneerDish) setSelectedDishForSale(paneerDish)
                }}
              >
                Sell in Special
              </BigButton>
            </div>
          </Ticket>

          {/* Card 2: Running Low */}
          <Ticket status="yellow" className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-turmeric uppercase tracking-wider">
                  Running Low
                </span>
                <span className="text-[11px] font-medium text-charcoal-muted dark:text-chalk-muted">
                  Below Par
                </span>
              </div>
              <h3 className="font-bold text-base text-charcoal dark:text-chalk">
                Red Onions (Nashik Medium)
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1">
                Only 8 kg in store. Par is 25 kg. Weekend prep requires full sack.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-paper-border dark:border-chalkboard-border">
              <BigButton
                size="sm"
                variant="warning"
                fullWidth
                onClick={() => navigate("/purchase-planner")}
              >
                Add to Reorder List
              </BigButton>
            </div>
          </Ticket>

          {/* Card 3: High Waste Risk */}
          <Ticket status="yellow" className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-turmeric uppercase tracking-wider">
                  Surplus Risk
                </span>
                <span className="text-[11px] font-medium text-charcoal-muted dark:text-chalk-muted">
                  Upcycle Match
                </span>
              </div>
              <h3 className="font-bold text-base text-charcoal dark:text-chalk">
                Cooked Basmati Rice
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1">
                3.2 kg leftover from yesterday. Can upcycle into Rice Kheer or Tawa Pulao.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-paper-border dark:border-chalkboard-border">
              <BigButton
                size="sm"
                variant="secondary"
                fullWidth
                onClick={() => navigate("/ai-recipes")}
              >
                View Upcycle Recipe
              </BigButton>
            </div>
          </Ticket>
        </div>
      </section>

      {/* 4. EXPECTED DEMAND: Simple Forecast Bar showing tomorrow's predicted covers */}
      <section aria-label="Expected Covers Forecast">
        <Ticket className="bg-gradient-to-r from-white via-paper-50 to-white dark:from-chalkboard-card dark:via-chalkboard dark:to-chalkboard-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-leaf uppercase tracking-wider mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>AI Demand Forecast</span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal dark:text-chalk">
                Expect about 245 plates tomorrow
              </h2>
              <p className="text-sm text-charcoal-muted dark:text-chalk-muted mt-1">
                Busier than a typical Friday due to Diwali season reservations and cooler evening temperatures.
              </p>
            </div>

            {/* Visual Cover Range Band */}
            <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border min-w-[240px]">
              <div className="flex justify-between text-xs text-charcoal-muted dark:text-chalk-muted font-medium mb-1">
                <span>Confidence Band</span>
                <span className="font-bold text-charcoal dark:text-chalk">220 – 270 plates</span>
              </div>
              <div className="w-full h-3 bg-paper-200 dark:bg-chalkboard-border rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 bg-leaf/40 rounded-full"
                  style={{ left: "20%", right: "15%" }}
                />
                <div
                  className="absolute top-0 bottom-0 w-2.5 bg-chilli rounded-full -ml-1"
                  style={{ left: "55%" }}
                  title="Model median: 245 plates"
                />
              </div>
              <div className="flex justify-between text-[11px] text-charcoal-muted dark:text-chalk-muted mt-1">
                <span>Quiet (180)</span>
                <span className="font-bold text-chilli">Predicted: 245</span>
                <span>Peak (300)</span>
              </div>
            </div>
          </div>
        </Ticket>
      </section>

      {/* 5. TODAY'S PREP LIST: Daily Action Plan as big tick-off tasks grouped by station */}
      <section aria-label="Today's Prep List" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-4">
            <ProgressRing completed={completedCount} total={totalCount} size={64} />
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-charcoal dark:text-chalk">
                Today's Prep List
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-muted dark:text-chalk-muted">
                {completedCount} of {totalCount} tasks completed for today's service
              </p>
            </div>
          </div>

          {/* Station Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {stations.map((st) => (
              <FilterChip
                key={st}
                label={st === "all" ? "All Stations" : st}
                active={selectedStation === st}
                onClick={() => setSelectedStation(st)}
              />
            ))}
          </div>
        </div>

        {/* Task Cards Grid */}
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isDone = task.completed
            return (
              <div
                key={task.taskId}
                onClick={() => toggleTask(task.taskId)}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.99] ${
                  isDone
                    ? "bg-paper-100/60 dark:bg-chalkboard/60 border-paper-border/80 dark:border-chalkboard-border opacity-75 line-through-text"
                    : "bg-white dark:bg-chalkboard-card border-paper-border dark:border-chalkboard-border shadow-ticket hover:border-chilli/40"
                }`}
              >
                <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
                  {/* Oversized Checkbox Target */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTask(task.taskId)
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      isDone
                        ? "bg-leaf text-white"
                        : "bg-paper-100 dark:bg-chalkboard border-2 border-paper-border dark:border-chalkboard-border text-transparent hover:border-chilli"
                    }`}
                    aria-label={`Mark ${task.dishName || task.taskName} complete`}
                  >
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-base sm:text-lg text-charcoal dark:text-chalk truncate">
                        {task.dishName || task.taskName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-paper-200 dark:bg-chalkboard text-xs font-semibold text-charcoal-muted dark:text-chalk-muted">
                        {task.station || "Kitchen"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs sm:text-sm text-charcoal-muted dark:text-chalk-muted mt-0.5">
                      <span className="font-semibold text-charcoal dark:text-chalk">
                        Target: {task.portions || task.targetPortions} {task.unit || "portions"}
                      </span>
                      <span>•</span>
                      <span>Est: {task.timeEst || "25 min"}</span>
                      {task.assignedTo && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{task.assignedTo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      isDone
                        ? "bg-leaf-light dark:bg-leaf-darkLight text-leaf"
                        : "bg-paper-200 dark:bg-chalkboard text-charcoal-muted dark:text-chalk-muted"
                    }`}
                  >
                    {isDone ? "Done" : "Tap to complete"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. "SEE MORE" COLLAPSIBLE: Everything else is hidden so the live pass stays clean */}
      <section className="pt-2">
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border hover:bg-paper-200 dark:hover:bg-chalkboard-border transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 font-serif font-bold text-base text-charcoal dark:text-chalk">
            <span>Operational Trends & Charts</span>
            <span className="text-xs font-sans font-normal text-charcoal-muted dark:text-chalk-muted">
              (Hourly rush, category splits, activity log)
            </span>
          </div>
          <div className="flex items-center space-x-1 text-xs font-bold text-chilli">
            <span>{showMore ? "Collapse" : "See more"}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                showMore ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {showMore && (
          <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket space-y-6 animate-in fade-in duration-200">
            {/* Hourly sales rush curve */}
            <div>
              <h3 className="font-serif font-bold text-base text-charcoal dark:text-chalk mb-3">
                Today's Hourly Covers & Sales Rush
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="passSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D9381E" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D9381E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
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
                      dataKey="sales"
                      stroke="#D9381E"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#passSalesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick links to deep reports */}
            <div className="pt-4 border-t border-paper-border dark:border-chalkboard-border flex flex-wrap gap-3">
              <Link
                to="/sales"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-chilli hover:underline"
              >
                <span>Go to Full POS Pad</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-charcoal-muted dark:text-chalk-muted">•</span>
              <Link
                to="/inventory"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-chilli hover:underline"
              >
                <span>Inspect All 100+ Ingredients</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-charcoal-muted dark:text-chalk-muted">•</span>
              <Link
                to="/daily-plan"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-chilli hover:underline"
              >
                <span>Edit Full Chef Plan Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* QUICK SALE BOTTOM SHEET */}
      <BottomSheet
        isOpen={quickSaleOpen}
        onClose={() => setQuickSaleOpen(false)}
        title="Quick Record Sale"
        subtitle="Log dish portions directly from the pass"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted dark:text-chalk-muted mb-2">
              Select Dish
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {menuItems.map((dish) => {
                const isSelected = selectedDishForSale?.id === dish.id
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => setSelectedDishForSale(dish)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer select-none ${
                      isSelected
                        ? "bg-chilli text-white border-chilli font-bold"
                        : "bg-white dark:bg-chalkboard border-paper-border dark:border-chalkboard-border text-charcoal dark:text-chalk"
                    }`}
                  >
                    <div className="text-sm truncate">{dish.name}</div>
                    <div className="text-xs opacity-80">₹{dish.price || 220}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
            <span className="font-bold text-sm text-charcoal dark:text-chalk">Portions</span>
            <Stepper value={salePortions} onChange={setSalePortions} min={1} max={50} />
          </div>

          <div className="flex items-center justify-between font-serif font-bold text-lg pt-2 border-t border-paper-border dark:border-chalkboard-border">
            <span>Total Amount</span>
            <span className="text-chilli">
              ₹{((selectedDishForSale?.price || 220) * salePortions).toLocaleString()}
            </span>
          </div>

          <BigButton variant="primary" fullWidth size="lg" onClick={handleRecordSale}>
            Confirm & Log Sale
          </BigButton>
        </div>
      </BottomSheet>

      {/* QUICK WASTE BOTTOM SHEET */}
      <BottomSheet
        isOpen={quickWasteOpen}
        onClose={() => setQuickWasteOpen(false)}
        title="Log Kitchen Waste"
        subtitle="2-step waste recording"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted dark:text-chalk-muted mb-1.5">
              Item or Ingredient Name
            </label>
            <input
              type="text"
              value={wasteItemName}
              onChange={(e) => setWasteItemName(e.target.value)}
              placeholder="e.g. Cooked Gravy, Sliced Tomatoes"
              className="w-full p-3 text-base"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
            <span className="font-bold text-sm text-charcoal dark:text-chalk">Quantity</span>
            <Stepper value={wasteQty} onChange={setWasteQty} min={0.25} step={0.25} unit="kg" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted dark:text-chalk-muted mb-2">
              Reason
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["Spoilage", "Expiry", "Overproduction", "Prep Trim"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setWasteReason(r)}
                  className={`p-2.5 rounded-xl border text-sm font-medium transition cursor-pointer ${
                    wasteReason === r
                      ? "bg-turmeric text-charcoal border-turmeric font-bold"
                      : "bg-white dark:bg-chalkboard border-paper-border dark:border-chalkboard-border text-charcoal dark:text-chalk"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <BigButton
            variant="primary"
            fullWidth
            size="lg"
            disabled={!wasteItemName.trim()}
            onClick={handleRecordWaste}
          >
            Save Waste Record
          </BigButton>
        </div>
      </BottomSheet>
    </div>
  )
}
