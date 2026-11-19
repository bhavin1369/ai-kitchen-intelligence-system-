import React, { useState, useEffect, useRef } from "react"
import {
  Receipt,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  ChefHat,
  Trash2,
  Edit2,
  Upload,
  Download,
  RefreshCw,
  Loader2,
  FileSpreadsheet
} from "lucide-react"
import { salesService, menuService } from "../services/api"

export const SalesPage = () => {
  // Data state
  const [sales, setSales] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Aggregates from backend
  const [totalCount, setTotalCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalPortions, setTotalPortions] = useState(0)
  const [averageTicket, setAverageTicket] = useState(0)

  // Filters
  const [period, setPeriod] = useState("all") // daily, weekly, monthly, all
  const [selectedMenuItem, setSelectedMenuItem] = useState("all")
  const [selectedChannel, setSelectedChannel] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)

  // Add / Edit Order Form State
  const [formSalesDate, setFormSalesDate] = useState(new Date().toISOString().split("T")[0])
  const [formChannel, setFormChannel] = useState("Dine-in")
  const [formTable, setFormTable] = useState("Table 1")
  const [formCustomer, setFormCustomer] = useState("Walk-in Guest")
  const [formPayment, setFormPayment] = useState("UPI")
  const [formStatus, setFormStatus] = useState("completed")
  const [formNotes, setFormNotes] = useState("")
  const [formItems, setFormItems] = useState([])

  // CSV File upload state
  const [csvFile, setCsvFile] = useState(null)
  const [csvResult, setCsvResult] = useState(null)
  const fileInputRef = useRef(null)

  // 1. Fetch menu items for dropdown selectors
  useEffect(() => {
    menuService.getAll().then((res) => {
      if (res.data?.success) {
        setMenuItems(res.data.data || [])
      }
    }).catch(console.error)
  }, [])

  // 2. Fetch sales with active filters
  const fetchSales = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const params = {
        limit: 150,
      }
      if (period !== "all") params.period = period
      if (selectedMenuItem !== "all") params.menuItemId = selectedMenuItem
      if (selectedChannel !== "all") params.channel = selectedChannel
      if (selectedStatus !== "all") params.status = selectedStatus
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const res = await salesService.getAll(params)
      if (res.data?.success) {
        setSales(res.data.data || [])
        setTotalCount(res.data.total || 0)
        setTotalRevenue(res.data.totalRevenue || 0)
        setTotalPortions(res.data.totalPortions || 0)
        setAverageTicket(res.data.averageTicketSize || 0)
      } else {
        setError(res.data?.message || "Failed to load sales data.")
      }
    } catch (err) {
      console.error("Sales fetch error:", err)
      setError(err.response?.data?.message || "Failed to connect to sales service.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [period, selectedMenuItem, selectedChannel, selectedStatus, startDate, endDate])

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSales(true)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Auto-dismiss alert
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4500)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  // Open New Order Modal
  const handleOpenAddModal = () => {
    setFormSalesDate(new Date().toISOString().split("T")[0])
    setFormChannel("Dine-in")
    setFormTable("Table 1")
    setFormCustomer("Walk-in Guest")
    setFormPayment("UPI")
    setFormNotes("")
    if (menuItems.length > 0) {
      setFormItems([{ menuItemId: menuItems[0].id, quantity: 1 }])
    } else {
      setFormItems([])
    }
    setShowAddModal(true)
  }

  // Add Item to Order Form
  const handleAddItemToForm = (menuItemId) => {
    setFormItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId)
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { menuItemId, quantity: 1 }]
    })
  }

  const handleUpdateItemQty = (menuItemId, qty) => {
    if (qty <= 0) {
      setFormItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId))
    } else {
      setFormItems((prev) =>
        prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: qty } : i))
      )
    }
  }

  // Calculate Subtotal & Totals for Add Form
  const formSubtotal = formItems.reduce((sum, item) => {
    const itemData = menuItems.find((m) => m.id === item.menuItemId)
    return sum + (itemData ? itemData.price * item.quantity : 0)
  }, 0)
  const formTax = Math.round(formSubtotal * 0.05 * 100) / 100
  const formGrandTotal = Math.round((formSubtotal + formTax) * 100) / 100

  // Submit New Daily Sale
  const handleCreateSale = async (e) => {
    e.preventDefault()
    if (formItems.length === 0) {
      setError("Please add at least one dish to the sales order.")
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      salesDate: formSalesDate,
      channel: formChannel,
      tableNumber: formChannel === "Dine-in" ? formTable : "",
      customerName: formCustomer || "Walk-in Guest",
      paymentMethod: formPayment,
      notes: formNotes,
      items: formItems.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      })),
    }

    try {
      const res = await salesService.create(payload)
      if (res.data?.success) {
        setSuccessMsg(
          `Order ${res.data.data?.orderNumber || "New Order"} added successfully! Raw ingredients deducted via FEFO.`
        )
        setShowAddModal(false)
        fetchSales(true)
      }
    } catch (err) {
      console.error("Failed to create sale:", err)
      setError(err.response?.data?.message || "Failed to record sales order.")
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Order Modal
  const handleOpenEditModal = (order) => {
    setEditingOrder(order)
    setFormSalesDate(order.date || new Date().toISOString().split("T")[0])
    setFormChannel(order.channel || "Dine-in")
    setFormTable(order.tableNumber || "")
    setFormCustomer(order.customerName || "Walk-in Guest")
    setFormPayment(order.paymentMethod || "UPI")
    setFormStatus(order.status || "completed")
    setFormNotes(order.notes || "")
    setFormItems(
      order.items?.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      })) || []
    )
    setShowEditModal(true)
  }

  // Submit Edit Sale
  const handleUpdateSale = async (e) => {
    e.preventDefault()
    if (!editingOrder) return

    setSubmitting(true)
    setError(null)

    const payload = {
      salesDate: formSalesDate,
      channel: formChannel,
      tableNumber: formChannel === "Dine-in" ? formTable : "",
      customerName: formCustomer,
      paymentMethod: formPayment,
      status: formStatus,
      notes: formNotes,
      items: formItems.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      })),
    }

    try {
      const res = await salesService.update(editingOrder.id, payload)
      if (res.data?.success) {
        setSuccessMsg(`Sale order ${editingOrder.orderNumber} updated successfully.`)
        setShowEditModal(false)
        if (selectedOrder && selectedOrder.id === editingOrder.id) {
          setSelectedOrder(res.data.data)
        }
        fetchSales(true)
      }
    } catch (err) {
      console.error("Update sale error:", err)
      setError(err.response?.data?.message || "Failed to update sale record.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Sale
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return
    setSubmitting(true)

    try {
      const res = await salesService.delete(orderToDelete.id)
      if (res.data?.success) {
        setSuccessMsg(`Sale ${orderToDelete.orderNumber} deleted successfully.`)
        setOrderToDelete(null)
        if (selectedOrder && selectedOrder.id === orderToDelete.id) {
          setSelectedOrder(null)
        }
        setSales((prev) => prev.filter((s) => s.id !== orderToDelete.id))
        fetchSales(true)
      }
    } catch (err) {
      console.error("Delete sale error:", err)
      setError(err.response?.data?.message || "Failed to delete sale order.")
    } finally {
      setSubmitting(false)
    }
  }

  // CSV Upload handler
  const handleUploadCsv = async (e) => {
    e.preventDefault()
    if (!csvFile) {
      setError("Please select a valid CSV file to upload.")
      return
    }

    setSubmitting(true)
    setError(null)
    setCsvResult(null)

    const formData = new FormData()
    formData.append("file", csvFile)

    try {
      const res = await salesService.uploadCsv(formData)
      if (res.data?.success) {
        setCsvResult(res.data.data)
        setSuccessMsg(
          `Imported ${res.data.data?.ordersImported || 0} sales orders from CSV successfully!`
        )
        fetchSales(true)
      }
    } catch (err) {
      console.error("CSV upload error:", err)
      setError(err.response?.data?.message || "CSV processing failed. Check column headers.")
    } finally {
      setSubmitting(false)
    }
  }

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "date,item_name,quantity,channel,table_number,customer_name,payment_method\n" +
      "2026-11-13,Gujarati Thali,2,Dine-in,Table 4,Bhavin Shah,UPI\n" +
      "2026-11-13,Paneer Butter Masala,1,Dine-in,Table 4,Bhavin Shah,UPI\n" +
      "2026-11-13,Dosa,3,Takeaway,,Pooja Mehta,Cash\n" +
      "2026-11-13,Tea,4,Dine-in,Table 2,Aarav Joshi,UPI\n" +
      "2026-11-12,Vegetable Pulao,2,Online,,Online Delivery,Card\n" +
      "2026-11-12,Sandwich,2,Takeaway,,Walk-in Guest,Cash\n" +
      "2026-11-12,Coffee,2,Dine-in,Table 6,Kiran Desai,UPI\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "sample_canteen_sales.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Sales & POS Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              Live SQLite POS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Real-time dining and takeaway transactions, CSV sales import, and automated FEFO ingredient deductions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchSales(true)}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition flex items-center space-x-1 cursor-pointer shadow-xs"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setCsvFile(null)
              setCsvResult(null)
              setShowCsvModal(true)
            }}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 dark:text-rose-300 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Filtered Orders</div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-1.5 font-mono">{totalCount}</div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
            {sales.filter((o) => o.status === "completed").length} Completed in current view
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Total Sales Turnover</div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-1.5 font-mono">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Net gross receipts (inc. GST)</p>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Average Ticket Size</div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-1.5 font-mono">
            ₹{averageTicket.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Per dining transaction</p>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Total Portions Served</div>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-1.5 font-mono">
            {totalPortions}
            <span className="text-xs font-normal text-stone-500 dark:text-stone-400 ml-1.5">dishes</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Prepared and dispatched</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 shadow-xs">
        {/* Row 1: Search & Period Tabs */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Table #, or Dish name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
            />
          </div>

          {/* Period Selector Tabs */}
          <div className="inline-flex items-center p-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs">
            {[
              { id: "all", label: "All History" },
              { id: "daily", label: "Today" },
              { id: "weekly", label: "7 Days" },
              { id: "monthly", label: "30 Days" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id)
                  setStartDate("")
                  setEndDate("")
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  period === p.id
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-semibold"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-stone-100 dark:border-stone-800">
          {/* Menu Item Filter */}
          <div>
            <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
              Filter by Dish:
            </label>
            <select
              value={selectedMenuItem}
              onChange={(e) => setSelectedMenuItem(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
            >
              <option value="all">All Menu Dishes</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Filter */}
          <div>
            <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
              Sales Channel:
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
            >
              <option value="all">All Channels</option>
              <option value="Dine-in">Dine-in</option>
              <option value="Takeaway">Takeaway</option>
              <option value="Online">Online Delivery</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
              From Date:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPeriod("all")
              }}
              className="w-full px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
              To Date:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPeriod("all")
              }}
              className="w-full px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
            <p className="text-xs text-stone-500 dark:text-stone-400">Loading sales records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Channel & Table</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-stone-400 dark:text-stone-500">
                      No sales records found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  sales.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-stone-900 dark:text-stone-100">
                        {ord.orderNumber}
                      </td>
                      <td className="py-2.5 px-4 text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                        <div>{ord.date}</div>
                        <div className="text-stone-400 dark:text-stone-500">{ord.time}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-stone-900 dark:text-stone-100">{ord.channel}</span>
                        {ord.tableNumber && (
                          <span className="ml-1 text-stone-500 dark:text-stone-400 text-[11px]">({ord.tableNumber})</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-stone-700 dark:text-stone-300">{ord.customerName}</td>
                      <td className="py-2.5 px-4 max-w-xs truncate text-stone-600 dark:text-stone-400">
                        {ord.items && ord.items.length > 0
                          ? ord.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
                          : "No dishes"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center space-x-1 font-mono text-[11px] bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300">
                          {ord.paymentMethod === "UPI" ? (
                            <QrCode className="w-3 h-3 text-stone-500" />
                          ) : ord.paymentMethod === "Cash" ? (
                            <Banknote className="w-3 h-3 text-stone-500" />
                          ) : (
                            <CreditCard className="w-3 h-3 text-stone-500" />
                          )}
                          <span>{ord.paymentMethod}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                        ₹{(ord.totalAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            ord.status === "completed"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : ord.status === "in-kitchen"
                              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-medium transition inline-flex items-center space-x-1 cursor-pointer"
                          title="Inspect Order Bill"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ord)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                          title="Edit Sale"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setOrderToDelete(ord)}
                          className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  Order Details — {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {selectedOrder.date} • {selectedOrder.time} • {selectedOrder.channel}{" "}
                  {selectedOrder.tableNumber ? `(${selectedOrder.tableNumber})` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-stone-50 dark:bg-stone-800/70 p-3 rounded-lg border border-stone-200 dark:border-stone-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Customer:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Payment Mode:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Status:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 capitalize">{selectedOrder.status}</span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex justify-between pt-1 border-t border-stone-200 dark:border-stone-700">
                    <span className="text-stone-500 dark:text-stone-400">Notes:</span>
                    <span className="text-stone-800 dark:text-stone-200 italic">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Ordered Dishes
                </h4>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden text-xs">
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between bg-white dark:bg-stone-900">
                      <div>
                        <span className="font-semibold text-stone-900 dark:text-stone-100">{it.name}</span>
                        <span className="text-stone-400 dark:text-stone-500 ml-2">x {it.quantity}</span>
                      </div>
                      <span className="font-bold font-mono text-stone-900 dark:text-stone-100">₹{it.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill totals */}
              <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-lg space-y-1.5 text-xs border border-stone-200 dark:border-stone-700">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{selectedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>GST (5%):</span>
                  <span className="font-mono">₹{selectedOrder.tax}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100 pt-1.5 border-t border-stone-200 dark:border-stone-700">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">₹{selectedOrder.totalAmount}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                <div className="font-semibold flex items-center space-x-1">
                  <ChefHat className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>FEFO Inventory Decrement:</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Ingredients deduced according to Bill of Materials from the earliest expiring active batches.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null)
                  handleOpenEditModal(selectedOrder)
                }}
                className="px-3 py-1.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center space-x-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit This Order</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 rounded-md bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New POS Order / Daily Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-xl w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">Add Daily Sale / POS Order</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Record dining or takeaway bill with automatic FEFO stock decrement
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">
                    Sales Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formSalesDate}
                    onChange={(e) => setFormSalesDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Channel</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="Dine-in">Dine-in</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Online">Online Delivery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">
                    {formChannel === "Dine-in" ? "Table Number" : "Token / Pickup"}
                  </label>
                  <input
                    type="text"
                    value={formTable}
                    onChange={(e) => setFormTable(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                    placeholder="e.g. Table 4"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                    placeholder="Walk-in Guest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Payment Method</label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="UPI">UPI / QR</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                    placeholder="Less spicy, extra pickle..."
                  />
                </div>
              </div>

              {/* Dish Selection Grid */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Select Dishes to Add
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50/60 dark:bg-stone-800/40">
                  {menuItems.map((dish) => (
                    <button
                      type="button"
                      key={dish.id}
                      onClick={() => handleAddItemToForm(dish.id)}
                      className="p-2 text-left rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-emerald-600 dark:hover:border-emerald-500 text-xs transition cursor-pointer"
                    >
                      <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">{dish.name}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">₹{dish.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Basket */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Order Basket ({formItems.length} items)
                </label>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden text-xs max-h-40 overflow-y-auto">
                  {formItems.length === 0 ? (
                    <div className="p-4 text-center text-stone-400 dark:text-stone-500">
                      No dishes added to this order yet. Click a dish above.
                    </div>
                  ) : (
                    formItems.map((sel) => {
                      const dish = menuItems.find((m) => m.id === sel.menuItemId)
                      return (
                        <div key={sel.menuItemId} className="p-2.5 flex items-center justify-between bg-white dark:bg-stone-900">
                          <span className="font-medium text-stone-800 dark:text-stone-200 truncate pr-2">{dish?.name || "Dish"}</span>
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity - 1)}
                              className="w-6 h-6 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold w-5 text-center">{sel.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity + 1)}
                              className="w-6 h-6 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold cursor-pointer"
                            >
                              +
                            </button>
                            <span className="font-mono font-bold w-16 text-right">
                              ₹{((dish?.price || 0) * sel.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{formSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>GST (5%):</span>
                  <span className="font-mono">₹{formTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100 pt-1 border-t border-stone-200 dark:border-stone-700">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">₹{formGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formItems.length === 0}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm & Save Sale</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  Edit Sale Order — {editingOrder.orderNumber}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Modify customer, date, status, or dishes</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSale} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Sales Date</label>
                  <input
                    type="date"
                    required
                    value={formSalesDate}
                    onChange={(e) => setFormSalesDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="completed">Completed</option>
                    <option value="in-kitchen">In-Kitchen</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Channel</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="Dine-in">Dine-in</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Online">Online Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Table / Token</label>
                  <input
                    type="text"
                    value={formTable}
                    onChange={(e) => setFormTable(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Customer</label>
                  <input
                    type="text"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Payment Method</label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="UPI">UPI / QR</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              {/* Order Basket */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Edit Dishes
                </label>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {formItems.map((sel) => {
                    const dish = menuItems.find((m) => m.id === sel.menuItemId)
                    return (
                      <div key={sel.menuItemId} className="p-2 flex items-center justify-between bg-white dark:bg-stone-900">
                        <span className="font-medium text-stone-800 dark:text-stone-200">{dish?.name || "Dish"}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity - 1)}
                            className="w-6 h-6 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold w-5 text-center">{sel.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity + 1)}
                            className="w-6 h-6 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">Upload Sales CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadCsv} className="mt-4 space-y-4 text-xs">
              <p className="text-stone-600 dark:text-stone-400">
                Bulk import sales history directly into SQLite. The system validates dates, dish names against
                the canteen catalog, and processes recipe stock deductions.
              </p>

              {/* Download Sample */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <div>
                  <div className="font-semibold text-stone-800 dark:text-stone-200">Need a valid template?</div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">Columns: date, item_name, quantity, channel, payment_method</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-3 py-1.5 rounded-md bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-medium flex items-center space-x-1 text-[11px] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample</span>
                </button>
              </div>

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-6 text-center hover:border-emerald-600 dark:hover:border-emerald-500 cursor-pointer transition bg-stone-50/50 dark:bg-stone-800/40"
              >
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                {csvFile ? (
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{csvFile.name}</span>
                    <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                      {(csvFile.size / 1024).toFixed(1)} KB — Ready to import
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-medium text-stone-800 dark:text-stone-200">Click to select CSV file</span>
                    <span className="text-stone-400 dark:text-stone-500 block text-[11px] mt-0.5">Supports UTF-8 .csv files</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setCsvFile(e.target.files[0] || null)}
                />
              </div>

              {/* Result Summary */}
              {csvResult && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Import Completed Successfully!</span>
                  </div>
                  <div className="text-[11px]">
                    Orders Imported: <strong>{csvResult.ordersImported}</strong> | Total Sales Value:{" "}
                    <strong>₹{csvResult.totalSalesAmount}</strong>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting || !csvFile}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium shadow-xs disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Upload & Import</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-sm w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in">
            <h3 className="font-bold text-base text-rose-700 dark:text-rose-400">Delete Sale Order</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
              Are you sure you want to delete order{" "}
              <strong className="text-stone-900 dark:text-stone-100 font-mono">"{orderToDelete.orderNumber}"</strong>?
              This record will be permanently deleted from the SQLite database.
            </p>

            <div className="flex justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center space-x-1 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
