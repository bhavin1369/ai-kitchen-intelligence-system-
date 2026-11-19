import React from "react"

export const StatusTab = ({ status = "neutral", className = "" }) => {
  const colorMap = {
    red: "bg-chilli",
    urgent: "bg-chilli",
    critical: "bg-chilli",
    yellow: "bg-turmeric",
    warning: "bg-turmeric",
    medium: "bg-turmeric",
    green: "bg-leaf",
    good: "bg-leaf",
    safe: "bg-leaf",
    neutral: "bg-paper-border dark:bg-chalkboard-border",
  }

  const bgColor = colorMap[status] || colorMap.neutral

  return (
    <div
      className={`w-2.5 sm:w-3 self-stretch rounded-l-xl shrink-0 ${bgColor} ${className}`}
      aria-hidden="true"
    />
  )
}
