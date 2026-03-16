'use client'

import { useState } from 'react'
import type { AssetLine } from '@/lib/types'
import { VISITS_PER_YEAR } from '@/lib/types'
import { FREQ_BANDS, calcAssetLine } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils-app'
import { cn } from '@/lib/utils'
import { DISCIPLINE_LABELS, DISCIPLINE_COLORS } from '@/lib/data'

interface CostBreakdownProps {
  assetLine: AssetLine
  salesRate: number
  disciplineLabel: string
}

export function CostBreakdown({ assetLine, salesRate, disciplineLabel }: CostBreakdownProps) {
  const [expanded, setExpanded] = useState(false)
  const calc = calcAssetLine(assetLine, salesRate)

  return (
    <div className="border rounded-lg overflow-hidden hover:bg-secondary/20 transition-colors">
      {/* Expandable Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm">{assetLine.sfgDescription}</p>
            <Badge variant="outline" className={cn('text-xs py-0 px-1', DISCIPLINE_COLORS[assetLine.discipline])}>
              {DISCIPLINE_LABELS[assetLine.discipline].split(' ')[0]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{assetLine.sfgCode}</p>
        </div>
        <div className="text-right mr-4">
          <p className="text-sm font-bold">{formatCurrency(calc.annualCost)}</p>
          <p className="text-xs text-muted-foreground">{calc.totalFlexedHours.toFixed(1)}h annual</p>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="bg-secondary/30 px-4 pb-4 border-t space-y-4">
          {/* Asset Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <p className="font-medium text-sm">{assetLine.location || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Make / Model</p>
              <p className="font-medium text-sm">{assetLine.makeModel || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Quantity</p>
              <p className="font-medium text-sm">{assetLine.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sales Rate</p>
              <p className="font-medium text-sm font-mono">{formatCurrency(salesRate)}/hr</p>
            </div>
          </div>

          {/* Step-by-Step Calculation */}
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-100 mb-3">
              <p className="font-semibold mb-2">How Annual Cost is Calculated:</p>
              <p className="leading-relaxed">
                For each frequency band (e.g., 6-monthly = 2 visits/year): 
                <br/>
                <span className="font-mono">Hours/Visit × Visits/Year × Quantity × Efficiency% × Sales Rate</span>
                <br/>
                The result is annualized and costs are summed across all frequency bands.
              </p>
            </div>
            <p className="font-semibold text-sm">Detailed Breakdown by Frequency Band:</p>
            <div className="space-y-2 bg-background rounded-lg p-3 text-xs">
              {/* Show each frequency band that has hours */}
              {FREQ_BANDS.filter(band => (assetLine.sfgHours[band] ?? 0) > 0).map((band) => {
                const hoursPerVisit = assetLine.sfgHours[band] ?? 0
                const visits = VISITS_PER_YEAR[band]
                const rawAnnual = hoursPerVisit * visits * assetLine.quantity
                const efficiency = assetLine.efficiencyFactor[band] ?? 1.0
                const flexedHours = rawAnnual * efficiency
                const bandLabel = band === '1W' ? 'Weekly' : band === '1M' ? 'Monthly' : band === '2M' ? 'Every 2 Months' : band === '3M' ? 'Quarterly' : band === '4M' ? 'Every 4 Months' : band === '6M' ? '6-Monthly' : band === '12M' ? 'Annual' : 'Other'

                return (
                  <div key={band} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <span className="text-sm px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">{band}</span>
                      <span>{bandLabel}</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground text-xs ml-4">
                      <div className="flex justify-between">
                        <span>Hours per visit:</span>
                        <span className="font-mono">{hoursPerVisit}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Visits per year:</span>
                        <span className="font-mono">{visits}× per year</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="font-mono">×{assetLine.quantity}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span>Raw annual hours:</span>
                        <span className="font-semibold text-foreground font-mono">{hoursPerVisit} × {visits} × {assetLine.quantity} = {rawAnnual.toFixed(1)}h</span>
                      </div>
                      {efficiency !== 1.0 && (
                        <div className="flex justify-between pt-1 bg-yellow-50 dark:bg-yellow-950/20 px-2 py-1 rounded">
                          <span>Efficiency factor:</span>
                          <span className="font-semibold text-foreground font-mono">{rawAnnual.toFixed(1)}h × {(efficiency * 100).toFixed(0)}% = {flexedHours.toFixed(1)}h</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Total Annual Hours */}
              <div className="mt-3 pt-2 border-t font-semibold">
                <div className="flex justify-between">
                  <span>Total Annual Hours:</span>
                  <span className="text-foreground">{calc.totalFlexedHours.toFixed(1)}h</span>
                </div>
              </div>

              {/* Final Cost */}
              <div className="mt-3 pt-2 border-t bg-green-50 dark:bg-green-950 px-2 py-1 rounded">
                <div className="flex justify-between">
                  <span>{calc.totalFlexedHours.toFixed(1)}h × {formatCurrency(salesRate)}/hr</span>
                  <span className="font-bold text-green-700 dark:text-green-300">{formatCurrency(calc.annualCost)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
