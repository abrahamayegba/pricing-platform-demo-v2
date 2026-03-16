'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getQuote, getRateCard, calcAssetLine, calcManualTask } from '@/lib/store'
import type { Quote, ManualTask } from '@/lib/types'
import { BUSINESS_ENTITY_LABELS, QUOTE_TYPE_LABELS } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2, MapPin, ArrowLeft, Share2, Printer, CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils-app'
import { businessEntityConfig } from '@/lib/utils-app'
import { cn } from '@/lib/utils'

const BAND_FREQ_LABELS: Record<string, string> = {
  '1W': 'Weekly', '1M': 'Monthly', '2M': 'Every 2 months',
  '3M': 'Quarterly', '4M': 'Every 4 months', '5M': 'Every 5 months',
  '6M': 'Bi-Annual', '12M': 'Annual',
}

export default function ClientViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const q = getQuote(id)
    setQuote(q ?? null)
    setLoading(false)
  }, [id])

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: `Quote ${quote?.reference}`, url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-sm mb-4">Quote not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
      </div>
    )
  }

  const rateCard = getRateCard(quote.regionId)
  const ec = businessEntityConfig(quote.businessEntity ?? 'virtual_facilities_management')
  const vatRate = quote.vatRate ?? 20
  const vatAmount = quote.vatAmount ?? (quote.totalYear1 * vatRate / 100)
  const totalYear1IncVat = quote.totalYear1IncVat ?? (quote.totalYear1 + vatAmount)

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

  const issueDate = new Date(quote.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white font-sans">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b px-4 py-2.5 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-xs h-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Quote
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={handleShare}>
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied!' : 'Share'}
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 py-8 print:px-8 print:py-4 space-y-6">

        {/* Letterhead */}
        <Card className="print:shadow-none print:border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4 pb-6 border-b mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Issued by</p>
                </div>
                <p className="text-xl font-bold">{BUSINESS_ENTITY_LABELS[quote.businessEntity ?? 'virtual_facilities_management']}</p>
                <Badge variant="outline" className={cn('mt-1.5 text-xs', ec.badge)}>{ec.short}</Badge>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{QUOTE_TYPE_LABELS[quote.quoteType ?? 'tender']}</p>
                <p className="font-mono font-bold text-2xl text-primary">{quote.reference}</p>
                <p className="text-xs text-muted-foreground mt-1">Issued: {issueDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Prepared for</p>
                <p className="font-semibold text-base">{quote.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Region</p>
                <p className="font-semibold">{quote.regionName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sites</p>
                <p className="font-semibold">{sites.length} site{sites.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sites covered */}
        <Card className="print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sites Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sites.map((site, idx) => (
                <div key={site.id} className="flex items-start gap-2 p-3 border rounded-lg bg-secondary/20">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Site {idx + 1}: {site.name || 'TBC'}</p>
                    {site.address && <p className="text-xs text-muted-foreground mt-0.5 break-words">{site.address}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scope of works */}
        <Card className="print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scope of Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {siteGroups.map(({ site, lines, manuals }) => {
                if (lines.length === 0 && manuals.length === 0) return null
                return (
                  <div key={site.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-semibold">{site.name || 'Unnamed site'}</p>
                      {site.address && <span className="text-xs text-muted-foreground hidden sm:block truncate">— {site.address}</span>}
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-secondary/50 border-b">
                            <th className="text-left px-3 py-2.5 text-xs font-semibold">Service Description</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold hidden sm:table-cell">Location</th>
                            <th className="text-center px-2 py-2.5 text-xs font-semibold">Qty</th>
                            <th className="text-center px-2 py-2.5 text-xs font-semibold">Frequency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lines.map(({ line }) => (
                            <tr key={line.id} className="hover:bg-secondary/10">
                              <td className="px-3 py-2.5 text-xs font-medium">{line.sfgDescription}</td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{line.location || '—'}</td>
                              <td className="px-2 py-2.5 text-center text-xs">{line.quantity}</td>
                              <td className="px-2 py-2.5 text-center text-xs">
                                {(line.activeBands ?? [])
                                  .map((b) => BAND_FREQ_LABELS[b] ?? b)
                                  .join(', ') || '—'}
                              </td>
                            </tr>
                          ))}
                          {manuals.map(({ task }) => (
                            <tr key={task.id} className="hover:bg-secondary/10">
                              <td className="px-3 py-2.5 text-xs font-medium">{task.description}</td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{task.location || '—'}</td>
                              <td className="px-2 py-2.5 text-center text-xs">{task.quantity}</td>
                              <td className="px-2 py-2.5 text-center text-xs">{task.visitsPerYear}× per year</td>
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

        {/* Pricing */}
        <Card className="border-2 border-primary/20 print:shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {quote.quoteType === 'tender' ? 'Contract Pricing' : 'Quotation Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quote.quoteType === 'tender' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Year 1', exVat: quote.totalYear1, incVat: totalYear1IncVat, highlight: true },
                    { label: 'Year 2', exVat: quote.totalYear2, incVat: quote.totalYear2 * (1 + vatRate / 100), highlight: false },
                    { label: 'Year 3', exVat: quote.totalYear3, incVat: quote.totalYear3 * (1 + vatRate / 100), highlight: false },
                  ].map((yr) => (
                    <div
                      key={yr.label}
                      className={cn(
                        'p-4 rounded-xl border text-center',
                        yr.highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'
                      )}
                    >
                      <p className="text-xs text-muted-foreground font-medium mb-1">{yr.label}</p>
                      <p className={cn('font-bold', yr.highlight ? 'text-2xl text-primary' : 'text-xl')}>
                        {formatCurrency(yr.exVat)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">ex. VAT</p>
                      <p className="text-xs font-semibold text-primary mt-2">{formatCurrency(yr.incVat)}</p>
                      <p className="text-xs text-muted-foreground">inc. VAT</p>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground pt-3 border-t space-y-1">
                  <p>Annual adjustment rate of {quote.annualAdjustmentPct}% applies from Year 2 onwards.</p>
                  <p>All prices exclusive of VAT unless stated. VAT at {vatRate}% = {formatCurrency(vatAmount)} (Year 1).</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-secondary/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total (ex. VAT)</p>
                    <p className="text-2xl font-bold">{formatCurrency(quote.totalYear1)}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total (inc. VAT)</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalYear1IncVat)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground border-t pt-3">
                  VAT at {vatRate}% = {formatCurrency(vatAmount)}. This is a one-off price for the scope described above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card className="print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes & Exclusions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 pb-8 border-t space-y-1">
          <p>{BUSINESS_ENTITY_LABELS[quote.businessEntity ?? 'virtual_facilities_management']} — {quote.reference} — {issueDate}</p>
          <p>This document is confidential and prepared exclusively for {quote.clientName}.</p>
        </div>
      </div>
    </div>
  )
}
