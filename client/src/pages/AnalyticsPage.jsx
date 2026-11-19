import React, { useState } from "react"
import {
  FileSpreadsheet,
  Download,
  Database,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  BarChart3,
  ShieldCheck
} from "lucide-react"

import { reportsService, wasteService } from "../services/api"
import { useToast } from "../context/ToastContext"
import { Ticket } from "../components/ui/Ticket"
import { BigButton } from "../components/ui/BigButton"
import { StatNumber } from "../components/ui/StatNumber"

export const AnalyticsPage = () => {
  const toast = useToast()
  const [backingUp, setBackingUp] = useState(false)

  const reportsList = [
    {
      id: "sales",
      title: "Daily Sales & Counter Receipts Ledger",
      description: "Itemized customer orders, payment channels (UPI/Cash/Card), table numbers, and line items.",
      format: "CSV",
      getUrl: () => reportsService.getSalesExportUrl ? reportsService.getSalesExportUrl() : "/api/v1/reports/export/sales",
      lastGenerated: "Today, 18:30",
    },
    {
      id: "waste",
      title: "Food Waste, Spoilage & Trimmings Audit",
      description: "Logs of all kitchen waste by station, ingredient, weight (kg), financial loss, and disposal reason.",
      format: "CSV",
      getUrl: () => wasteService.getExportCsvUrl(),
      lastGenerated: "Today, 14:00",
    },
    {
      id: "inventory",
      title: "Inventory Stock Valuation & Par Report",
      description: "Full snapshot of current ingredient levels, warehouse valuation, reorder deficits, and FEFO expiry dates.",
      format: "CSV",
      getUrl: () => "/api/v1/reports/export/inventory",
      lastGenerated: "Today, 09:00",
    },
    {
      id: "procurement",
      title: "Supplier Purchase Orders & Deliveries",
      description: "Detailed purchase orders grouped by vendor, delivery lead times, received quantities, and unit costs.",
      format: "CSV",
      getUrl: () => "/api/v1/reports/export/purchases",
      lastGenerated: "Yesterday",
    },
    {
      id: "financial",
      title: "P&L Executive Summary & Food Cost Ratio",
      description: "Monthly revenue vs ingredient cost percentage, gross margin analysis, and estimated savings.",
      format: "CSV",
      getUrl: () => "/api/v1/reports/export/financial",
      lastGenerated: "Nov 1, 2026",
    },
  ]

  const handleDownload = (rep) => {
    try {
      window.open(rep.getUrl(), "_blank")
      toast.success(`Downloaded ${rep.title}`)
    } catch (err) {
      toast.error("Download failed.")
    }
  }

  const handleTriggerBackup = async () => {
    setBackingUp(true)
    try {
      await reportsService.triggerBackup()
      toast.success("Database backup archive generated successfully!")
    } catch (err) {
      toast.error("Backup failed.")
    } finally {
      setBackingUp(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-paper-border dark:border-chalkboard-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-chilli uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Auditing & Data Exports</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-charcoal dark:text-chalk">
            Reports & Exports
          </h1>
        </div>

        <BigButton
          variant="secondary"
          size="default"
          loading={backingUp}
          icon={Database}
          onClick={handleTriggerBackup}
        >
          Create Full Backup
        </BigButton>
      </div>

      {/* Summary Banner */}
      <Ticket status="green">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-lg text-charcoal dark:text-chalk">
              One-Tap Kitchen Exports
            </h2>
            <p className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5">
              Instantly export standardized CSV spreadsheets for accounting, inventory audits, and management review.
            </p>
          </div>
          <span className="text-xs font-bold text-leaf px-2.5 py-1 rounded-lg bg-leaf-light dark:bg-leaf-darkLight">
            All Systems Synced
          </span>
        </div>
      </Ticket>

      {/* SIMPLE LIST OF DOWNLOADABLE REPORTS WITH ONE-TAP DOWNLOAD */}
      <div className="space-y-3">
        {reportsList.map((rep) => (
          <Ticket key={rep.id} className="hover:border-chilli/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-paper-200 dark:bg-chalkboard flex items-center justify-center text-charcoal dark:text-chalk shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5 text-leaf" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base text-charcoal dark:text-chalk truncate">
                      {rep.title}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-paper-200 dark:bg-chalkboard text-[10px] font-black uppercase text-charcoal-muted">
                      {rep.format}
                    </span>
                  </div>

                  <p className="text-xs text-charcoal-muted dark:text-chalk-muted mt-0.5 line-clamp-2">
                    {rep.description}
                  </p>

                  <div className="text-[11px] text-charcoal-muted mt-1.5 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Last generated: {rep.lastGenerated}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <BigButton
                  variant="primary"
                  size="default"
                  icon={Download}
                  onClick={() => handleDownload(rep)}
                >
                  Download {rep.format}
                </BigButton>
              </div>
            </div>
          </Ticket>
        ))}
      </div>
    </div>
  )
}
