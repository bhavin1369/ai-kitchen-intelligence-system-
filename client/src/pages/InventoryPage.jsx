import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingDown,
  Layers,
  ArrowUpDown,
  X,
  History,
  ShoppingBag,
  Trash2,
  Check,
  ChevronRight
} from "lucide-react"

import { inventoryService, wasteService } from "../services/api"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { Stepper } from "../components/ui/Stepper"
import { FilterChip } from "../components/ui/FilterChip"
import { BottomSheet } from "../components/ui/BottomSheet"
import { StatNumber } from "../components/ui/StatNumber"

export const InventoryPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  // State
  const [items, setItems] = useState([])
  const [batches, setBatches] = useState([])
  const [movements, setMovements] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [urgencyFilter, setUrgencyFilter] = useState("all") // "all" | "today" | "week" | "fine"
  const [activeTab, setActiveTab] = useState("stock") // "stock" | "batches" | "movements"

  // Modals
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [selectedItemForAction, setSelectedItemForAction] = useState(null)

  // Receive Form
  const [formIngredientId, setFormIngredientId] = useState("")
  const [formBatchNumber, setFormBatchNumber] = useState("")
  const [formBatchQty, setFormBatchQty] = useState(10)
  const [formBatchCost, setFormBatchCost] = useState(50)
  const [formBatchExpiry, setFormBatchExpiry] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  )
  const [formSupplier, setFormSupplier] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Adjust Form
  const [adjustNewStock, setAdjustNewStock] = useState(0)

  // Load Inventory Data
  const loadInventoryData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const [ingRes, batchRes, movRes, dashRes] = await Promise.allSettled([
        inventoryService.getIngredients({ limit: 100 }),
        inventoryService.getBatches({ limit: 100 }),
        inventoryService.getMovements({ limit: 50 }),
        inventoryService.getDashboard(),
      ])

      if (ingRes.status === "fulfilled" && ingRes.value.data?.success) {
        setItems(ingRes.value.data.data || [])
      }
      if (batchRes.status === "fulfilled" && batchRes.value.data?.success) {
        setBatches(batchRes.value.data.data || [])
      }
      if (movRes.status === "fulfilled" && movRes.value.data?.success) {
        setMovements(movRes.value.data.data || [])
      }
      if (dashRes.status === "fulfilled" && dashRes.value.data?.success) {
        setDashboardMetrics(dashRes.value.data)
      }
    } catch (err) {
      console.error("Inventory load error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadInventoryData()
  }, [])

  // Calculate Urgency for each item based on near-expiry batches and current stock vs par
  const getItemUrgency = (item) => {
    const itemBatches = batches.filter((b) => b.ingredientId === item.id)
    const hasCriticalBatch = itemBatches.some(
      (b) => b.shelfLifeStatus === "critical" || (b.daysToExpiry !== undefined && b.daysToExpiry <= 1)
    )
    if (hasCriticalBatch || (item.daysLeft !== undefined && item.daysLeft <= 1)) {
      return "today" // Red
    }

    const hasWarningBatch = itemBatches.some(
      (b) => b.shelfLifeStatus === "warning" || (b.daysToExpiry !== undefined && b.daysToExpiry <= 4)
    )
    const isBelowPar = item.currentStock <= item.reorderPoint
    if (hasWarningBatch || isBelowPar || (item.daysLeft !== undefined && item.daysLeft <= 4)) {
      return "week" // Yellow
    }

    return "fine" // Green
  }

  // Fast Quick Action: USE STOCK (1kg/portion) with 5-second Undo
  const handleQuickUse = async (item) => {
    const useQty = Math.min(item.currentStock, 1)
    if (useQty <= 0) {
      toast.error(`${item.name} is out of stock!`)
      return
    }

    try {
      await inventoryService.consumeStock({
        ingredientId: item.id,
        quantity: useQty,
        reason: "kitchen_prep",
      })

      // Optimistic update
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, currentStock: Math.max(0, it.currentStock - useQty) } : it))
      )

      toast.undo(`Used ${useQty} ${item.unit || "kg"} ${item.name}`, async () => {
        await inventoryService.adjustStock({
          ingredientId: item.id,
          newStock: item.currentStock,
          notes: "Undo quick use",
        })
        loadInventoryData(true)
      })
    } catch (err) {
      console.error("Quick use failed:", err)
      toast.error("Could not record usage.")
    }
  }

  // Fast Quick Action: LOG WASTE with 5-second Undo
  const handleQuickWaste = async (item) => {
    const wasteQty = Math.min(item.currentStock, 0.5)
    try {
      await wasteService.recordWaste({
        ingredientName: item.name,
        quantity: wasteQty,
        unit: item.unit || "kg",
        reason: "Spoilage",
        costEstimate: wasteQty * (item.unitCost || 60),
      })

      toast.undo(`Logged ${wasteQty} ${item.unit || "kg"} ${item.name} as waste`, () => {
        // undo handler
      })
    } catch (err) {
      console.error("Quick waste error:", err)
    }
  }

  // Fast Quick Action: REORDER (jump to planner)
  const handleQuickReorder = (item) => {
    navigate(`/purchase-planner?item=${encodeURIComponent(item.name)}`)
  }

  // Open Receive Modal
  const handleOpenReceive = (prefill = null) => {
    const target = prefill || items[0]
    if (target) {
      setFormIngredientId(target.id)
      setFormBatchNumber(
        `${target.name.substring(0, 3).toUpperCase()}-${new Date().toISOString().slice(5, 10).replace("-", "")}-${Math.floor(10 + Math.random() * 90)}`
      )
      setFormBatchQty(10)
      setFormBatchCost(target.unitCost || 50)
      setFormSupplier(target.preferredSupplier || "Direct Vendor")
    }
    setShowReceiveModal(true)
  }

  // Submit Receive Batch
  const handleReceiveStock = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const target = items.find((i) => i.id === parseInt(formIngredientId, 10))

    try {
      await inventoryService.receiveBatch({
        ingredientId: parseInt(formIngredientId, 10),
        batchNumber: formBatchNumber,
        quantity: parseFloat(formBatchQty),
        unit: target?.unit || "kg",
        unitCost: parseFloat(formBatchCost),
        expiryDate: formBatchExpiry,
        supplierName: formSupplier,
      })

      toast.success(`Received ${formBatchQty} ${target?.unit || "kg"} of ${target?.name || "Stock"}`)
      setShowReceiveModal(false)
      loadInventoryData(true)
    } catch (err) {
      console.error("Receive error:", err)
      toast.error("Failed to receive stock batch.")
    } finally {
      setSubmitting(false)
    }
  }

  // Categories
  const categories = ["all", ...new Set(items.map((i) => i.category || "General").filter(Boolean))]

  // Urgency-ranked sorting: "use first" default
  const sortedItems = [...items].sort((a, b) => {
    const urgencyOrder = { today: 1, week: 2, fine: 3 }
    const urgA = urgencyOrder[getItemUrgency(a)] || 3
    const urgB = urgencyOrder[getItemUrgency(b)] || 3
    if (urgA !== urgB) return urgA - urgB
    return (a.currentStock / (a.parLevel || a.reorderPoint || 10)) - (b.currentStock / (b.parLevel || b.reorderPoint || 10))
  })

  // Filtered
  const filteredItems = sortedItems.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory
    const matchesSearch =
      !searchQuery.trim() ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.preferredSupplier?.toLowerCase().includes(searchQuery.toLowerCase())
    const urg = getItemUrgency(item)
    const matchesUrg = urgencyFilter === "all" || urg === urgencyFilter
    return matchesCat && matchesSearch && matchesUrg
  })

  // Summary counts
  const useTodayCount = items.filter((i) => getItemUrgency(i) === "today").length
  const useWeekCount = items.filter((i) => getItemUrgency(i) === "week").length
  const fineCount = items.filter((i) => getItemUrgency(i) === "fine").length

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-leaf uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4" />
            <span>Store & Walk-in Cooler</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Stock & Inventory
          </h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <BigButton
            variant="primary"
            size="default"
            icon={Plus}
            onClick={() => handleOpenReceive()}
          >
            Receive Batch
          </BigButton>
          <button
            type="button"
            onClick={() => loadInventoryData(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal hover:bg-paper-200 transition cursor-pointer"
            title="Refresh Stock"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </div>

      {/* Urgency Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setUrgencyFilter(urgencyFilter === "today" ? "all" : "today")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            urgencyFilter === "today"
              ? "bg-chilli-light dark:bg-chilli-darkLight border-chilli ring-2 ring-chilli/30"
              : "bg-white dark:bg-chalkboard-card border-paper-border dark:border-chalkboard-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-chilli tracking-wider">
              Use Today
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-chilli" />
          </div>
          <div className="font-serif font-extrabold text-2xl sm:text-3xl text-charcoal dark:text-chalk mt-1">
            {useTodayCount} items
          </div>
          <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5">
            Critical expiry or zero stock
          </div>
        </button>

        <button
          type="button"
          onClick={() => setUrgencyFilter(urgencyFilter === "week" ? "all" : "week")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            urgencyFilter === "week"
              ? "bg-turmeric-light dark:bg-turmeric-darkLight border-turmeric ring-2 ring-turmeric/30"
              : "bg-white dark:bg-chalkboard-card border-paper-border dark:border-chalkboard-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-turmeric tracking-wider">
              Use This Week
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-turmeric" />
          </div>
          <div className="font-serif font-extrabold text-2xl sm:text-3xl text-charcoal dark:text-chalk mt-1">
            {useWeekCount} items
          </div>
          <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5">
            Running low or 3–4 days left
          </div>
        </button>

        <button
          type="button"
          onClick={() => setUrgencyFilter(urgencyFilter === "fine" ? "all" : "fine")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            urgencyFilter === "fine"
              ? "bg-leaf-light dark:bg-leaf-darkLight border-leaf ring-2 ring-leaf/30"
              : "bg-white dark:bg-chalkboard-card border-paper-border dark:border-chalkboard-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-leaf tracking-wider">
              Healthy Stock
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-leaf" />
          </div>
          <div className="font-serif font-extrabold text-2xl sm:text-3xl text-charcoal dark:text-chalk mt-1">
            {fineCount} items
          </div>
          <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5">
            Above par level & fresh
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients by name or supplier..."
            className="w-full pl-10 pr-4 py-2.5 text-base"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              label={cat === "all" ? "All Categories" : cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* Urgency-Ranked Stock Rows (Default: "Use First") */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const urgency = getItemUrgency(item)
          const par = item.parLevel || item.reorderPoint || 10
          const fillRatio = Math.min(100, Math.round((item.currentStock / par) * 100))

          return (
            <Ticket
              key={item.id}
              status={urgency === "today" ? "red" : urgency === "week" ? "yellow" : "green"}
              className="hover:border-chilli/30"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg text-charcoal dark:text-chalk truncate">
                      {item.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-paper-200 dark:bg-chalkboard text-xs font-semibold text-charcoal-muted dark:text-chalk-muted">
                      {item.category || "Produce"}
                    </span>
                    {urgency === "today" && (
                      <span className="px-2 py-0.5 rounded-md bg-chilli text-white text-[10px] font-black uppercase">
                        Use Today
                      </span>
                    )}
                    {urgency === "week" && (
                      <span className="px-2 py-0.5 rounded-md bg-turmeric text-charcoal text-[10px] font-black uppercase">
                        Use This Week
                      </span>
                    )}
                  </div>

                  {/* Par-level fill bar */}
                  <div className="mt-2 max-w-md">
                    <div className="flex justify-between text-xs text-charcoal-muted dark:text-chalk-muted mb-1">
                      <span>
                        Current: <strong className="text-charcoal dark:text-chalk">{item.currentStock} {item.unit}</strong>
                      </span>
                      <span>Par: {par} {item.unit}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-paper-200 dark:bg-chalkboard-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          fillRatio <= 35
                            ? "bg-chilli"
                            : fillRatio <= 75
                            ? "bg-turmeric"
                            : "bg-leaf"
                        }`}
                        style={{ width: `${fillRatio}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-charcoal-muted dark:text-chalk-muted mt-1.5 flex items-center space-x-3">
                    <span>Supplier: {item.preferredSupplier || "Direct Vendor"}</span>
                    <span>•</span>
                    <span>Cost: ₹{item.unitCost || 45}/{item.unit}</span>
                  </div>
                </div>

                {/* Right Action Buttons: Use, Waste, Reorder */}
                <div className="flex items-center space-x-2 self-end lg:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickUse(item)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border text-xs font-bold text-charcoal dark:text-chalk hover:bg-paper-200 dark:hover:bg-chalkboard-border active:scale-95 transition cursor-pointer"
                    title="Log 1 portion used in prep"
                  >
                    Use (-1)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickWaste(item)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-chilli-light dark:bg-chilli-darkLight border border-chilli/30 text-xs font-bold text-chilli hover:bg-chilli hover:text-white active:scale-95 transition cursor-pointer"
                    title="Log spoilage or waste"
                  >
                    Waste
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickReorder(item)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-turmeric-light dark:bg-turmeric-darkLight border border-turmeric/40 text-xs font-bold text-charcoal hover:bg-turmeric active:scale-95 transition cursor-pointer"
                    title="Add to shopping list"
                  >
                    Reorder
                  </button>
                </div>
              </div>
            </Ticket>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted text-sm">
            No ingredients matched your filter.
          </div>
        )}
      </div>

      {/* RECEIVE BATCH BOTTOM SHEET */}
      <BottomSheet
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Receive Stock Batch"
        subtitle="Log incoming supplier delivery into inventory"
      >
        <form onSubmit={handleReceiveStock} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted dark:text-chalk-muted mb-1.5">
              Select Ingredient
            </label>
            <select
              value={formIngredientId}
              onChange={(e) => setFormIngredientId(e.target.value)}
              className="w-full p-3 text-base"
              required
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit}) - Currently: {i.currentStock}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted dark:text-chalk-muted mb-1.5">
                Batch Number
              </label>
              <input
                type="text"
                value={formBatchNumber}
                onChange={(e) => setFormBatchNumber(e.target.value)}
                className="w-full p-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted dark:text-chalk-muted mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={formBatchExpiry}
                onChange={(e) => setFormBatchExpiry(e.target.value)}
                className="w-full p-2.5 text-sm"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
            <span className="font-bold text-sm text-charcoal dark:text-chalk">Quantity Received</span>
            <Stepper
              value={formBatchQty}
              onChange={setFormBatchQty}
              min={1}
              step={1}
              unit="units"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted dark:text-chalk-muted mb-1.5">
              Supplier Name
            </label>
            <input
              type="text"
              value={formSupplier}
              onChange={(e) => setFormSupplier(e.target.value)}
              placeholder="e.g. Metro Wholesale, Dairy Direct"
              className="w-full p-2.5 text-sm"
            />
          </div>

          <BigButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
          >
            Confirm & Put in Stock
          </BigButton>
        </form>
      </BottomSheet>
    </div>
  )
}
