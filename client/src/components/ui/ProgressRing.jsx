import React from "react"

export const ProgressRing = ({
  completed = 0,
  total = 0,
  size = 72,
  strokeWidth = 6,
  showFraction = true,
  className = "",
}) => {
  const safeTotal = total > 0 ? total : 1
  const percentage = Math.min(100, Math.round((completed / safeTotal) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const isDone = completed >= total && total > 0

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-paper-border dark:text-chalkboard-border fill-transparent"
        />
        {/* Progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`fill-transparent transition-all duration-300 ease-out ${
            isDone ? "text-leaf" : "text-chilli"
          }`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showFraction ? (
          <div className="leading-tight">
            <span className="font-serif font-bold text-base sm:text-lg text-charcoal dark:text-chalk">
              {completed}
            </span>
            <span className="text-xs text-charcoal-muted dark:text-chalk-muted font-sans">
              /{total}
            </span>
          </div>
        ) : (
          <span className="font-serif font-bold text-sm sm:text-base text-charcoal dark:text-chalk">
            {percentage}%
          </span>
        )}
      </div>
    </div>
  )
}
