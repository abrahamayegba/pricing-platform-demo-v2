'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getQuote, saveQuote, FREQ_BANDS, getRateCard, calcAssetLine, calcManualTask } from '@/lib/store'
import type { Quote, QuoteStatus, ManualTask } from '@/lib/types'
import { DISCIPLINE_LABELS, DISCIPLINE_COLORS } from '@/lib/data'
import { CRITICALITY_LABELS, BUSINESS_ENTITY_LABELS, QUOTE_TYPE_LABELS, CRITICALITY_COLORS, CRITICALITY_SHORT } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, AlertCircle, MapPin, Building2, Loader2, Pencil,
  Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Lightbulb, Eye, Share2, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils-app'
import { cn } from '@/lib/utils'
import { CostBreakdown } from '@/components/cost-breakdown'
import { businessEntityConfig, quoteTypeConfig } from '@/lib/utils-app'

// AI insights demo data — varies by quote to show realistic variety
type InsightData = {
  verdict: 'competitive' | 'above_market' | 'below_market'
  verdictLabel: string
  verdictColor: string
  summary: string
  rateComparison: { label: string; your: number; market: number; status: 'ok' | 'high' | 'low' }[]
  recommendations: string[]
  risks: string[]
  opportunities: string[]
}

const DEMO_INSIGHTS: InsightData[] = [
  {
    verdict: 'competitive',
    verdictLabel: 'Competitively Priced',
    verdictColor: 'text-green-700 bg-green-50 border-green-200',
    summary: 'Based on current UK FM market data for the London region, this quote is positioned competitively. Labour rates are aligned with BESA benchmark rates and the profit margin sits within the typical 15–20% range for hard services contracts of this scope.',
    rateComparison: [
      { label: 'Electrical (£/hr)', your: 24.2, market: 23.5, status: 'ok' },
      { label: 'Mechanical (£/hr)', your: 23.4, market: 22.8, status: 'ok' },
      { label: 'Gas (£/hr)', your: 25.1, market: 25.5, status: 'ok' },
      { label: 'Profit Margin', your: 17, market: 17.5, status: 'ok' },
    ],
    recommendations: [
      'Consider adding a 3% mobilisation contingency given the multi-site nature of this contract.',
      'Clarify SFG20 access licence costs — these are often missed in initial tenders.',
      'Year 2/3 uplift of 2% is slightly below the current RPI forecast of 2.8%; review before issue.',
    ],
    risks: [
      'Multi-site logistics not reflected in travel time allowances — confirm technician coverage.',
      'Biomass boiler servicing requires specialist certification; confirm subcontractor availability.',
    ],
    opportunities: [
      'Water hygiene monitoring scope could be extended to include statutory L8 reporting.',
      'Emergency lighting monthly visits present an opportunity to bundle reactive response coverage.',
    ],
  },
  {
    verdict: 'above_market',
    verdictLabel: 'Slightly Above Market',
    verdictColor: 'text-amber-700 bg-amber-50 border-amber-200',
    summary: 'This quote sits approximately 6–8% above typical market rates for the South East region. This is partially explained by the specialist mechanical scope, but labour uplift on standard electrical tasks appears higher than benchmarks suggest. Review before submission to avoid losing on price.',
    rateComparison: [
      { label: 'Electrical (£/hr)', your: 26.1, market: 22.8, status: 'high' },
      { label: 'Mechanical (£/hr)', your: 25.4, market: 23.2, status: 'high' },
      { label: 'A/C Engineer (£/hr)', your: 27.0, market: 25.5, status: 'ok' },
      { label: 'Profit Margin', your: 20, market: 17.5, status: 'high' },
    ],
    recommendations: [
      'Reduce electrical labour sales rate to align closer to £22–23/hr for this region.',
      'Consider splitting the tender into lots to allow competitive sub-tender on specialist scopes.',
      'A covering letter explaining the premium service model could justify above-market pricing.',
    ],
    risks: [
      'Client may use your submission as a benchmark against cheaper providers.',
      'High margin percentage may attract scrutiny on a public sector or framework tender.',
    ],
    opportunities: [
      'Strong scope coverage could be leveraged as a quality differentiator in your narrative.',
      'Consider value-adds such as a dedicated account manager to justify the premium.',
    ],
  },
  {
    verdict: 'below_market',
    verdictLabel: 'Below Market — Review Required',
    verdictColor: 'text-red-700 bg-red-50 border-red-200',
    summary: 'This quote appears to be priced 10–12% below typical UK FM market rates for the scope and region. While this may win the contract, there is a significant risk of underdelivery or margin erosion during the contract term. A full cost review is strongly recommended before submission.',
    rateComparison: [
      { label: 'Electrical (£/hr)', your: 18.5, market: 23.5, status: 'low' },
      { label: 'Mechanical (£/hr)', your: 17.8, market: 22.8, status: 'low' },
      { label: 'Support Roles', your: 240, market: 320, status: 'low' },
      { label: 'Profit Margin', your: 10, market: 17.5, status: 'low' },
    ],
    recommendations: [
      'Increase profit margin to minimum 15% to cover unforeseens and overhead absorption.',
      'Review all labour rates against current BESA / RICS published benchmarks.',
      'Add a mobilisation cost to cover initial setup, TUPE checks, and induction if applicable.',
    ],
    risks: [
      'Contract is unlikely to be profitable at current pricing — risk of loss-making delivery.',
      'No contingency buffer for reactive callouts or material price increases.',
      'Low margin contracts are harder to exit without reputational risk.',
    ],
    opportunities: [
      'Repricing to market rate could increase total contract value significantly.',
      'Client may welcome a phased approach: Year 1 at competitive rate with escalation built in.',
    ],
  },
]

