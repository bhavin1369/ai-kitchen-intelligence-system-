import React, { useState, useEffect, useRef } from "react"
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  QrCode,
  Banknote,
  UtensilsCrossed,
  Clock,
  Printer,
  ChevronRight,
  ListOrdered,
  LayoutGrid
} from "lucide-react"

import { salesService, menuService } from "../services/api"
import { useTheme } from "../context/ThemeContext"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { Stepper } from "../components/ui/Stepper"
import { FilterChip } from "../components/ui/FilterChip"
import { BottomSheet } from "../components/ui/BottomSheet"
import { StatNumber } from "../components/ui/StatNumber"

export const SalesPage = () => {
  const { isDark } = useTheme()
  const toast = useToast()

  // Mode: "pos" (Tap-first POS Pad) or "history" (Order Log / Receipts)
  const [viewMode, setViewMode] = useState("pos")

  // Data
  const [sales, setSales] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Aggregates
  const [totalCount, setTotalCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalPortions, setTotalPortions] = useState(0)
  const [averageTicket, setAverageTicket] = useState(0)

  // POS Pad Current Ticket State
  const [posCategory, setPosCategory] = useState("all")
  const [posSearch, setPosSearch] = useState("")
  const [currentTicketItems, setCurrentTicketItems] = useState([])
  const [ticketChannel, setTicketChannel] = useState("Dine-in")
  const [ticketTable, setTicketTable] = useState("Table 1")
  const [ticketPayment, setTicketPayment] = useState("UPI")
  const [ticketCustomer, setTicketCustomer] = useState("Walk-in Guest")
  const [ticketNotes, setTicketNotes] = useState("")

  // History Filters
  const [historyPeriod, setHistoryPeriod] = useState("all")
  const [historyChannel, setHistoryChannel] = useState("all")
  const [historySearch, setHistorySearch] = useState("")
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null)

  // Modals
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch Menu Items
  useEffect(() => {
    menuService
      .getAll()
      .then((res) => {
        if (res.data?.success) {
          setMenuItems(res.data.data || [])
        }
      })
      .catch((err) => console.error("Menu load error:", err))
  }, [])

  // Fetch Sales
  const fetchSales = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const params = { limit: 100 }
      if (historyPeriod !== "all") params.period = historyPeriod
      if (historyChannel !== "all") params.channel = historyChannel
      if (historySearch.trim()) params.search = historySearch.trim()

      const res = await salesService.getAll(params)
      if (res.data?.success) {
        setSales(res.data.data || [])
        setTotalCount(res.data.total || 0)
        setTotalRevenue(res.data.totalRevenue || 0)
        setTotalPortions(res.data.totalPortions || 0)
        setAverageTicket(res.data.averageTicketSize || 0)
      }
    } catch (err) {
      console.error("Sales fetch error:", err)
      setError("Failed to connect to sales records.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [historyPeriod, historyChannel])

  // POS Item Handlers
  const handleAddItemToTicket = (dish) => {
    setCurrentTicketItems((prev) => {
      const existing = prev.find((item) => item.menuItemId === dish.id)
      if (existing) {
        return prev.map((item) =>
          item.menuItemId === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          menuItemId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
          isVeg: dish.isVeg,
        },
      ]
    })
  }

  const handleUpdateTicketQty = (menuItemId, qty) => {
    if (qty <= 0) {
      setCurrentTicketItems((prev) => prev.filter((it) => it.menuItemId !== menuItemId))
    } else {
      setCurrentTicketItems((prev) =>
        prev.map((it) => (it.menuItemId === menuItemId ? { ...it, quantity: qty } : it))
      )
    }
  }

  const handleClearTicket = () => {
    if (currentTicketItems.length === 0) return
    const backup = [...currentTicketItems]
    setCurrentTicketItems([])
    toast.undo("Order ticket cleared", () => {
      setCurrentTicketItems(backup)
    })
  }

  // Calculate Ticket Totals
  const ticketSubtotal = currentTicketItems.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  )
  const ticketTax = Math.round(ticketSubtotal * 0.05 * 100) / 100
  const ticketGrandTotal = Math.round((ticketSubtotal + ticketTax) * 100) / 100

  // Complete and Submit POS Sale
  const handleCompleteSale = async () => {
    if (currentTicketItems.length === 0) {
      toast.error("Please tap a dish to add to the order ticket.")
      return
    }

    setSubmitting(true)
    const payload = {
      salesDate: new Date().toISOString().split("T")[0],
      channel: ticketChannel,
      tableNumber: ticketChannel === "Dine-in" ? ticketTable : "",
      customerName: ticketCustomer || "Walk-in Guest",
      paymentMethod: ticketPayment,
      notes: ticketNotes,
      items: currentTicketItems.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      })),
    }

    try {
      const res = await salesService.create(payload)
      if (res.data?.success) {
        const orderNum = res.data.data?.orderNumber || "Order"
        const savedItems = [...currentTicketItems]
        const orderId = res.data.data?.id

        setCurrentTicketItems([])
        toast.undo(
          `Logged sale #${orderNum} (₹${ticketGrandTotal}). Stock deducted via FEFO.`,
          async () => {
            if (orderId) {
              await salesService.delete(orderId)
              setCurrentTicketItems(savedItems)
              fetchSales(true)
            }
          }
        )
        fetchSales(true)
      }
    } catch (err) {
      console.error("Sale submission error:", err)
      toast.error(err.response?.data?.message || "Failed to process sale.")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle CSV Import
  const handleCsvUpload = async (e) => {
    e.preventDefault()
    if (!csvFile) return
    setCsvUploading(true)
    const formData = new FormData()
    formData.append("file", csvFile)

    try {
      const res = await salesService.uploadCsv(formData)
      if (res.data?.success) {
        toast.success(`Successfully imported ${res.data.importedCount || "batch"} sales!`)
        setShowCsvModal(false)
        setCsvFile(null)
        fetchSales(true)
      }
    } catch (err) {
      console.error("CSV upload error:", err)
      toast.error("Failed to parse sales CSV file.")
    } finally {
      setCsvUploading(false)
    }
  }

  // Delete Order with Undo
  const handleDeleteOrder = (order) => {
    salesService
      .delete(order.id)
      .then(() => {
        setSales((prev) => prev.filter((o) => o.id !== order.id))
        toast.undo(`Deleted order #${order.orderNumber || order.id}`, async () => {
          await salesService.create(order)
          fetchSales(true)
        })
      })
      .catch((err) => {
        console.error("Delete order error:", err)
        toast.error("Could not delete order.")
      })
  }

  // Category Filtering for POS Pad
  const categories = ["all", ...new Set(menuItems.map((m) => m.category || "Mains"))]

  const filteredDishes = menuItems.filter((dish) => {
    const matchesCat = posCategory === "all" || dish.category === posCategory
    const matchesSearch =
      !posSearch.trim() ||
      dish.name.toLowerCase().includes(posSearch.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail: Switch between POS Pad & Order History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-chilli uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Counter & Table Billing</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Sell (Sales & POS)
          </h1>
        </div>

        {/* View Switcher & Import/Export */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          {/* POS vs History Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
            <button
              type="button"
              onClick={() => setViewMode("pos")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "pos"
                  ? "bg-chilli text-white shadow-xs"
                  : "text-charcoal-muted dark:text-chalk-muted hover:text-charcoal"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>POS Pad</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("history")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "history"
                  ? "bg-chilli text-white shadow-xs"
                  : "text-charcoal-muted dark:text-chalk-muted hover:text-charcoal"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Order Log ({sales.length})</span>
            </button>
          </div>

          {/* Small Import CSV Button */}
          <button
            type="button"
            onClick={() => setShowCsvModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-xs font-semibold text-charcoal-muted dark:text-chalk-muted hover:text-charcoal hover:bg-paper-200 transition cursor-pointer"
            title="Import Sales CSV"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            type="button"
            onClick={() => fetchSales(true)}
            className="p-2 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted dark:text-chalk-muted hover:text-charcoal hover:bg-paper-200 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: TAP-FIRST POS PAD */}
      {viewMode === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7-8 COLS: Dish Tile Grid with Category Filters */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Search + Category chips */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted dark:text-chalk-muted" />
                <input
                  type="text"
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  placeholder="Quick search dish by name..."
                  className="w-full pl-10 pr-4 py-2.5 text-base"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                {categories.map((cat) => (
                  <FilterChip
                    key={cat}
                    label={cat === "all" ? "All Dishes" : cat}
                    active={posCategory === cat}
                    onClick={() => setPosCategory(cat)}
                  />
                ))}
              </div>
            </div>

            {/* Dish Tiles Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredDishes.map((dish) => {
                const inTicket = currentTicketItems.find((it) => it.menuItemId === dish.id)
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => handleAddItemToTicket(dish)}
                    className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer select-none active:scale-95 min-h-[120px] shadow-ticket ${
                      inTicket
                        ? "bg-paper-100 dark:bg-chalkboard border-chilli ring-2 ring-chilli/40"
                        : "bg-white dark:bg-chalkboard-card border-paper-border dark:border-chalkboard-border hover:border-chilli/50"
                    }`}
                  >
                    {/* veg/non-veg dot */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`w-3 h-3 rounded-full border-2 ${
                          dish.isVeg
                            ? "border-leaf bg-leaf/20"
                            : "border-chilli bg-chilli/20"
                        }`}
                        title={dish.isVeg ? "Vegetarian" : "Non-Veg"}
                      />
                      {inTicket && (
                        <span className="px-2 py-0.5 rounded-full bg-chilli text-white font-bold text-xs">
                          {inTicket.quantity}x
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-charcoal dark:text-chalk line-clamp-2 leading-snug">
                        {dish.name}
                      </h3>
                      <div className="mt-1 font-serif font-extrabold text-base text-chilli">
                        ₹{dish.price || 240}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {filteredDishes.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted dark:text-chalk-muted text-sm">
                No matching dishes found in this category.
              </div>
            )}
          </div>

          {/* RIGHT 4-5 COLS: "The Order Ticket" Rail */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
            <Ticket className="space-y-4 bg-white dark:bg-chalkboard-card">
              {/* Ticket Top Rail */}
              <div className="flex items-center justify-between border-b border-paper-border dark:border-chalkboard-border pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
                    Current Order Ticket
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-paper-200 dark:bg-chalkboard text-xs font-bold text-charcoal-muted dark:text-chalk-muted">
                    {currentTicketItems.reduce((s, it) => s + it.quantity, 0)} items
                  </span>
                </div>
                {currentTicketItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTicket}
                    className="text-xs font-semibold text-chilli hover:underline cursor-pointer"
                  >
                    Clear Ticket
                  </button>
                )}
              </div>

              {/* Channel & Table Selector */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex p-1 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border text-xs">
                  {["Dine-in", "Takeaway"].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setTicketChannel(ch)}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        ticketChannel === ch
                          ? "bg-white dark:bg-chalkboard-card text-charcoal dark:text-chalk shadow-xs"
                          : "text-charcoal-muted dark:text-chalk-muted"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                {ticketChannel === "Dine-in" ? (
                  <select
                    value={ticketTable}
                    onChange={(e) => setTicketTable(e.target.value)}
                    className="p-2 text-xs font-semibold"
                  >
                    {["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "VIP Booth"].map(
                      (tbl) => (
                        <option key={tbl} value={tbl}>
                          {tbl}
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={ticketCustomer}
                    onChange={(e) => setTicketCustomer(e.target.value)}
                    placeholder="Guest Name"
                    className="p-2 text-xs font-medium"
                  />
                )}
              </div>

              {/* Ticket Items List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {currentTicketItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-paper-border dark:border-chalkboard-border rounded-xl text-charcoal-muted dark:text-chalk-muted text-xs">
                    Tap dishes on the left to add items to this ticket.
                  </div>
                ) : (
                  currentTicketItems.map((item) => (
                    <div
                      key={item.menuItemId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-paper-50 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-sm text-charcoal dark:text-chalk truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-charcoal-muted dark:text-chalk-muted">
                          ₹{item.price} each • Sub: ₹{item.price * item.quantity}
                        </div>
                      </div>

                      <Stepper
                        value={item.quantity}
                        onChange={(q) => handleUpdateTicketQty(item.menuItemId, q)}
                        min={0}
                        max={50}
                        size="default"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "UPI", label: "UPI", icon: QrCode },
                    { id: "Card", label: "Card", icon: CreditCard },
                    { id: "Cash", label: "Cash", icon: Banknote },
                  ].map((pay) => {
                    const Icon = pay.icon
                    const isSelected = ticketPayment === pay.id
                    return (
                      <button
                        key={pay.id}
                        type="button"
                        onClick={() => setTicketPayment(pay.id)}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-charcoal text-paper dark:bg-chalk dark:text-charcoal border-charcoal font-black shadow-xs"
                            : "bg-paper-50 dark:bg-chalkboard border-paper-border dark:border-chalkboard-border text-charcoal-muted dark:text-chalk-muted hover:text-charcoal"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{pay.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Ticket Perforated Divider */}
              <div className="ticket-edge pt-3 space-y-1.5 text-xs text-charcoal-muted dark:text-chalk-muted">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-charcoal dark:text-chalk">
                    ₹{ticketSubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%)</span>
                  <span className="font-semibold text-charcoal dark:text-chalk">
                    ₹{ticketTax.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-serif font-extrabold text-xl text-charcoal dark:text-chalk pt-1">
                  <span>Grand Total</span>
                  <span className="text-chilli">₹{ticketGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Primary Complete Sale Button */}
              <BigButton
                variant="primary"
                size="lg"
                fullWidth
                disabled={currentTicketItems.length === 0}
                loading={submitting}
                onClick={handleCompleteSale}
              >
                Complete & Bill (₹{ticketGrandTotal})
              </BigButton>
            </Ticket>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ORDER HISTORY LOG */}
      {viewMode === "history" && (
        <div className="space-y-4">
          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatNumber label="Total Orders" value={totalCount} />
            <StatNumber label="Gross Revenue" prefix="₹" value={totalRevenue.toLocaleString()} />
            <StatNumber label="Total Portions" value={totalPortions} />
            <StatNumber label="Average Ticket" prefix="₹" value={averageTicket} />
          </div>

          {/* History Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search orders by customer or receipt #..."
                className="w-full pl-10 pr-4 py-2.5 text-base"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={historyPeriod}
                onChange={(e) => setHistoryPeriod(e.target.value)}
                className="p-2.5 text-sm"
              >
                <option value="all">All Shifts</option>
                <option value="today">Today's Shift</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
              </select>
            </div>
          </div>

          {/* Orders List as Tickets */}
          <div className="space-y-2.5">
            {sales.map((order) => (
              <Ticket
                key={order.id}
                status={order.status === "completed" ? "green" : "yellow"}
                className="hover:border-chilli/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-base text-charcoal dark:text-chalk">
                        Order #{order.orderNumber || order.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-paper-200 dark:bg-chalkboard text-xs font-semibold text-charcoal-muted dark:text-chalk-muted">
                        {order.channel || "Dine-in"} {order.tableNumber && `• ${order.tableNumber}`}
                      </span>
                      <span className="text-xs text-charcoal-muted dark:text-chalk-muted">
                        {order.paymentMethod || "UPI"}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-charcoal-muted dark:text-chalk-muted mt-1">
                      Guest: <strong className="text-charcoal dark:text-chalk">{order.customerName || "Walk-in Guest"}</strong> • {order.items?.length || 1} dishes ordered
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-right">
                      <div className="font-serif font-extrabold text-lg text-chilli">
                        ₹{(order.totalAmount || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-charcoal-muted dark:text-chalk-muted">
                        {order.date || "Today"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order)}
                      className="p-2 rounded-xl text-charcoal-muted hover:text-chilli hover:bg-chilli-light dark:hover:bg-chilli-darkLight transition cursor-pointer"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Ticket>
            ))}

            {sales.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted text-sm">
                No sales orders logged in this view.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV IMPORT BOTTOM SHEET */}
      <BottomSheet
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        title="Import Sales Orders (CSV)"
        subtitle="Bulk upload offline POS receipts"
      >
        <form onSubmit={handleCsvUpload} className="space-y-4">
          <div className="p-6 border-2 border-dashed border-paper-border dark:border-chalkboard-border rounded-2xl text-center">
            <Upload className="w-8 h-8 mx-auto text-charcoal-muted mb-2" />
            <p className="text-sm font-semibold text-charcoal dark:text-chalk">
              Select or drop your sales CSV file here
            </p>
            <p className="text-xs text-charcoal-muted mt-1">
              Supports standard POS export formats (date, item, qty, price)
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="mt-4 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-chilli file:text-white hover:file:bg-chilli-hover"
            />
          </div>

          <BigButton
            type="submit"
            variant="primary"
            fullWidth
            loading={csvUploading}
            disabled={!csvFile}
          >
            Process & Upload CSV
          </BigButton>
        </form>
      </BottomSheet>
    </div>
  )
}
