import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ChefHat,
  UtensilsCrossed,
  Layers,
  Search,
  Plus,
  Scale,
  Percent,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  ArrowRight
} from "lucide-react"

import { menuService, recipeService, inventoryService } from "../services/api"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { Stepper } from "../components/ui/Stepper"
import { FilterChip } from "../components/ui/FilterChip"
import { BottomSheet } from "../components/ui/BottomSheet"
import { StatNumber } from "../components/ui/StatNumber"

export const RecipePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialDishParam = searchParams.get("dishId")
  const toast = useToast()

  // State
  const [dishes, setDishes] = useState([])
  const [selectedDishId, setSelectedDishId] = useState(null)
  const [selectedDishData, setSelectedDishData] = useState(null)
  const [dishIngredients, setDishIngredients] = useState([])
  const [availableIngredients, setAvailableIngredients] = useState([])

  const [loadingDishes, setLoadingDishes] = useState(true)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [batchScale, setBatchScale] = useState(20) // Default batch: 20 portions
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRecipeItem, setEditingRecipeItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formIngredientId, setFormIngredientId] = useState("")
  const [formQuantity, setFormQuantity] = useState("0.15")
  const [formUnit, setFormUnit] = useState("kg")
  const [formPrepLoss, setFormPrepLoss] = useState("0")

  // Load Dishes & Ingredients
  useEffect(() => {
    const initData = async () => {
      setLoadingDishes(true)
      try {
        const [menuRes, ingRes] = await Promise.allSettled([
          menuService.getAll(),
          inventoryService.getIngredients(),
        ])

        const menuList = menuRes.status === "fulfilled" ? menuRes.value.data?.data || [] : []
        setDishes(menuList)

        if (ingRes.status === "fulfilled" && ingRes.value.data?.data) {
          setAvailableIngredients(ingRes.value.data.data)
        }

        if (menuList.length > 0) {
          const targetId = initialDishParam ? parseInt(initialDishParam, 10) : menuList[0].id
          const matched = menuList.find((d) => d.id === targetId) || menuList[0]
          setSelectedDishId(matched.id)
        }
      } catch (err) {
        console.error("Init recipe error:", err)
      } finally {
        setLoadingDishes(false)
      }
    }
    initData()
  }, [])

  // Load Recipe BOM
  const fetchRecipeForDish = async (dishId) => {
    if (!dishId) return
    setLoadingRecipe(true)
    try {
      const res = await recipeService.getByDish(dishId)
      if (res.data?.success) {
        setSelectedDishData(res.data.dish)
        setDishIngredients(res.data.ingredients || [])
      }
    } catch (err) {
      console.error("Recipe load error:", err)
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

  // Active dish
  const activeDish = selectedDishData || dishes.find((d) => d.id === selectedDishId) || {}

  // Calculations
  const portionCost = dishIngredients.reduce((sum, item) => sum + (item.costContribution || 0), 0)
  const sellingPrice = activeDish.price || 240
  const marginPct = sellingPrice > 0 ? Math.round(((sellingPrice - portionCost) / sellingPrice) * 100) : 0

  const getMarginBadge = () => {
    if (marginPct >= 70) {
      return {
        label: "Good Margin",
        color: "bg-leaf-light dark:bg-leaf-darkLight text-leaf border-leaf/40",
      }
    }
    if (marginPct >= 50) {
      return {
        label: "Fair Margin",
        color: "bg-turmeric-light dark:bg-turmeric-darkLight text-charcoal border-turmeric/40",
      }
    }
    return {
      label: "Tight Margin",
      color: "bg-chilli-light dark:bg-chilli-darkLight text-chilli border-chilli/40",
    }
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingRecipeItem(null)
    if (availableIngredients.length > 0) {
      setFormIngredientId(availableIngredients[0].id)
      setFormUnit(availableIngredients[0].unit || "kg")
    }
    setFormQuantity("0.15")
    setFormPrepLoss("0")
    setShowAddModal(true)
  }

  // Save Ingredient
  const handleSaveIngredient = async (e) => {
    e.preventDefault()
    if (!selectedDishId) return
    setSubmitting(true)

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
        toast.success("Updated ingredient quantity.")
      } else {
        await recipeService.addIngredient(payload)
        toast.success("Added ingredient to recipe formula.")
      }
      setShowAddModal(false)
      fetchRecipeForDish(selectedDishId)
    } catch (err) {
      console.error("Save ingredient error:", err)
      toast.error("Failed to save recipe ingredient.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Ingredient with Undo
  const handleDeleteIngredient = async (item) => {
    try {
      await recipeService.removeIngredient(item.id)
      setDishIngredients((prev) => prev.filter((i) => i.id !== item.id))
      toast.undo(`Removed ${item.ingredientName} from formula`, async () => {
        await recipeService.addIngredient({
          menuItemId: selectedDishId,
          ingredientId: item.ingredientId,
          quantity: item.quantityPerPortion,
          unit: item.unit,
        })
        fetchRecipeForDish(selectedDishId)
      })
    } catch (err) {
      console.error("Delete ingredient error:", err)
      toast.error("Could not remove ingredient.")
    }
  }

  const badge = getMarginBadge()

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-chilli uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Recipe Formulas & BOM Scaling</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Recipe Management
          </h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <BigButton variant="primary" icon={Plus} onClick={handleOpenAddModal}>
            Add Ingredient
          </BigButton>
          <button
            type="button"
            onClick={() => fetchRecipeForDish(selectedDishId)}
            className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRecipe ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dish Select Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
        {dishes.map((dish) => (
          <FilterChip
            key={dish.id}
            label={dish.name}
            active={selectedDishId === dish.id}
            onClick={() => setSelectedDishId(dish.id)}
          />
        ))}
      </div>

      {/* Dish Recipe Ticket */}
      <Ticket className="space-y-6">
        {/* Header Strip with Margin Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-paper-border dark:border-chalkboard-border pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif font-extrabold text-2xl text-charcoal dark:text-chalk">
                {activeDish.name || "Recipe Formula"}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${badge.color}`}>
                {badge.label} ({marginPct}%)
              </span>
            </div>
            <p className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1">
              Category: {activeDish.category || "Mains"} • Standard preparation time: {activeDish.prepTimeMinutes || 15} mins
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-xs text-charcoal-muted">Selling Price</span>
              <div className="font-serif font-bold text-xl text-charcoal dark:text-chalk">
                ₹{sellingPrice}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-charcoal-muted">Portion Cost</span>
              <div className="font-serif font-bold text-xl text-chilli">
                ₹{portionCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Batch Scale Stepper */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border">
          <div>
            <span className="font-bold text-base text-charcoal dark:text-chalk block">
              Scale Batch for Prep
            </span>
            <span className="text-xs text-charcoal-muted">
              Auto-calculates warehouse pull requirements for {batchScale} portions
            </span>
          </div>

          <Stepper
            value={batchScale}
            onChange={setBatchScale}
            min={1}
            max={500}
            step={5}
            unit="portions"
          />
        </div>

        {/* Ingredients Checklist */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base text-charcoal dark:text-chalk">
            Ingredients & Portion Contributions
          </h3>

          <div className="space-y-2">
            {dishIngredients.map((item) => {
              const totalBatchQty = (item.quantityPerPortion * batchScale).toFixed(2)
              const totalBatchCost = (item.costContribution * batchScale).toFixed(2)

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-paper-50 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border gap-2 text-sm"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-leaf shrink-0" />
                    <div>
                      <div className="font-bold text-charcoal dark:text-chalk">
                        {item.ingredientName}
                      </div>
                      <div className="text-xs text-charcoal-muted">
                        Per portion: {item.quantityPerPortion} {item.unit} (₹{item.costContribution?.toFixed(2)})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-5 pl-8 sm:pl-0">
                    <div className="text-right">
                      <div className="font-bold text-charcoal dark:text-chalk">
                        {totalBatchQty} {item.unit}
                      </div>
                      <div className="text-xs text-charcoal-muted">
                        Batch Cost: ₹{totalBatchCost}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteIngredient(item)}
                      className="p-1.5 rounded-lg text-charcoal-muted hover:text-chilli transition cursor-pointer"
                      title="Remove from recipe"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}

            {dishIngredients.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-paper-border rounded-xl text-charcoal-muted text-xs">
                No ingredients added to this recipe formula yet. Click "Add Ingredient" to start.
              </div>
            )}
          </div>
        </div>
      </Ticket>

      {/* ADD INGREDIENT BOTTOM SHEET */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Ingredient to Recipe"
        subtitle={`Configure quantity per portion for ${activeDish.name || "Dish"}`}
      >
        <form onSubmit={handleSaveIngredient} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1.5">
              Select Ingredient
            </label>
            <select
              value={formIngredientId}
              onChange={(e) => {
                setFormIngredientId(e.target.value)
                const matched = availableIngredients.find((i) => i.id === parseInt(e.target.value, 10))
                if (matched?.unit) setFormUnit(matched.unit)
              }}
              className="w-full p-3 text-base"
            >
              {availableIngredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit}) - ₹{i.unitCost}/{i.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1.5">
                Quantity Per Portion
              </label>
              <input
                type="number"
                step="0.01"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                className="w-full p-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1.5">
                Unit
              </label>
              <input
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full p-2.5 text-sm"
              />
            </div>
          </div>

          <BigButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
          >
            Save Ingredient to Recipe
          </BigButton>
        </form>
      </BottomSheet>
    </div>
  )
}
