import React from "react"
import { Sparkles, Construction, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

export const ModulePlaceholder = ({ title, description, phase, badge, icon: Icon }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{title}</h1>
              {badge && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium border border-stone-200 dark:border-stone-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Scaffold Card */}
      <div className="p-10 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="inline-flex p-4 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-emerald-600 dark:text-emerald-400">
          <Construction className="w-8 h-8 animate-bounce" />
        </div>
        <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
          {title} Scaffolded
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          The database schema, seed tables, and REST endpoints for this module are configured in the backend and ready for {phase} implementation.
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center space-x-1 text-xs text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60">
            <Sparkles className="w-3 h-3" />
            <span>Ready for {phase}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
