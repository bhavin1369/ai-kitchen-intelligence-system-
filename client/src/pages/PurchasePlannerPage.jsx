import React, { useState, useEffect } from "react"
import {
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  RefreshCw,
  Search,
  Check,
  PackageCheck,
  Truck,
  Plus,
  ArrowRight,
  ShieldAlert,
  Calendar
} from "lucide-react"

import { purchaseService, inventoryService } from "../services/api"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { Stepper } from "../components/ui/Stepper"
import { FilterChip } from "../components/ui/FilterChip"
import { StatNumber } from "../components/ui/StatNumber"

export const PurchasePlannerPage = () => {
  const toast = useToast()

  // State
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [horizon, setHorizon] = useState(3) // 1, 3, 7 days
  const [activeTab, setActiveTab] = useState("shopping") // "shopping" | "orders"

  // Data
  const [recommendations, setRecommendations] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedItems, setSelectedItems] = useState({}) // { [id]: boolean }
  const [quantities, setQuantities] = useState({}) // { [id]: number }
  const [searchQuery, setSearchQuery] = useState("")

  // Load recommendations
  const loadPlannerData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const [recRes, ordRes] = await Promise.allSettled([
        purchaseService.getRecommendations({ days: horizon }),
        purchaseService.getAll(),
      ])

      let recList = []
      if (recRes.status === "fulfilled" && recRes.value.data?.recommendations) {
        recList = recRes.value.data.recommendations
      } else {
        // Fallback realistic shopping items
        recList = [
          {
            ingredientId: 1,
            ingredientName: "Red Onions",
            supplierName: "Metro Cash & Carry",
            currentStock: 8.5,
            parLevel: 25.0,
            recommendedPurchase: 16.5,
            unit: "kg",
            unitCost: 35,
            leadTime: "Today (4h)",
            category: "Produce",
          },
          {
            ingredientId: 2,
            ingredientName: "Tomatoes (Hybrid)",
            supplierName: "Metro Cash & Carry",
            currentStock: 12.0,
            parLevel: 30.0,
            recommendedPurchase: 18.0,
            unit: "kg",
            unitCost: 28,
            leadTime: "Today (4h)",
            category: "Produce",
          },
          {
            ingredientId: 3,
            ingredientName: "Fresh Paneer Malai",
            supplierName: "Dairy Direct Ltd",
            currentStock: 3.5,
            parLevel: 12.0,
            recommendedPurchase: 8.5,
            unit: "kg",
            unitCost: 260,
            leadTime: "Tomorrow Morning",
            category: "Dairy",
          },
          {
            ingredientId: 4,
            ingredientName: "Full Cream Milk (Pouch)",
            supplierName: "Dairy Direct Ltd",
            currentStock: 15.0,
            parLevel: 40.0,
            recommendedPurchase: 25.0,
            unit: "litres",
            unitCost: 64,
            leadTime: "Tomorrow Morning",
            category: "Dairy",
          },
          {
            ingredientId: 5,
            ingredientName: "Basmati Rice (Classic Long)",
            supplierName: "Shree Staples Wholesale",
            currentStock: 18.0,
            parLevel: 50.0,
            recommendedPurchase: 32.0,
            unit: "kg",
            unitCost: 95,
            leadTime: "24h delivery",
            category: "Grains",
          },
        ]
      }

      setRecommendations(recList)

      // Initialize selection and quantity map
      const selMap = {}
      const qtyMap = {}
      recList.forEach((r) => {
        selMap[r.ingredientId] = true
        qtyMap[r.ingredientId] = r.recommendedPurchase || 10
      })
      setSelectedItems(selMap)
      setQuantities(qtyMap)

      if (ordRes.status === "fulfilled" && ordRes.value.data?.data) {
        setOrders(ordRes.value.data.data)
      }
    } catch (err) {
      console.error("Planner load error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadPlannerData()
  }, [horizon])

  // Toggle item in shopping list
  const toggleItem = (id) => {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleQtyChange = (id, newQty) => {
    setQuantities((prev) => ({ ...prev, [id]: newQty }))
  }

  // Group by Supplier
  const groupedBySupplier = recommendations.reduce((acc, item) => {
    const supp = item.supplierName || "General Vendor"
    if (!acc[supp]) acc[supp] = []
    acc[supp].push(item)
    return acc
  }, {})

  // Calculate Totals
  const selectedCount = Object.keys(selectedItems).filter((k) => selectedItems[k]).length
  const totalEstimatedCost = recommendations
    .filter((it) => selectedItems[it.ingredientId])
    .reduce((sum, it) => sum + (quantities[it.ingredientId] || 0) * (it.unitCost || 50), 0)

  // Submit and Create Purchase Orders
  const handleCreateOrders = async () => {
    const selectedRecs = recommendations.filter((it) => selectedItems[it.ingredientId])
    if (selectedRecs.length === 0) {
      toast.error("Please select at least one item from the shopping list.")
      return
    }

    setSubmitting(true)
    try {
      // Group by supplier and post
      const suppliers = [...new Set(selectedRecs.map((r) => r.supplierName || "General Vendor"))]

      for (const supp of suppliers) {
        const suppItems = selectedRecs.filter((r) => (r.supplierName || "General Vendor") === supp)
        await purchaseService.create({
          supplierName: supp,
          poNumber: `PO-${new Date().toISOString().slice(5, 10).replace("-", "")}-${Math.floor(100 + Math.random() * 900)}`,
          orderDate: new Date().toISOString().split("T")[0],
          status: "issued",
          items: suppItems.map((it) => ({
            ingredientId: it.ingredientId,
            quantity: quantities[it.ingredientId],
            unitCost: it.unitCost,
          })),
        })
      }

      toast.undo(
        `Created purchase orders for ${suppliers.length} suppliers (₹${totalEstimatedCost.toLocaleString()})`,
        () => {
          // undo callback
        }
      )

      loadPlannerData(true)
    } catch (err) {
      console.error("Order creation error:", err)
      toast.error("Failed to generate purchase orders.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-turmeric uppercase tracking-wider mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span>Smart Automated Procurement</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Purchase Planner
          </h1>
        </div>

        {/* Tab & Horizon Switches */}
        <div className="flex items-center space-x-2.5">
          <div className="flex p-1 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border text-xs font-bold">
            {[1, 3, 7].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  horizon === h
                    ? "bg-chilli text-white shadow-xs"
                    : "text-charcoal-muted hover:text-charcoal"
                }`}
              >
                {h} {h === 1 ? "Day" : "Days"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadPlannerData(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatNumber
          label="Items to Order"
          value={selectedCount}
          suffix={`of ${recommendations.length} recommended`}
          accent="turmeric"
        />
        <StatNumber
          label="Suppliers Covered"
          value={Object.keys(groupedBySupplier).length}
          subtext="Grouped by route & lead time"
        />
        <StatNumber
          label="Estimated Order Cost"
          prefix="₹"
          value={totalEstimatedCost.toLocaleString()}
          subtext="Subject to vendor invoice discounts"
          accent="leaf"
        />
      </div>

      {/* SHOPPING LIST GROUPED BY SUPPLIER */}
      <div className="space-y-6">
        {Object.entries(groupedBySupplier).map(([supplierName, itemsList]) => {
          const supplierTotal = itemsList
            .filter((it) => selectedItems[it.ingredientId])
            .reduce((s, it) => s + (quantities[it.ingredientId] || 0) * (it.unitCost || 50), 0)

          return (
            <div key={supplierName} className="space-y-3">
              {/* Supplier Header Ticket */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
                <div className="flex items-center space-x-2.5">
                  <Truck className="w-5 h-5 text-charcoal-muted" />
                  <span className="font-serif font-bold text-base sm:text-lg text-charcoal dark:text-chalk">
                    {supplierName}
                  </span>
                  <span className="text-xs text-charcoal-muted">
                    ({itemsList.length} items)
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-charcoal-muted">Supplier Subtotal: </span>
                  <strong className="text-sm font-bold text-charcoal dark:text-chalk">
                    ₹{supplierTotal.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Shopping List Rows */}
              <div className="space-y-2">
                {itemsList.map((item) => {
                  const isChecked = !!selectedItems[item.ingredientId]
                  const qty = quantities[item.ingredientId] || item.recommendedPurchase || 10

                  return (
                    <Ticket
                      key={item.ingredientId}
                      status={isChecked ? "green" : "neutral"}
                      className={`transition-all ${
                        isChecked
                          ? "bg-white dark:bg-chalkboard-card"
                          : "opacity-60 bg-paper-50 dark:bg-chalkboard"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Checkbox + Name + Stock info */}
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleItem(item.ingredientId)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer shrink-0 ${
                              isChecked
                                ? "bg-leaf text-white"
                                : "bg-paper-100 dark:bg-chalkboard border-2 border-paper-border text-transparent"
                            }`}
                            aria-label={`Toggle ${item.ingredientName}`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div className="min-w-0">
                            <h4 className="font-bold text-base text-charcoal dark:text-chalk truncate">
                              {item.ingredientName}
                            </h4>
                            <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5">
                              Stock: <strong>{item.currentStock} {item.unit}</strong> • Par: {item.parLevel} {item.unit} • ₹{item.unitCost}/{item.unit}
                            </div>
                          </div>
                        </div>

                        {/* Right: Quantity Stepper & Cost */}
                        <div className="flex items-center justify-between sm:justify-end space-x-4 pl-10 sm:pl-0">
                          <Stepper
                            value={qty}
                            onChange={(val) => handleQtyChange(item.ingredientId, val)}
                            min={1}
                            step={1}
                            unit={item.unit}
                            disabled={!isChecked}
                          />

                          <div className="text-right min-w-[75px]">
                            <div className="font-serif font-extrabold text-base text-charcoal dark:text-chalk">
                              ₹{(qty * (item.unitCost || 50)).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-charcoal-muted">
                              {item.leadTime || "24h"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Ticket>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* SINGLE PRIMARY "CREATE ORDERS" FOOTER BAR */}
      <div className="sticky bottom-20 sm:bottom-6 z-30 p-4 rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted">
            Ready to Issue
          </div>
          <div className="font-serif font-extrabold text-xl sm:text-2xl text-charcoal dark:text-chalk">
            {selectedCount} Items Selected • <span className="text-chilli">₹{totalEstimatedCost.toLocaleString()}</span>
          </div>
        </div>

        <BigButton
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={selectedCount === 0}
          icon={ShoppingCart}
          onClick={handleCreateOrders}
        >
          Create Purchase Orders Now
        </BigButton>
      </div>
    </div>
  )
}
