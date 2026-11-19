import React, { useState, useEffect } from "react"
import {
  UtensilsCrossed,
  Search,
  Plus,
  Clock,
  Sparkles,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2
} from "lucide-react"
import { Link } from "react-router-dom"
import { menuService } from "../services/api"

export const MenuPage = () => {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dietFilter, setDietFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState("Mains")
  const [formPrice, setFormPrice] = useState(150)
  const [formCost, setFormCost] = useState(50)
  const [formPrepTime, setFormPrepTime] = useState(15)
  const [formIsVeg, setFormIsVeg] = useState(true)
  const [formDesc, setFormDesc] = useState("")

  // Fetch Menu from Flask API
  const fetchMenuItems = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const res = await menuService.getAll()
      if (res.data?.success) {
        setMenuItems(res.data.data || [])
      } else {
        setError(res.data?.message || "Failed to load menu items.")
      }
    } catch (err) {
      console.error("Failed to load menu:", err)
      setError(
        err.response?.data?.message ||
        "Unable to connect to Flask backend. Please ensure the backend is running."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMenuItems()
  }, [])

  // Auto-dismiss notification
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Extract unique categories from backend items
  const baseCategories = ["all", "Mains", "Starters", "Thali", "South Indian", "Snacks", "Beverages", "Desserts"]
  const dynamicCategories = Array.from(new Set(menuItems.map((m) => m.category).filter(Boolean)))
  const allCategories = Array.from(new Set([...baseCategories, ...dynamicCategories]))

  // Filtered Items
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase()

    const matchesDiet =
      dietFilter === "all" ||
      (dietFilter === "veg" && item.isVeg) ||
      (dietFilter === "nonveg" && !item.isVeg)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && item.isAvailable) ||
      (statusFilter === "inactive" && !item.isAvailable)

    const matchesSearch =
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesDiet && matchesStatus && matchesSearch
  })

  // Toggle Availability (live POS toggle)
  const handleToggleStatus = async (item) => {
    try {
      const updatedAvailability = !item.isAvailable
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isAvailable: updatedAvailability } : m))
      )
      await menuService.update(item.id, { isAvailable: updatedAvailability })
      setSuccessMsg(
        `"${item.name}" is now ${updatedAvailability ? "Available" : "Hidden"} on POS.`
      )
    } catch (err) {
      console.error("Toggle error:", err)
      fetchMenuItems(true)
    }
  }

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null)
    setFormName("")
    setFormCategory("Mains")
    setFormPrice(150)
    setFormCost(50)
    setFormPrepTime(15)
    setFormIsVeg(true)
    setFormDesc("")
    setShowAddModal(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormCategory(item.category || "Mains")
    setFormPrice(item.price)
    setFormCost(item.costPrice || Math.round(item.price * 0.35))
    setFormPrepTime(item.prepTimeMinutes || 15)
    setFormIsVeg(item.isVeg)
    setFormDesc(item.description || "")
    setShowAddModal(true)
  }

  // Submit Add or Edit Item
  const handleSaveItem = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      name: formName.trim(),
      category: formCategory,
      price: parseFloat(formPrice),
      costPrice: parseFloat(formCost),
      prepTimeMinutes: parseInt(formPrepTime, 10),
      isVeg: formIsVeg,
      description: formDesc.trim(),
    }

    try {
      if (editingItem) {
        const res = await menuService.update(editingItem.id, payload)
        if (res.data?.success) {
          setSuccessMsg(`"${payload.name}" updated successfully.`)
          setShowAddModal(false)
          fetchMenuItems(true)
        }
      } else {
        const res = await menuService.create(payload)
        if (res.data?.success) {
          setSuccessMsg(`"${payload.name}" added to menu catalog!`)
          setShowAddModal(false)
          fetchMenuItems(true)
        }
      }
    } catch (err) {
      console.error("Save error:", err)
      setError(err.response?.data?.message || "Failed to save menu dish.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Dish
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setSubmitting(true)

    try {
      const res = await menuService.delete(itemToDelete.id)
      if (res.data?.success) {
        setSuccessMsg(`"${itemToDelete.name}" was deleted successfully.`)
        setItemToDelete(null)
        setMenuItems((prev) => prev.filter((m) => m.id !== itemToDelete.id))
      }
    } catch (err) {
      console.error("Delete error:", err)
      setError(err.response?.data?.message || "Failed to delete dish.")
    } finally {
      setSubmitting(false)
    }
  }

  // Aggregate Metrics
  const totalItems = menuItems.length
  const activeItems = menuItems.filter((m) => m.isAvailable).length
  const vegCount = menuItems.filter((m) => m.isVeg).length
  const nonVegCount = totalItems - vegCount
  const avgMargin = totalItems
    ? Math.round(menuItems.reduce((acc, m) => acc + (m.marginPercent || 0), 0) / totalItems)
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Menu Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              Live Catalog
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Configure canteen catalog, dish selling prices, prep times, and live POS availability.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchMenuItems(true)}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition flex items-center space-x-1 cursor-pointer shadow-xs"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/recipes"
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition shadow-xs"
          >
            Recipe BOMs →
          </Link>
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Menu Item</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Total Menu Items</div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100 tracking-tight mt-1.5">{totalItems}</div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Canteen catalog entries</p>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Live in POS</div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100 tracking-tight mt-1.5">{activeItems}</div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">Ready for order taking</p>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Avg Gross Margin</div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100 tracking-tight mt-1.5">{avgMargin}%</div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Calculated from recipe BOM</p>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Dietary Split</div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100 tracking-tight mt-1.5">
            {vegCount} Veg / {nonVegCount} Non-Veg
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Canteen dietary balance</p>
        </div>
      </div>

      {/* Search & Category Tabs */}
      <div className="p-4 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search dishes or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <div className="inline-flex items-center space-x-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-md border border-stone-200 dark:border-stone-700">
              <span className="text-stone-500 dark:text-stone-400 font-medium px-1.5 text-[11px]">Status:</span>
              {["all", "active", "inactive"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded capitalize text-xs font-medium transition cursor-pointer ${
                    statusFilter === st
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Diet Filter */}
            <div className="inline-flex items-center space-x-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-md border border-stone-200 dark:border-stone-700">
              <span className="text-stone-500 dark:text-stone-400 font-medium px-1.5 text-[11px]">Diet:</span>
              <button
                onClick={() => setDietFilter("all")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                  dietFilter === "all" ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-semibold" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietFilter("veg")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                  dietFilter === "veg" ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-semibold" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                Veg
              </button>
              <button
                onClick={() => setDietFilter("nonveg")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
                  dietFilter === "nonveg" ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-semibold" : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                Non-Veg
              </button>
            </div>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap text-xs font-medium transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-emerald-700 dark:bg-emerald-600 text-white font-semibold"
                  : "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Cards Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
          <p className="text-xs text-stone-500 dark:text-stone-400">Loading dishes from database...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 p-8 shadow-xs">
          <UtensilsCrossed className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">No menu items found</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, diet filter, or category selector, or add a new menu dish.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-3 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
          >
            Create First Dish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg bg-white dark:bg-stone-900 border transition flex flex-col justify-between shadow-xs ${
                item.isAvailable
                  ? "border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                  : "border-stone-200 dark:border-stone-800 opacity-60 bg-stone-50/60 dark:bg-stone-850"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border ${
                        item.isVeg ? "border-green-600" : "border-red-600"
                      }`}
                      title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isVeg ? "bg-green-600" : "bg-red-600"
                        }`}
                      />
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleStatus(item)}
                      title="Click to toggle POS availability"
                      className="cursor-pointer"
                    >
                      {item.isAvailable ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 dark:bg-stone-750 text-stone-600 dark:text-stone-400">
                          Inactive
                        </span>
                      )}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit Dish"
                      className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => setItemToDelete(item)}
                      title="Delete Dish"
                      className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 mt-2">{item.name}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                  {item.description || "Authentic freshly prepared kitchen recipe."}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                    <div className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-semibold">Selling Price</div>
                    <div className="font-bold font-mono text-stone-900 dark:text-stone-100 mt-0.5">₹{item.price}</div>
                  </div>
                  <div className="p-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                    <div className="text-[10px] text-stone-400 dark:text-stone-500 uppercase font-semibold">Food Cost</div>
                    <div className="font-bold font-mono text-stone-700 dark:text-stone-300 mt-0.5">₹{item.costPrice}</div>
                  </div>
                  <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Margin</div>
                    <div className="font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-0.5">{item.marginPercent}%</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Prep: {item.prepTimeMinutes || 15} mins</span>
                  </div>
                  <Link
                    to={`/recipes?dishId=${item.id}`}
                    className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    View Recipe BOM →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  {editingItem ? `Edit Dish: ${editingItem.name}` : "Add New Menu Item"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {editingItem
                    ? "Update selling price, category, and preparation specs"
                    : "Create a dish for POS sales catalog and recipe explosion"}
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

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Dish Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Gujarati Thali, Dosa, Tea"
                  className="w-full px-3 py-2 text-xs rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs"
                  >
                    <option value="Mains">Mains</option>
                    <option value="Starters">Starters</option>
                    <option value="Thali">Thali</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Breads">Breads</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Dietary Type</label>
                  <select
                    value={formIsVeg ? "veg" : "nonveg"}
                    onChange={(e) => setFormIsVeg(e.target.value === "veg")}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs"
                  >
                    <option value="veg">Pure Vegetarian (🌱)</option>
                    <option value="nonveg">Non-Vegetarian (🍗)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="0.5"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ingredients, accompaniments, or culinary notes..."
                  className="w-full px-3 py-2 text-xs rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
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
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? "Update Dish" : "Save Item"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-sm w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in">
            <h3 className="font-bold text-base text-rose-700 dark:text-rose-400">Delete Menu Item</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
              Are you sure you want to delete <strong className="text-stone-900 dark:text-stone-100">"{itemToDelete.name}"</strong>?
              This will also remove its associated Bill of Materials recipe.
            </p>

            <div className="flex justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
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

export default MenuPage