const STATUS_CONFIG: Record<QuoteStatus, { label: string; bg: string; text: string }> = {
  draft:    { label: 'Draft',    bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  sent:     { label: 'Sent',     bg: 'bg-blue-100 dark:bg-blue-900',   text: 'text-blue-700 dark:text-blue-300' },
  accepted: { label: 'Accepted', bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  declined: { label: 'Declined', bg: 'bg-red-100 dark:bg-red-900',     text: 'text-red-700 dark:text-red-300' },
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<QuoteStatus>('draft')
  // AI insights — demo mode: deterministic based on quote id hash
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInsights, setAiInsights] = useState<InsightData | null>(null)

  useEffect(() => {
    const q = getQuote(id)
    setQuote(q ?? null)
    if (q) setNewStatus(q.status)
    setLoading(false)
  }, [id])

  function fetchInsights() {
    if (!quote) return
    setAiLoading(true)
    setAiInsights(null)
    // Simulate a brief loading delay then pick demo data deterministically
    setTimeout(() => {
      const hash = quote.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      const data = DEMO_INSIGHTS[hash % DEMO_INSIGHTS.length]
      setAiInsights(data)
      setAiLoading(false)
    }, 1400)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Loading quote...</p></CardContent></Card>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Quote not found.</p></CardContent></Card>
        </div>
      </div>
    )
  }

  function handleUpdateStatus() {
    if (!quote) return
    const updated = { ...quote, status: newStatus, updatedAt: new Date().toISOString() }
    saveQuote(updated)
    setQuote({ ...updated })
    setStatusDialogOpen(false)
  }

  const statusConfig = STATUS_CONFIG[quote.status]
  const ec = businessEntityConfig(quote.businessEntity ?? 'virtual_facilities_services')
  const tc = quoteTypeConfig(quote.quoteType ?? 'tender')
  const rateCard = getRateCard(quote.regionId)

  // Compute site-grouped calculations
  const sites = quote.sites && quote.sites.length > 0
    ? quote.sites
    : [{ id: 'site-default', name: quote.siteName ?? '', address: quote.siteAddress ?? '' }]

  const lineCalcs = quote.assetLines.map((l) => ({
    line: l,
    ...calcAssetLine(l, rateCard?.disciplines[l.discipline]?.salesRate ?? 0),
  }))

  const manualCalcs = (quote.manualTasks ?? []).map((t: ManualTask) => ({
    task: t,
    ...calcManualTask(t, rateCard?.disciplines[t.discipline]?.salesRate ?? 0),
  }))

  const siteGroups = sites.map((site) => ({
    site,
    lines: lineCalcs.filter((c) => c.line.siteId === site.id || (!c.line.siteId && site.id === 'site-default')),
    manuals: manualCalcs.filter((c) => c.task.siteId === site.id || (!c.task.siteId && site.id === 'site-default')),
  }))

  // Discipline summary (all sites combined)
  const disciplineSummary = Array.from(new Set(quote.assetLines.map((l) => l.discipline))).map((d) => {
    const dLines = lineCalcs.filter((c) => c.line.discipline === d)
    const sfgHrs = dLines.reduce((s, c) => s + c.totalSFGHours, 0)
    const flexHrs = dLines.reduce((s, c) => s + c.totalFlexedHours, 0)
    const cost = dLines.reduce((s, c) => s + c.annualCost, 0)
    return { discipline: d, sfgHrs, flexHrs, cost }
  })

  const vatRate = quote.vatRate ?? 20
  const vatAmount = quote.vatAmount ?? (quote.totalYear1 * vatRate / 100)
  const totalYear1IncVat = quote.totalYear1IncVat ?? (quote.totalYear1 + vatAmount)

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${ec.badge} text-xs`}>{ec.short}</Badge>
            <Badge variant="outline" className={`${tc.badge} text-xs`}>{tc.label}</Badge>
            <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)} className={cn(statusConfig.bg, statusConfig.text)}>
              <AlertCircle className="w-4 h-4 mr-1.5" />
              {statusConfig.label}
            </Button>
            <Button size="sm" asChild>
              <Link href={`/calculator?edit=${quote.id}`}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit Quote
              </Link>
            </Button>
          </div>
        </div>

        {/* Quote Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 pb-6 border-b">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reference</p>
                <p className="text-lg font-mono font-bold">{quote.reference}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Client</p>
                <p className="text-lg font-semibold truncate">{quote.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Business Entity</p>
                <p className="text-sm font-semibold">{BUSINESS_ENTITY_LABELS[quote.businessEntity ?? 'virtual_facilities_services']}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Region</p>
                <p className="text-lg font-semibold">{quote.regionName}</p>
              </div>
            </div>

            {/* Sites */}
            <div className="mb-6 pb-6 border-b">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Sites ({sites.length})</p>
              <div className="flex flex-wrap gap-2">
                {sites.map((site) => (
                  <div key={site.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-secondary/30 text-xs max-w-xs">
                    <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{site.name || 'Unnamed site'}</span>
                    {site.address && <span className="text-muted-foreground truncate hidden sm:inline">{site.address}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Year 1/2/3 Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Year 1 ex. VAT</p>
                <p className="text-2xl font-bold">{formatCurrency(quote.totalYear1)}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Year 1 inc. VAT ({vatRate}%)</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalYear1IncVat)}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Year 2 (+{quote.annualAdjustmentPct}%)</p>
                <p className="text-2xl font-bold">{formatCurrency(quote.totalYear2)}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Year 3 (+{quote.annualAdjustmentPct}%)</p>
                <p className="text-2xl font-bold">{formatCurrency(quote.totalYear3)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed content */}
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
            <TabsTrigger value="summary"       className="text-xs h-8">Summary</TabsTrigger>
            <TabsTrigger value="ppm"           className="text-xs h-8">PPM Assets</TabsTrigger>
            <TabsTrigger value="mobilisation"  className="text-xs h-8">Mobilisation</TabsTrigger>
            <TabsTrigger value="support"       className="text-xs h-8">Support</TabsTrigger>
            <TabsTrigger value="breakdown"     className="text-xs h-8">Breakdown</TabsTrigger>
            <TabsTrigger value="client"        className="text-xs h-8">Client View</TabsTrigger>
            <TabsTrigger value="ai"            className="text-xs h-8">AI Insights</TabsTrigger>
          </TabsList>

          {/* ── Summary Tab ── */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-sm mb-2">Cost Components (Before Margin):</h3>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span className="text-muted-foreground">PPM Annual Cost (SFG20):</span>
                      <span className="font-semibold">{formatCurrency(quote.ppmSubtotal)}</span>
                    </div>
                    {(quote.manualTaskSubtotal ?? 0) > 0 && (
                      <div className="flex justify-between text-sm py-1 border-b">
                        <span className="text-muted-foreground">Non-SFG20 Tasks:</span>
                        <span className="font-semibold">{formatCurrency(quote.manualTaskSubtotal ?? 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span className="text-muted-foreground">Mobilisation Costs:</span>
                      <span className="font-semibold">{formatCurrency(quote.mobilisationTotal)}</span>
                    </div>
                    {(quote.oneOffTotal ?? 0) > 0 && (
                      <div className="flex justify-between text-sm py-1 border-b">
                        <span className="text-muted-foreground">One-Off Costs:</span>
                        <span className="font-semibold">{formatCurrency(quote.oneOffTotal ?? 0)}</span>
                      </div>
                    )}
                    {quote.supportTotal > 0 && (
                      <div className="flex justify-between text-sm py-1 border-b">
                        <span className="text-muted-foreground">Support Costs:</span>
                        <span className="font-semibold">{formatCurrency(quote.supportTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t-2">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(quote.subtotalBeforeMargin)}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800 space-y-2">
                    <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">Profit Margin Applied at Quote Level:</h3>
                    <div className="flex justify-between text-sm text-blue-900 dark:text-blue-100 py-1 border-b border-blue-200 dark:border-blue-700">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(quote.subtotalBeforeMargin)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-900 dark:text-blue-100 py-1 border-b border-blue-200 dark:border-blue-700">
                      <span>+ {quote.profitMarginPct}% Profit Margin:</span>
                      <span className="font-semibold">{formatCurrency(quote.marginAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-900 dark:text-blue-100 pt-2 border-t-2 border-blue-300 dark:border-blue-600">
                      <span>Year 1 (ex. VAT):</span>
                      <span>{formatCurrency(quote.totalYear1)}</span>
                    </div>
                  </div>

                  {/* VAT Row */}
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-sm mb-2">VAT Calculation:</h3>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span className="text-muted-foreground">Year 1 (ex. VAT):</span>
                      <span className="font-semibold">{formatCurrency(quote.totalYear1)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b">
                      <span className="text-muted-foreground">+ VAT ({vatRate}%):</span>
                      <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t-2">
                      <span>Year 1 (inc. VAT):</span>
                      <span className="text-primary">{formatCurrency(totalYear1IncVat)}</span>
                    </div>
                  </div>

                  {/* Multi-Year */}
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Multi-Year Projection (ex. VAT):</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Year 1', value: quote.totalYear1, note: 'base year' },
                        { label: 'Year 2', value: quote.totalYear2, note: `×(1 + ${quote.annualAdjustmentPct}%)` },
                        { label: 'Year 3', value: quote.totalYear3, note: `×(1 + ${quote.annualAdjustmentPct}%)` },
                      ].map((yr) => (
                        <div key={yr.label} className="bg-secondary/40 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">{yr.label}</p>
                          <p className="text-sm font-bold">{formatCurrency(yr.value)}</p>
                          <p className="text-xs text-muted-foreground">{yr.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {disciplineSummary.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">By Discipline</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs font-medium">Discipline</th>
                          <th className="text-right py-2 text-xs font-medium">SFG Hours</th>
                          <th className="text-right py-2 text-xs font-medium">Flexed Hours</th>
                          <th className="text-right py-2 text-xs font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {disciplineSummary.map((s) => (
                          <tr key={s.discipline}>
                            <td className="py-2">
                              <Badge variant="outline" className={cn('text-xs py-0 px-1', DISCIPLINE_COLORS[s.discipline])}>
                                {DISCIPLINE_LABELS[s.discipline]}
                              </Badge>
                            </td>
                            <td className="text-right py-2 text-xs">{s.sfgHrs.toFixed(1)}h</td>
                            <td className="text-right py-2 text-xs">{s.flexHrs.toFixed(1)}h</td>
                            <td className="text-right py-2 text-xs font-semibold">{formatCurrency(s.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {quote.notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{quote.notes}</p></CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── PPM Assets Tab ── */}
          <TabsContent value="ppm" className="space-y-4">
            {quote.assetLines.length === 0 && (quote.manualTasks ?? []).length === 0 ? (
              <Card><CardContent className="py-8 text-center"><p className="text-sm text-muted-foreground">No PPM assets added.</p></CardContent></Card>
            ) : (
              <>
                {/* Grouped by site */}
                {siteGroups.map(({ site, lines, manuals }) => {
                  if (lines.length === 0 && manuals.length === 0) return null
                  const siteCost = lines.reduce((s, c) => s + c.annualCost, 0) + manuals.reduce((s, c) => s + c.annualCost, 0)
                  return (
                    <Card key={site.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <CardTitle className="text-base">{site.name || 'Unnamed site'}</CardTitle>
                            {site.address && <span className="text-xs text-muted-foreground">{site.address}</span>}
                          </div>
                          <span className="text-sm font-bold">{formatCurrency(siteCost)}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {lines.map(({ line, annualCost }) => (
                          <CostBreakdown
                            key={line.id}
                            assetLine={line}
                            salesRate={rateCard?.disciplines[line.discipline]?.salesRate ?? 0}
                            disciplineLabel={DISCIPLINE_LABELS[line.discipline]}
                          />
                        ))}
                        {manuals.map(({ task, annualHours, annualCost }) => (
                          <div key={task.id} className="p-3 border rounded-lg bg-amber-50/40 dark:bg-amber-950/10">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <p className="text-sm font-medium">{task.description}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <Badge variant="outline" className="text-xs py-0 bg-amber-50 text-amber-700 border-amber-200">Non-SFG20</Badge>
                                  <Badge variant="outline" className={cn('text-xs py-0', DISCIPLINE_COLORS[task.discipline])}>{DISCIPLINE_LABELS[task.discipline]}</Badge>
                                  <span>{task.hoursPerVisit}h × {task.visitsPerYear} visits/yr × {task.quantity} qty</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{formatCurrency(annualCost)}/yr</p>
                                <p className="text-xs text-muted-foreground">{annualHours.toFixed(1)}h annual</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Full asset summary table */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Asset Summary Table</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-secondary/50">
                            <th className="text-left px-3 py-2 text-xs font-medium">Service</th>
                            <th className="text-left px-3 py-2 text-xs font-medium">Site</th>
                            <th className="text-center px-2 py-2 text-xs font-medium">Disc.</th>
                            <th className="text-center px-2 py-2 text-xs font-medium">Qty</th>
                            <th className="text-center px-2 py-2 text-xs font-medium">Criticality</th>
                            <th className="text-center px-2 py-2 text-xs font-medium">Active Bands</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {quote.assetLines.map((line) => {
                            const siteName = sites.find((s) => s.id === line.siteId)?.name ?? '—'
                            return (
                              <tr key={line.id} className="hover:bg-secondary/20">
                                <td className="px-3 py-2">
                                  <div className="text-xs font-medium truncate max-w-[200px]">{line.sfgDescription}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{line.sfgCode}</div>
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{siteName}</td>
                                <td className="px-2 py-2 text-center">
                                  <Badge variant="outline" className={cn('text-xs py-0 px-1', DISCIPLINE_COLORS[line.discipline])}>
                                    {DISCIPLINE_LABELS[line.discipline].split(' ')[0]}
                                  </Badge>
                                </td>
                                <td className="px-2 py-2 text-center text-xs">{line.quantity}</td>
                                <td className="px-2 py-2 text-center">
                                  <Badge variant="outline" className={cn('text-xs py-0', CRITICALITY_COLORS[line.criticality ?? 'custom'])}>
                                    {CRITICALITY_SHORT[line.criticality ?? 'custom']}
                                  </Badge>
                                </td>
                                <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                                  {(line.activeBands ?? []).join(', ') || '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Mobilisation Tab ── */}
          <TabsContent value="mobilisation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mobilisation Costs ({quote.mobilisationCosts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {quote.mobilisationCosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No mobilisation costs.</p>
                ) : (
                  <div className="space-y-3">
                    {quote.mobilisationCosts.map((m) => {
                      const base = m.quantity * m.pricePerUnit
                      const total = m.applyMarkup ? base * (1 + m.profitMarkup / 100) : base
                      return (
                        <div key={m.id} className="p-3 border rounded-lg hover:bg-secondary/30">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium">{m.description}</p>
                            <p className="text-sm font-semibold">{formatCurrency(total)}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{m.quantity} × {m.unit}</span>
                            <span>Unit Price: {formatCurrency(m.pricePerUnit)}</span>
                            {m.applyMarkup && <Badge variant="outline" className="text-xs">+{m.profitMarkup}% markup</Badge>}
                          </div>
                        </div>
                      )
                    })}
                    {(quote.oneOffCosts ?? []).length > 0 && (
                      <>
                        <div className="pt-2">
                          <p className="text-sm font-semibold mb-2">One-Off Costs:</p>
                          {(quote.oneOffCosts ?? []).map((c) => {
                            const total = c.applyMarkup ? c.amount * (1 + c.profitMarkup / 100) : c.amount
                            return (
                              <div key={c.id} className="p-3 border rounded-lg hover:bg-secondary/30 mb-2">
                                <div className="flex items-start justify-between mb-1">
                                  <p className="text-sm font-medium">{c.description}</p>
                                  <p className="text-sm font-semibold">{formatCurrency(total)}</p>
                                </div>
                                {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-base font-bold">
                        <span>Total Mobilisation + One-Off:</span>
                        <span>{formatCurrency(quote.mobilisationTotal + (quote.oneOffTotal ?? 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Support Tab ── */}
          <TabsContent value="support" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Support Costs ({quote.supportCosts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {quote.supportCosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No support costs.</p>
                ) : (
                  <div className="space-y-3">
                    {quote.supportCosts.map((s) => {
                      const total = s.employmentCost * (1 + s.profitMarkup / 100)
                      return (
                        <div key={s.id} className="p-3 border rounded-lg hover:bg-secondary/30">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium">{s.position}</p>
                            <p className="text-sm font-semibold">{formatCurrency(total)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                            <div>Salary: {formatCurrency(s.estimatedSalary)} (FTE: {s.fte})</div>
                            <div>Employment Cost: {formatCurrency(s.employmentCost)}</div>
                            <div>NI: {s.niRate}% | Pension: {s.pensionRate}%</div>
                            <div>Markup: +{s.profitMarkup}%</div>
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-base font-bold">
                        <span>Total Support:</span>
                        <span>{formatCurrency(quote.supportTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Breakdown Tab ── */}
          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Complete Cost Breakdown & Margin Calculation</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Detailed view of how the {quote.profitMarginPct}% profit margin is applied at the quote level
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 border rounded-lg p-4 bg-secondary/30">
                  <h4 className="font-semibold text-sm mb-3">Step 1: Component Costs (Before Margin)</h4>
                  {[
                    { label: 'PPM Annual Cost (SFG20)', value: quote.ppmSubtotal },
                    { label: 'Non-SFG20 Tasks', value: quote.manualTaskSubtotal ?? 0, hide: !(quote.manualTaskSubtotal ?? 0) },
                    { label: 'Mobilisation Costs', value: quote.mobilisationTotal },
                    { label: 'One-Off Costs', value: quote.oneOffTotal ?? 0, hide: !(quote.oneOffTotal ?? 0) },
                    { label: 'Support Costs', value: quote.supportTotal, hide: !quote.supportTotal },
                  ].filter((r) => !r.hide).map((r) => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{r.label}:</span>
                      <span className="font-semibold">{formatCurrency(r.value)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex justify-between text-base font-bold">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(quote.subtotalBeforeMargin)}</span>
                  </div>
                </div>

                <div className="space-y-3 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/30">
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-3">Step 2: Apply {quote.profitMarginPct}% Profit Margin</h4>
                  <div className="space-y-2 text-sm font-mono bg-background rounded p-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>= {formatCurrency(quote.subtotalBeforeMargin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin ({quote.profitMarginPct}%)</span>
                      <span>= {formatCurrency(quote.marginAmount)}</span>
                    </div>
                    <div className="border-t border-dashed pt-2 flex justify-between font-semibold text-blue-900 dark:text-blue-100">
                      <span>Year 1 (ex. VAT)</span>
                      <span>= {formatCurrency(quote.totalYear1)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-4 bg-emerald-50 dark:bg-emerald-950/30">
                  <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100 mb-3">Step 3: Apply VAT ({vatRate}%)</h4>
                  <div className="space-y-2 text-sm font-mono bg-background rounded p-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Year 1 (ex. VAT)</span>
                      <span>= {formatCurrency(quote.totalYear1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ VAT ({vatRate}%)</span>
                      <span>= {formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="border-t border-dashed pt-2 flex justify-between font-bold text-emerald-900 dark:text-emerald-100">
                      <span>Year 1 (inc. VAT)</span>
                      <span>= {formatCurrency(totalYear1IncVat)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border rounded-lg p-4 bg-secondary/30">
                  <h4 className="font-semibold text-sm mb-3">Step 4: Multi-Year Projection ({quote.annualAdjustmentPct}% annual)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Year 1', exVat: quote.totalYear1, incVat: totalYear1IncVat },
                      { label: 'Year 2', exVat: quote.totalYear2, incVat: quote.totalYear2 * (1 + vatRate / 100) },
                      { label: 'Year 3', exVat: quote.totalYear3, incVat: quote.totalYear3 * (1 + vatRate / 100) },
                    ].map((yr) => (
                      <div key={yr.label} className="bg-background rounded p-3 text-center border">
                        <p className="text-xs text-muted-foreground mb-1">{yr.label}</p>
                        <p className="text-xs font-mono">{formatCurrency(yr.exVat)}</p>
                        <p className="text-xs text-primary font-semibold mt-0.5">{formatCurrency(yr.incVat)} inc. VAT</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Client View Tab ── */}
          <TabsContent value="client" className="space-y-4">
            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-100">
                <Eye className="w-4 h-4 flex-shrink-0" />
                <p>Client-facing view — no internal margins or cost build-ups shown.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => window.open(`/client/${quote.id}`, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Full Page
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    const url = `${window.location.origin}/client/${quote.id}`
                    if (navigator.share) {
                      navigator.share({ title: `Quote ${quote.reference}`, url })
                    } else {
                      navigator.clipboard.writeText(url).then(() => {
                        alert('Client view link copied to clipboard!')
                      })
                    }
                  }}
                >
                  <Share2 className="w-3 h-3" />
                  Share
                </Button>
              </div>
            </div>

            {/* Client document */}
            <div className="space-y-4 print:space-y-6" id="client-document">
              {/* Header */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6 pb-6 border-b">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Issued by</p>
                      </div>
                      <p className="font-bold text-base">{BUSINESS_ENTITY_LABELS[quote.businessEntity ?? 'virtual_facilities_services']}</p>
                    </div>
                    <div className="text-sm text-right">
                      <p className="text-xs text-muted-foreground mb-1">{QUOTE_TYPE_LABELS[quote.quoteType ?? 'tender']}</p>
                      <p className="font-mono font-bold text-lg">{quote.reference}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Date: {new Date(quote.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Prepared for</p>
                      <p className="font-semibold text-base">{quote.clientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Region</p>
                      <p className="font-semibold">{quote.regionName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sites */}
              <Card>
                <CardHeader><CardTitle className="text-base">Sites Covered</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sites.map((site, idx) => (
                      <div key={site.id} className="flex items-center gap-2 p-2 border rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Site {idx + 1}: {site.name || 'TBC'}</p>
                          {site.address && <p className="text-xs text-muted-foreground">{site.address}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Scope of works by site */}
              <Card>
                <CardHeader><CardTitle className="text-base">Scope of Works</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {siteGroups.map(({ site, lines, manuals }) => {
                      if (lines.length === 0 && manuals.length === 0) return null
                      return (
                        <div key={site.id}>
                          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            {site.name || 'Unnamed site'}
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-secondary/50">
                                  <th className="text-left px-3 py-2 text-xs font-medium">Service Description</th>
                                  <th className="text-left px-3 py-2 text-xs font-medium">Location</th>
                                  <th className="text-center px-2 py-2 text-xs font-medium">Qty</th>
                                  <th className="text-center px-2 py-2 text-xs font-medium">Frequency</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {lines.map(({ line }) => (
                                  <tr key={line.id} className="hover:bg-secondary/20">
                                    <td className="px-3 py-2 text-xs">{line.sfgDescription}</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">{line.location || '—'}</td>
                                    <td className="px-2 py-2 text-center text-xs">{line.quantity}</td>
                                    <td className="px-2 py-2 text-center text-xs">
                                      {(line.activeBands ?? []).join(', ') || '—'}
                                    </td>
                                  </tr>
                                ))}
                                {manuals.map(({ task }) => (
                                  <tr key={task.id} className="hover:bg-secondary/20">
                                    <td className="px-3 py-2 text-xs">{task.description}</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">{task.location || '—'}</td>
                                    <td className="px-2 py-2 text-center text-xs">{task.quantity}</td>
                                    <td className="px-2 py-2 text-center text-xs">{task.visitsPerYear}× per year</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Client Pricing */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">
                    {quote.quoteType === 'tender' ? 'Contract Pricing' : 'Quotation'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quote.quoteType === 'tender' ? (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: 'Year 1', value: quote.totalYear1, incVat: totalYear1IncVat },
                            { label: 'Year 2', value: quote.totalYear2, incVat: quote.totalYear2 * (1 + vatRate / 100) },
                            { label: 'Year 3', value: quote.totalYear3, incVat: quote.totalYear3 * (1 + vatRate / 100) },
                          ].map((yr) => (
                            <div key={yr.label} className="p-3 border rounded-lg text-center">
                              <p className="text-xs text-muted-foreground mb-1">{yr.label}</p>
                              <p className="text-base font-bold">{formatCurrency(yr.value)}</p>
                              <p className="text-xs text-muted-foreground">ex. VAT</p>
                              <p className="text-xs font-semibold text-primary mt-1">{formatCurrency(yr.incVat)} inc. VAT</p>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Annual adjustment rate of {quote.annualAdjustmentPct}% applies from Year 2 onwards. All prices exclusive of VAT unless stated.
                        </div>
                      </>
                    ) : (
                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Total (ex. VAT)</p>
                            <p className="text-2xl font-bold">{formatCurrency(quote.totalYear1)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total (inc. VAT)</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(totalYear1IncVat)}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          VAT at {vatRate}% = {formatCurrency(vatAmount)}. This is a one-off price for the works described above.
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {quote.notes && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Notes & Exclusions</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── AI Insights Tab ── */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI Market Intelligence
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI analysis of whether this quote is competitively priced against UK FM market benchmarks.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={fetchInsights}
                    disabled={aiLoading}
                    className="gap-2"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {aiInsights ? 'Refresh' : 'Generate Insights'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!aiInsights && !aiLoading && (
                  <div className="py-10 text-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">No insights generated yet.</p>
                    <p className="text-xs text-muted-foreground">Click "Generate Insights" to see a market competitiveness analysis for this quote.</p>
                  </div>
                )}
                {aiLoading && (
                  <div className="py-10 text-center">
                    <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-muted-foreground">Analysing quote against UK FM market benchmarks...</p>
                  </div>
                )}
                {aiInsights && !aiLoading && (
                  <div className="space-y-5">
                    {/* Verdict banner */}
                    <div className={`flex items-start gap-3 p-4 rounded-lg border ${aiInsights.verdictColor}`}>
                      {aiInsights.verdict === 'competitive' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />}
                      {aiInsights.verdict === 'above_market' && <TrendingUp className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />}
                      {aiInsights.verdict === 'below_market' && <TrendingDown className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />}
                      <div>
                        <p className="font-semibold text-sm">{aiInsights.verdictLabel}</p>
                        <p className="text-xs mt-1 leading-relaxed">{aiInsights.summary}</p>
                      </div>
                    </div>

                    {/* Rate comparison */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rate Comparison vs. Market</p>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-secondary/50 border-b">
                              <th className="text-left px-3 py-2 font-medium">Category</th>
                              <th className="text-right px-3 py-2 font-medium">Your Quote</th>
                              <th className="text-right px-3 py-2 font-medium">Market Avg.</th>
                              <th className="text-center px-3 py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {aiInsights.rateComparison.map((row) => (
                              <tr key={row.label} className="hover:bg-secondary/20">
                                <td className="px-3 py-2">{row.label}</td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {row.label.includes('%') || row.label.includes('Margin') ? `${row.your}%` : `£${row.your}`}
                                </td>
                                <td className="px-3 py-2 text-right text-muted-foreground">
                                  {row.label.includes('%') || row.label.includes('Margin') ? `${row.market}%` : `£${row.market}`}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {row.status === 'ok' && <span className="inline-flex items-center gap-1 text-green-700"><Minus className="w-3 h-3" />In range</span>}
                                  {row.status === 'high' && <span className="inline-flex items-center gap-1 text-amber-700"><TrendingUp className="w-3 h-3" />Above</span>}
                                  {row.status === 'low' && <span className="inline-flex items-center gap-1 text-red-700"><TrendingDown className="w-3 h-3" />Below</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Three columns: Recommendations, Risks, Opportunities */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" />Recommendations
                        </p>
                        <ul className="space-y-2">
                          {aiInsights.recommendations.map((r, i) => (
                            <li key={i} className="text-xs leading-relaxed p-2.5 rounded-lg border bg-secondary/20">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />Risks
                        </p>
                        <ul className="space-y-2">
                          {aiInsights.risks.map((r, i) => (
                            <li key={i} className="text-xs leading-relaxed p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-green-600" />Opportunities
                        </p>
                        <ul className="space-y-2">
                          {aiInsights.opportunities.map((r, i) => (
                            <li key={i} className="text-xs leading-relaxed p-2.5 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground pt-3 border-t">
                      Demo insights based on UK FM market benchmarks (BESA, RICS 2024). For guidance purposes only — figures are illustrative.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote data context */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Quote Data Used for Analysis</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: 'Contract Value (Yr 1 ex. VAT)', value: formatCurrency(quote.totalYear1) },
                    { label: 'Profit Margin', value: `${quote.profitMarginPct}%` },
                    { label: 'Number of Sites', value: String(sites.length) },
                    { label: 'Total Assets', value: `${quote.assetLines.length + (quote.manualTasks ?? []).length}` },
                    { label: 'Type', value: QUOTE_TYPE_LABELS[quote.quoteType ?? 'tender'] },
                    { label: 'Region', value: quote.regionName },
                    { label: 'Annual Adjustment', value: `+${quote.annualAdjustmentPct}%` },
                    { label: 'VAT Rate', value: `${vatRate}%` },
                  ].map((item) => (
                    <div key={item.label} className="p-2 border rounded-lg">
                      <p className="text-muted-foreground">{item.label}</p>
                      <p className="font-semibold mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Change the current status of this quote or tender.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as QuoteStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleUpdateStatus} size="sm">Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
