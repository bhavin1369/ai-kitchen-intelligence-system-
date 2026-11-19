import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  UtensilsCrossed,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Percent
} from "lucide-react"

import { wasteService } from "../services/api"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { FilterChip } from "../components/ui/FilterChip"
import { StatNumber } from "../components/ui/StatNumber"

export const LeftoverSuggestionsPage = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [surplusIngredients, setSurplusIngredients] = useState([])
  const [selectedChip, setSelectedChip] = useState("all")
  const [isGenerating, setIsGenerating] = useState(false)

  const loadLeftovers = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await wasteService.getLeftoverSuggestions()
      const data = res.data || {}

      const surplus = data.surplusIngredients?.length
        ? data.surplusIngredients
        : [
            { name: "Cooked Basmati Rice", qty: "3.2 kg", reason: "Yesterday Dinner Surplus" },
            { name: "Fresh Paneer Trimmings", qty: "2.1 kg", reason: "Expires in 18 hrs" },
            { name: "Dal Makhani Overnight", qty: "4.5 litres", reason: "Batch Leftover" },
            { name: "Sliced Red Onions", qty: "3.0 kg", reason: "Prep Station Remainder" },
          ]

      setSurplusIngredients(surplus)

      const recs = data.suggestedRecipes?.length
        ? data.suggestedRecipes
        : [
            {
              id: 1,
              title: "Tawa Pulao & Crispy Rice Tikkis",
              category: "Lunch Special",
              targetIngredient: "Cooked Basmati Rice",
              prepTimeMinutes: 15,
              sellingPrice: 180,
              foodCost: 35,
              marginPercent: 80.5,
              salvageRate: "3.2 kg rescued (₹780 value)",
              instructions: [
                "Toss cooked rice on high flame with cumin, chopped onions, and pav bhaji masala.",
                "Shape remaining rice into small patties with mashed potatoes and pan sear until golden.",
              ],
            },
            {
              id: 2,
              title: "Kadai Paneer Bhurji Kathi Rolls",
              category: "Evening Quick Bite",
              targetIngredient: "Fresh Paneer Trimmings",
              prepTimeMinutes: 12,
              sellingPrice: 220,
              foodCost: 45,
              marginPercent: 79.5,
              salvageRate: "2.1 kg rescued (₹540 value)",
              instructions: [
                "Crumble trimmings with diced capsicum, onions, and coarse coriander seeds.",
                "Roll inside buttered roomali roti or paratha with mint relish.",
              ],
            },
            {
              id: 3,
              title: "Stuffed Dal Makhani Parathas",
              category: "Breakfast / Brunch Special",
              targetIngredient: "Dal Makhani Overnight",
              prepTimeMinutes: 20,
              sellingPrice: 140,
              foodCost: 25,
              marginPercent: 82.1,
              salvageRate: "4.5 L rescued (₹620 value)",
              instructions: [
                "Knead reduced thick dal into whole wheat dough with green chillies and ajwain.",
                "Griddle cook with ghee and serve with curd.",
              ],
            },
          ]

      setRecipes(recs)
    } catch (err) {
      console.error("Leftover load error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLeftovers()
  }, [])

  // Tap leftover chip to filter or generate ideas
  const handleSelectChip = (chipName) => {
    setSelectedChip(chipName)
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
    }, 250)
  }

  // Handle "Cook This" Button Action
  const handleCookThis = (recipe) => {
    toast.undo(
      `Added "${recipe.title}" to today's prep rail as a Chef Special!`,
      () => {
        // undo callback
      }
    )
  }

  const filteredRecipes = recipes.filter((r) => {
    if (selectedChip === "all") return true
    return r.targetIngredient === selectedChip
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-chilli uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AI Upcycling & High Margin Specials</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            AI Leftover Recipes
          </h1>
        </div>

        <button
          type="button"
          onClick={() => loadLeftovers(true)}
          className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
        </button>
      </div>

      {/* 1. LEFTOVER INGREDIENT CHIPS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted">
            Available Surplus & Leftovers in Walk-in
          </span>
          <span className="text-xs text-leaf font-bold">
            Tap a chip to see recipe ideas
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <FilterChip
            label="All Surplus (3 recipes)"
            active={selectedChip === "all"}
            onClick={() => handleSelectChip("all")}
          />
          {surplusIngredients.map((ing) => (
            <FilterChip
              key={ing.name}
              label={`${ing.name} (${ing.qty})`}
              active={selectedChip === ing.name}
              onClick={() => handleSelectChip(ing.name)}
            />
          ))}
        </div>
      </div>

      {/* 2. BIG RECIPE CARDS WITH "COOK THIS" BUTTON */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRecipes.map((recipe) => (
          <Ticket
            key={recipe.id}
            status="green"
            className="flex flex-col justify-between hover:shadow-ticket-hover transition-all"
          >
            <div>
              {/* Category & Prep Time */}
              <div className="flex items-center justify-between text-xs text-charcoal-muted dark:text-chalk-muted mb-2">
                <span className="px-2 py-0.5 rounded-md bg-paper-200 dark:bg-chalkboard font-semibold text-charcoal dark:text-chalk">
                  {recipe.category}
                </span>
                <span className="flex items-center space-x-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{recipe.prepTimeMinutes || 15} mins</span>
                </span>
              </div>

              {/* Title */}
              <h3 className="font-serif font-bold text-lg sm:text-xl text-charcoal dark:text-chalk line-clamp-2">
                {recipe.title}
              </h3>

              {/* Rescued ingredient pill */}
              <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-leaf-light dark:bg-leaf-darkLight text-leaf text-xs font-bold">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Rescues: {recipe.targetIngredient}</span>
              </div>

              {/* Instructions checklist */}
              <div className="mt-4 space-y-1.5 text-xs text-charcoal-muted dark:text-chalk-muted">
                {recipe.instructions?.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="font-bold text-charcoal dark:text-chalk shrink-0">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Margin & "Cook This" Button */}
            <div className="mt-5 pt-3 border-t border-paper-border dark:border-chalkboard-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-charcoal-muted">Sell Price: </span>
                  <strong className="text-charcoal dark:text-chalk font-serif text-sm">
                    ₹{recipe.sellingPrice}
                  </strong>
                </div>
                <div className="px-2 py-0.5 rounded bg-leaf text-white font-black text-[11px]">
                  {recipe.marginPercent || 80}% Margin
                </div>
              </div>

              <BigButton
                variant="primary"
                fullWidth
                size="default"
                icon={Flame}
                onClick={() => handleCookThis(recipe)}
              >
                Cook This Special
              </BigButton>
            </div>
          </Ticket>
        ))}
      </div>
    </div>
  )
}
