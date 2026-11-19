import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ChefHat,
  UtensilsCrossed,
  Layers,
  Calculator,
  Search,
  Plus,
  Scale,
  Percent,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Info,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2
} from "lucide-react"
import { menuService, recipeService, inventoryService } from "../services/api"

export const RecipePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialDishParam = searchParams.get("dishId")

  // State
  const [dishes, setDishes] = useState([])
  const [selectedDishId, setSelectedDishId] = useState(null)
  const [selectedDishData, setSelectedDishData] = useState(null)
  const [dishIngredients, setDishIngredients] = useState([])
  const [availableIngredients, setAvailableIngredients] = useState([])

  const [loadingDishes, setLoadingDishes] = useState(true)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Interactive controls
  const [batchScale, setBatchScale] = useState(50) // Scale portions
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRecipeItem, setEditingRecipeItem] = useState(null)
  const [recipeToDelete, setRecipeToDelete] = useState(null)

  // Add/Edit Form State
  const [formIngredientId, setFormIngredientId] = useState("")
  const [formQuantity, setFormQuantity] = useState("0.10")
  const [formUnit, setFormUnit] = useState("kg")
  const [formPrepLoss, setFormPrepLoss] = useState("0")

  // 1. Fetch all menu dishes and all raw ingredients on mount
  useEffect(() => {
    const initData = async () => {
      setLoadingDishes(true)
      setError(null)
      try {
        const [menuRes, ingRes] = await Promise.all([
          menuService.getAll(),
          inventoryService.getIngredients()
        ])

        const menuList = menuRes.data?.data || []
        setDishes(menuList)
        setAvailableIngredients(ingRes.data?.data || [])

        if (menuList.length > 0) {
          const targetId = initialDishParam ? parseInt(initialDishParam, 10) : menuList[0].id
          const matched = menuList.find((d) => d.id === targetId) || menuList[0]
          setSelectedDishId(matched.id)
        }
      } catch (err) {
        console.error("Failed to fetch initial recipe data:", err)
        setError("Could not load dishes or ingredients from the backend.")
      } finally {
        setLoadingDishes(false)
      }
    }

    initData()
  }, [])

  // 2. Fetch recipe BOM whenever selectedDishId changes
  const fetchRecipeForDish = async (dishId) => {
    if (!dishId) return
    setLoadingRecipe(true)
    setError(null)
    try {
      const res = await recipeService.getByDish(dishId)
      if (res.data?.success) {
        setSelectedDishData(res.data.dish)
        setDishIngredients(res.data.ingredients || [])
      } else {
        setError(res.data?.message || "Failed to load recipe.")
      }
    } catch (err) {
      console.error("Failed to load recipe BOM:", err)
      setError(err.response?.data?.message || "Failed to connect to recipe service.")
    } finally {
      setLoadingRecipe(false)
    }
  }

  useEffect(() => {
    if (selectedDishId) {
      fetchRecipeForDish(selectedDishId)
      setSearchParams({ dishId: selectedDishId }, { replace: true })
    }
  }, [selectedDishId])

  // Auto-dismiss notification
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Active dish object
  const activeDish = selectedDishData || dishes.find((d) => d.id === selectedDishId) || {}

  // Filtered dishes for sidebar
  const filteredDishes = dishes.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculations
  const portionFoodCost = dishIngredients.reduce((sum, item) => sum + (item.costContribution || 0), 0)
  const sellingPrice = activeDish.price || 0
  const marginPercent = sellingPrice > 0
    ? Math.round(((sellingPrice - portionFoodCost) / sellingPrice) * 100)
    : 0
  const avgPrepLoss = dishIngredients.length > 0
    ? (dishIngredients.reduce((sum, item) => sum + (item.prepLossPercent || 0), 0) / dishIngredients.length).toFixed(1)
    : 0

  // Open Add Ingredient Modal
  const handleOpenAddModal = () => {
    setEditingRecipeItem(null)
    if (availableIngredients.length > 0) {
      const first = availableIngredients[0]
      setFormIngredientId(first.id)
      setFormUnit(first.unit || "kg")
    }
    setFormQuantity("0.10")
    setFormPrepLoss("0")
    setShowAddModal(true)
  }

  // Open Edit Ingredient Modal
  const handleOpenEditModal = (item) => {
    setEditingRecipeItem(item)
    setFormIngredientId(item.ingredientId)
    setFormQuantity(item.quantityPerPortion)
    setFormUnit(item.unit)
    setFormPrepLoss(item.prepLossPercent || "0")
    setShowAddModal(true)
  }

  // Handle changing ingredient dropdown to auto-sync default unit
  const handleSelectIngredient = (ingId) => {
    setFormIngredientId(ingId)
    const matched = availableIngredients.find((i) => i.id === parseInt(ingId, 10))
    if (matched && matched.unit) {
      setFormUnit(matched.unit)
    }
  }

  // Save Ingredient to Recipe (Add or Update)
  const handleSaveRecipeIngredient = async (e) => {
    e.preventDefault()
    if (!selectedDishId) return

    setSubmitting(true)
    setError(null)

    const payload = {
      menuItemId: selectedDishId,
      ingredientId: parseInt(formIngredientId, 10),
      quantity: parseFloat(formQuantity),
      unit: formUnit,
      prepLossPercentage: parseFloat(formPrepLoss) || 0.0,
    }

    try {
      if (editingRecipeItem) {
        await recipeService.updateIngredient(editingRecipeItem.id, {
          quantity: payload.quantity,
          unit: payload.unit,
          prepLossPercentage: payload.prepLossPercentage,
        })
        setSuccessMsg("Recipe portion quantity updated.")
      } else {
        await recipeService.addIngredient(payload)
        setSuccessMsg("Ingredient added to recipe formula.")
      }
      setShowAddModal(false)
      fetchRecipeForDish(selectedDishId)
      menuService.getAll().then((res) => setDishes(res.data?.data || []))
    } catch (err) {
      console.error("Failed to save recipe ingredient:", err)
      setError(err.response?.data?.message || "Failed to save ingredient to recipe.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Ingredient from Recipe
  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return
    setSubmitting(true)

    try {
      await recipeService.removeIngredient(recipeToDelete.id)
      setSuccessMsg(`"${recipeToDelete.ingredientName}" removed from recipe.`)
      setRecipeToDelete(null)
      fetchRecipeForDish(selectedDishId)
      menuService.getAll().then((res) => setDishes(res.data?.data || []))
    } catch (err) {
      console.error("Failed to delete recipe entry:", err)
      setError(err.response?.data?.message || "Failed to remove ingredient.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Recipe & Bill of Materials (BOM)
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              Live SQLite BOM
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Engineered recipe formulas, exact portioning, shrinkage loss, and bulk prep scaling for canteen dishes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchRecipeForDish(selectedDishId)}
            disabled={loadingRecipe}
            className="p-2 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs font-medium transition flex items-center space-x-1 cursor-pointer shadow-xs"
            title="Refresh BOM from Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRecipe ? "animate-spin text-emerald-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Ingredient</span>
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Dish Selector (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Select Canteen Dish ({dishes.length})
            </h2>
            <span className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">BOM Explorer</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search canteen dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
            />
          </div>

          {loadingDishes ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <span className="text-xs text-stone-500 dark:text-stone-400">Loading dishes...</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredDishes.map((dish) => {
                const isSelected = dish.id === selectedDishId
                return (
                  <button
                    key={dish.id}
                    onClick={() => setSelectedDishId(dish.id)}
                    className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? "bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-700 dark:border-emerald-600 shadow-xs"
                        : "bg-stone-50/70 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold truncate">{dish.name}</div>
                      <div className={`text-[11px] ${isSelected ? "text-emerald-100" : "text-stone-500 dark:text-stone-400"}`}>
                        {dish.category} • Cost: ₹{dish.costPrice || 0}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold font-mono ${isSelected ? "text-white" : "text-stone-900 dark:text-stone-100"}`}>
                        ₹{dish.price}
                      </div>
                      <div className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-emerald-700 dark:text-emerald-400 font-semibold"}`}>
                        {dish.marginPercent || 0}% margin
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recipe Details & BOM Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Dish Overview Card */}
          <div className="p-5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-stone-100 dark:border-stone-800">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                  {activeDish.category || "Canteen"}
                </span>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1">{activeDish.name}</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {activeDish.description || "Standard culinary formula with portion-based ingredient scaling."}
                </p>
              </div>

              <div className="text-right bg-stone-50 dark:bg-stone-800 p-2.5 rounded-md border border-stone-200 dark:border-stone-700 shrink-0">
                <div className="text-[10px] uppercase font-semibold text-stone-500 dark:text-stone-400">Target Selling Price</div>
                <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">₹{activeDish.price}</div>
              </div>
            </div>

            {/* Financial & Prep Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5 text-xs">
              <div className="p-3 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase">Portion Food Cost</span>
                <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">₹{portionFoodCost.toFixed(2)}</div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500">From verified BOM</span>
              </div>

              <div className="p-3 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase">Gross Margin</span>
                <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">{marginPercent}%</div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500">Target profit margin</span>
              </div>

              <div className="p-3 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase">Prep Time</span>
                <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">
                  {activeDish.prepTimeMinutes || 15} mins
                </div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500">Station cook time</span>
              </div>

              <div className="p-3 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium uppercase">Avg Prep Loss</span>
                <div className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">
                  {avgPrepLoss}%
                </div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500">Shrinkage & trimming</span>
              </div>
            </div>
          </div>

          {/* Interactive Batch Prep Simulation Scaler */}
          <div className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                  <Calculator className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>Batch Prep Scaler</span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Simulate raw ingredient requirements for lunch rush, batch prep, or catering
                </p>
              </div>

              {/* Portion buttons */}
              <div className="inline-flex items-center p-0.5 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs">
                {[10, 25, 50, 100, 200].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBatchScale(num)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                      batchScale === num
                        ? "bg-emerald-700 dark:bg-emerald-600 text-white font-semibold shadow-xs"
                        : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                    }`}
                  >
                    {num} pk
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2.5 text-xs text-stone-500 dark:text-stone-400">
              Scaling BOM calculation for: <strong className="font-semibold text-stone-900 dark:text-stone-100">{batchScale} portions</strong> of{" "}
              <strong className="font-semibold text-stone-900 dark:text-stone-100">{activeDish.name}</strong>
            </div>
          </div>

          {/* Ingredients Table */}
          <div className="rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-xs uppercase tracking-wider">
                  Bill of Materials Breakdown ({dishIngredients.length} Ingredients)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Portion formula, shrinkage loss, and live stock sufficiency check
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {loadingRecipe ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                <span className="text-xs text-stone-500 dark:text-stone-400">Loading recipe formula...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3 px-4">Ingredient</th>
                      <th className="py-3 px-4">Qty / Portion</th>
                      <th className="py-3 px-4">Shrinkage</th>
                      <th className="py-3 px-4">Portion Cost</th>
                      <th className="py-3 px-4 font-bold text-emerald-700 dark:text-emerald-400">Scaled ({batchScale} pk)</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                    {dishIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-stone-400 dark:text-stone-500">
                          No ingredients linked to this dish recipe yet. Click "Add Ingredient" to build the BOM.
                        </td>
                      </tr>
                    ) : (
                      dishIngredients.map((ing) => {
                        const lossFactor = 1.0 + ((ing.prepLossPercent || 0) / 100.0)
                        const scaledQty = (ing.quantityPerPortion * batchScale * lossFactor).toFixed(2)
                        const currentStock = ing.currentStock || 0
                        const hasShortage = currentStock < parseFloat(scaledQty)

                        return (
                          <tr key={ing.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/50 transition">
                            <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100">
                              {ing.ingredientName}
                              {ing.category && (
                                <span className="block text-[10px] text-stone-400 dark:text-stone-500 font-normal">
                                  {ing.category}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {ing.quantityPerPortion} {ing.unit}
                            </td>
                            <td className="py-3 px-4 text-stone-500 dark:text-stone-400">
                              {ing.prepLossPercent || 0}% loss
                            </td>
                            <td className="py-3 px-4 font-bold font-mono text-stone-900 dark:text-stone-100">
                              ₹{(ing.costContribution || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {scaledQty} {ing.unit}
                            </td>
                            <td className="py-3 px-4">
                              {hasShortage ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Shortage ({currentStock} avail)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Sufficient ({currentStock} {ing.unit})</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button
                                onClick={() => handleOpenEditModal(ing)}
                                className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                                title="Edit Quantity or Shrinkage"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRecipeToDelete(ing)}
                                className="p-1 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                title="Remove Ingredient"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Recipe Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                  {editingRecipeItem ? `Edit Portion: ${editingRecipeItem.ingredientName}` : `Add Ingredient to ${activeDish.name}`}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Link raw inventory item with precise single-serving portioning
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

            <form onSubmit={handleSaveRecipeIngredient} className="mt-4 space-y-4 text-xs">
              {!editingRecipeItem && (
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">
                    Select Ingredient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formIngredientId}
                    onChange={(e) => handleSelectIngredient(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="" disabled>
                      -- Choose an ingredient --
                    </option>
                    {availableIngredients.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit}) — Stock: {inv.currentStock} {inv.unit} (₹{inv.unitCost}/{inv.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">
                    Portion Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="l">l (Liter)</option>
                    <option value="ml">ml (Milliliter)</option>
                    <option value="pcs">pcs (Pieces)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Prep Loss / Shrinkage (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={formPrepLoss}
                  onChange={(e) => setFormPrepLoss(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                />
                <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 block">
                  Trimming loss, boiling evaporation, or kitchen prep shrinkage.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingRecipeItem ? "Update Portion" : "Add to Recipe"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recipeToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 rounded-lg max-w-sm w-full border border-stone-200 dark:border-stone-800 shadow-xl p-5 text-stone-900 dark:text-stone-100 animate-in fade-in">
            <h3 className="font-bold text-base text-rose-700 dark:text-rose-400">Remove Recipe Ingredient</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
              Are you sure you want to remove <strong className="text-stone-900 dark:text-stone-100">"{recipeToDelete.ingredientName}"</strong> from the BOM formula of <strong className="text-stone-900 dark:text-stone-100">{activeDish.name}</strong>?
            </p>

            <div className="flex justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
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
                <span>Remove Ingredient</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecipePage
