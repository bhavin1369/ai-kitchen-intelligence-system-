import React, { useState, useEffect } from "react"
import {
  Leaf,
  Droplets,
  Trees,
  Wind,
  Car,
  RefreshCw,
  Award,
  Sparkles,
  Calendar
} from "lucide-react"

import { environmentalService } from "../services/api"
import { Ticket } from "../components/ui/Ticket"
import { StatNumber } from "../components/ui/StatNumber"
import { FilterChip } from "../components/ui/FilterChip"

export const EnvironmentalImpactPage = () => {
  const [periodDays, setPeriodDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [impactData, setImpactData] = useState(null)

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await environmentalService.getImpact({ days: periodDays })
      setImpactData(res.data)
    } catch (err) {
      console.error("Environmental impact error:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [periodDays])

  const s = impactData?.summary || {
    co2AvoidedKg: 285,
    waterSavedLiters: 12450,
    treesEquivalent: 14,
    mealsRescued: 480,
    carKmOffset: 1450,
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-leaf uppercase tracking-wider mb-1">
            <Leaf className="w-4 h-4" />
            <span>Sustainability & Kitchen Stewardship</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Environmental Impact
          </h1>
        </div>

        {/* Period Pills */}
        <div className="flex items-center space-x-2">
          {[7, 30, 90].map((d) => (
            <FilterChip
              key={d}
              label={d === 7 ? "7 Days" : d === 30 ? "30 Days" : "90 Days"}
              active={periodDays === d}
              onClick={() => setPeriodDays(d)}
            />
          ))}

          <button
            type="button"
            onClick={() => loadData(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border text-charcoal-muted hover:text-charcoal transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-chilli" : ""}`} />
          </button>
        </div>
      </div>

      {/* Friendly Story Banner */}
      <Ticket status="green" className="bg-gradient-to-r from-leaf-light/50 via-white to-leaf-light/50 dark:from-leaf-darkLight/30 dark:via-chalkboard-card dark:to-leaf-darkLight/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-leaf uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              <span>Certified Low-Waste Kitchen</span>
            </div>
            <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-charcoal dark:text-chalk">
              Your kitchen prevented {s.mealsRescued || 480} meals from landfill this month!
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted dark:text-chalk-muted mt-1 max-w-2xl">
              By adhering to smart FEFO batch usage and leftover upcycling recipes, SpiceCraft prevented approximately {s.co2AvoidedKg || 285} kg of greenhouse gas emissions.
            </p>
          </div>

          <div className="text-4xl sm:text-5xl select-none shrink-0" role="img" aria-label="Sprout">
            🌱
          </div>
        </div>
      </Ticket>

      {/* 4 Friendly Big Metric Visual Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Trees */}
        <div className="p-6 rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket flex flex-col justify-between">
          <div className="flex items-center justify-between text-leaf mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted">
              Trees Saved
            </span>
            <Trees className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="font-serif text-4xl sm:text-5xl font-extrabold text-charcoal dark:text-chalk">
              {s.treesEquivalent || 14}
            </div>
            <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1 font-medium">
              Equivalent urban trees planted
            </div>
          </div>
        </div>

        {/* Card 2: Water */}
        <div className="p-6 rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted">
              Water Conserved
            </span>
            <Droplets className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="font-serif text-4xl sm:text-5xl font-extrabold text-charcoal dark:text-chalk">
              {(s.waterSavedLiters || 12450).toLocaleString()}
            </div>
            <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1 font-medium">
              Litres of agricultural water saved
            </div>
          </div>
        </div>

        {/* Card 3: Carbon */}
        <div className="p-6 rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket flex flex-col justify-between">
          <div className="flex items-center justify-between text-chilli mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted">
              Emissions Averted
            </span>
            <Wind className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="font-serif text-4xl sm:text-5xl font-extrabold text-charcoal dark:text-chalk">
              {s.co2AvoidedKg || 285}
              <span className="text-xl sm:text-2xl font-bold ml-1">kg</span>
            </div>
            <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1 font-medium">
              CO₂ landfill greenhouse gases averted
            </div>
          </div>
        </div>

        {/* Card 4: Car km Offset */}
        <div className="p-6 rounded-2xl bg-white dark:bg-chalkboard-card border border-paper-border dark:border-chalkboard-border shadow-ticket flex flex-col justify-between">
          <div className="flex items-center justify-between text-turmeric mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted dark:text-chalk-muted">
              Car Distance Offset
            </span>
            <Car className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="font-serif text-4xl sm:text-5xl font-extrabold text-charcoal dark:text-chalk">
              {(s.carKmOffset || 1450).toLocaleString()}
              <span className="text-xl sm:text-2xl font-bold ml-1">km</span>
            </div>
            <div className="text-xs text-charcoal-muted dark:text-chalk-muted mt-1 font-medium">
              Passenger car travel offset
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
