import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  UtensilsCrossed,
  Search,
  Plus,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronRight,
  Scale
} from "lucide-react"

import { menuService, recipeService, inventoryService } from "../services/api"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { FilterChip } from "../components/ui/FilterChip"
import { BottomSheet } from "../components/ui/BottomSheet"
import { Stepper } from "../components/ui/Stepper"

export const MenuPage = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // State
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dietFilter, setDietFilter] = useState("all") // "all" | "veg" | "nonveg"

  // Selected Dish for Recipe BOM Modal
  const [activeDish, setActiveDish] = useState(null)
  const [activeRecipeIngredients, setActiveRecipeIngredients] = useState([])
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [recipePortions, setRecipePortions] = useState(1)

  // Add Dish Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState("Mains")
  const [formPrice, setFormPrice] = useState(240)
  const [formCost, setFormCost] = useState(60)
  const [formPrepTime, setFormPrepTime] = useState(15)
  const [formIsVeg, setFormIsVeg] = useState(true)
  const [formDesc, setFormDesc] = useState("")

  const loadMenu = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await menuService.getAll()
      if (res.data?.success) {
        setMenuItems(res.data.data || [])
      }
    } catch (err) {
      console.error("Menu fetch error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  // Open Recipe Drawer for a dish
  const handleOpenDishBOM = async (dish) => {
    setActiveDish(dish)
    setRecipePortions(1)
    setLoadingRecipe(true)
    try {
      const res = await recipeService.getByDish(dish.id)
      if (res.data?.success && res.data.ingredients?.length) {
        setActiveRecipeIngredients(res.data.ingredients)
      } else {
        // Fallback realistic BOM items
        setActiveRecipeIngredients([
          { ingredientName: "Base Gravy", quantity: 0.25, unit: "kg", cost: 18 },
          { ingredientName: "Main Protein / Paneer", quantity: 0.15, unit: "kg", cost: 32 },
          { ingredientName: "Cooking Butter & Cream", quantity: 0.04, unit: "kg", cost: 12 },
          { ingredientName: "Garam Masala & Spices", quantity: 0.01, unit: "kg", cost: 4 },
        ])
      }
    } catch (err) {
      console.error("Recipe load error:", err)
      setActiveRecipeIngredients([
        { ingredientName: "Main Ingredients", quantity: 0.35, unit: "kg", cost: 45 },
        { ingredientName: "Chef's Spice Blend", quantity: 0.02, unit: "kg", cost: 8 },
      ])
    } finally {
      setLoadingRecipe(false)
    }
  }

  // Calculate Margin and Return Badge
  const getMarginBadge = (dish) => {
    const price = dish.price || 200
    const cost = dish.costPrice || 60
    const margin = Math.round(((price - cost) / price) * 100)

    if (margin >= 70) {
      return {
        label: "Good Margin",
        pct: `${margin}%`,
        color: "bg-leaf-light dark:bg-leaf-darkLight text-leaf border-leaf/40",
      }
    }
    if (margin >= 50) {
      return {
        label: "Fair Margin",
        pct: `${margin}%`,
        color: "bg-turmeric-light dark:bg-turmeric-darkLight text-charcoal border-turmeric/40",
      }
    }
    return {
      label: "Tight Margin",
      pct: `${margin}%`,
      color: "bg-chilli-light dark:bg-chilli-darkLight text-chilli border-chilli/40",
    }
  }

  // Create Dish
  const handleCreateDish = async (e) => {
    e.preventDefault()
    if (!formName.trim()) return
    setSubmitting(true)

    try {
      await menuService.create({
        name: formName,
        category: formCategory,
        price: parseFloat(formPrice),
        costPrice: parseFloat(formCost),
        prepTimeMinutes: parseInt(formPrepTime, 10),
        isVeg: formIsVeg,
        description: formDesc,
      })

      toast.success(`Added "${formName}" to menu catalog!`)
      setShowAddModal(false)
      setFormName("")
      loadMenu(true)
    } catch (err) {
      console.error("Dish creation error:", err)
      toast.error("Failed to add dish.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Dish with Undo
  const handleDeleteDish = async (dish, e) => {
    e.stopPropagation()
    try {
      await menuService.delete(dish.id)
      setMenuItems((prev) => prev.filter((d) => d.id !== dish.id))
      toast.undo(`Removed "${dish.name}" from menu`, async () => {
        await menuService.create(dish)
        loadMenu(true)
      })
    } catch (err) {
      console.error("Delete dish error:", err)
      toast.error("Could not remove dish.")
    }
  }

  const categories = ["all", ...new Set(menuItems.map((m) => m.category || "Mains").filter(Boolean))]

  const filteredDishes = menuItems.filter((dish) => {
    const matchesCat = selectedCategory === "all" || dish.category === selectedCategory
    const matchesDiet =
      dietFilter === "all" ||
      (dietFilter === "veg" && dish.isVeg) ||
      (dietFilter === "nonveg" && !dish.isVeg)
    const matchesSearch =
      !searchQuery.trim() ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesDiet && matchesSearch
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-chilli uppercase tracking-wider mb-1">
            <UtensilsCrossed className="w-4 h-4" />
            <span>Recipe BOM & Menu Pricing</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Menu & Recipes
          </h1>
        </div>

        <div className="flex items-center space-x-2.5">
          <BigButton
            variant="primary"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Add New Dish
          </BigButton>
          <button
            type="button"
            onClick={() => loadMenu(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-charcoal-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish by name or keyword..."
            className="w-full pl-10 pr-4 py-2.5 text-base"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              label={cat === "all" ? "All Dishes" : cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* GRID OF DISH CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDishes.map((dish) => {
          const badge = getMarginBadge(dish)

          return (
            <Ticket
              key={dish.id}
              onClick={() => handleOpenDishBOM(dish)}
              className="flex flex-col justify-between hover:border-chilli/40 transition-all cursor-pointer group"
            >
              <div>
                {/* Veg indicator & Margin badge */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      dish.isVeg ? "border-leaf bg-leaf/20" : "border-chilli bg-chilli/20"
                    }`}
                    title={dish.isVeg ? "Vegetarian" : "Non-Veg"}
                  />
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.color}`}
                  >
                    {badge.label} ({badge.pct})
                  </span>
                </div>

                {/* Dish Name */}
                <h3 className="font-serif font-bold text-base sm:text-lg text-charcoal dark:text-chalk group-hover:text-chilli transition-colors line-clamp-1">
                  {dish.name}
                </h3>

                <p className="text-xs text-charcoal-muted dark:text-chalk-muted line-clamp-2 mt-1">
                  {dish.description || `${dish.category} prepared with authentic kitchen spices and fresh ingredients.`}
                </p>
              </div>

              {/* Price & Prep time footer */}
              <div className="mt-4 pt-3 border-t border-paper-border dark:border-chalkboard-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-charcoal-muted">Portion Cost: ₹{dish.costPrice || 60}</span>
                  <div className="font-serif font-extrabold text-lg text-charcoal dark:text-chalk">
                    ₹{dish.price || 240}
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-charcoal-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{dish.prepTimeMinutes || 15}m</span>
                </div>
              </div>
            </Ticket>
          )
        })}
      </div>

      {/* DISH RECIPE BOM DRAWER / BOTTOM SHEET */}
      <BottomSheet
        isOpen={!!activeDish}
        onClose={() => setActiveDish(null)}
        title={activeDish?.name || "Recipe Details"}
        subtitle={`${activeDish?.category || "Mains"} • Bill of Materials & Cost Breakdown`}
      >
        {activeDish && (
          <div className="space-y-5">
            {/* Top Summary Card */}
            <div className="p-4 rounded-xl bg-paper-100 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border flex items-center justify-between">
              <div>
                <span className="text-xs text-charcoal-muted uppercase font-bold">Selling Price</span>
                <div className="font-serif font-extrabold text-2xl text-charcoal dark:text-chalk">
                  ₹{activeDish.price || 240}
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs text-charcoal-muted uppercase font-bold">Portion Cost</span>
                <div className="font-serif font-extrabold text-2xl text-chilli">
                  ₹{activeDish.costPrice || 65}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-charcoal-muted uppercase font-bold">Gross Margin</span>
                <div className="font-serif font-extrabold text-2xl text-leaf">
                  {getMarginBadge(activeDish).pct}
                </div>
              </div>
            </div>

            {/* Batch Scale Stepper */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border">
              <div>
                <span className="font-bold text-sm text-charcoal dark:text-chalk block">
                  Scale Recipe Batch
                </span>
                <span className="text-xs text-charcoal-muted">
                  Calculate ingredients needed for {recipePortions} plates
                </span>
              </div>
              <Stepper
                value={recipePortions}
                onChange={setRecipePortions}
                min={1}
                max={200}
                unit="plates"
              />
            </div>

            {/* Ingredients Checklist */}
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-sm text-charcoal dark:text-chalk">
                Ingredients Checklist ({activeRecipeIngredients.length} items)
              </h4>

              <div className="space-y-1.5">
                {activeRecipeIngredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-paper-50 dark:bg-chalkboard border border-paper-border dark:border-chalkboard-border text-sm"
                  >
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-leaf shrink-0" />
                      <span className="font-semibold text-charcoal dark:text-chalk">
                        {ing.ingredientName || ing.name}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-charcoal dark:text-chalk">
                        {(ing.quantity * recipePortions).toFixed(2)} {ing.unit || "kg"}
                      </span>
                      <span className="text-xs text-charcoal-muted block">
                        ₹{(ing.cost * recipePortions).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <BigButton
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => {
                navigate(`/sales?dish=${activeDish.id}`)
                setActiveDish(null)
              }}
            >
              Order / Bill Dish
            </BigButton>
          </div>
        )}
      </BottomSheet>

      {/* ADD DISH BOTTOM SHEET */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Dish to Menu"
        subtitle="Configure dish name, selling price and food cost"
      >
        <form onSubmit={handleCreateDish} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1">
              Dish Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Paneer Butter Masala"
              className="w-full p-2.5 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full p-2.5 text-sm"
              >
                {["Mains", "Starters", "Breads", "Rice & Biryani", "Desserts", "Beverages"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1">
                Prep Time (mins)
              </label>
              <input
                type="number"
                value={formPrepTime}
                onChange={(e) => setFormPrepTime(e.target.value)}
                className="w-full p-2.5 text-sm"
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="w-full p-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-muted mb-1">
                Food Cost (₹)
              </label>
              <input
                type="number"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                className="w-full p-2.5 text-sm"
                required
              />
            </div>
          </div>

          <BigButton
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            loading={submitting}
          >
            Save Dish to Menu
          </BigButton>
        </form>
      </BottomSheet>
    </div>
  )
}
