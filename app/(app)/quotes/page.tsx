'use client'

import { useState, useEffect } from 'react'
import { getQuotes, deleteQuote, saveQuote } from '@/lib/store'
import type { Quote, QuoteStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreHorizontal, Eye, Trash2,
  CheckCircle, Send, XCircle, MapPin, FileText, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import {
  formatCurrency, statusConfig, formatDate,
  quoteTypeConfig, businessEntityConfig,
} from '@/lib/utils-app'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: { value: QuoteStatus | 'all'; label: string }[] = [
  { value: 'all',      label: 'All Statuses' },
  { value: 'draft',    label: 'Draft' },
  { value: 'sent',     label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
]

const TYPE_FILTERS = [
  { value: 'all',    label: 'All Types' },
  { value: 'tender', label: 'Tender / Proposal' },
  { value: 'quote',  label: 'Small Work' },
]

const ENTITY_FILTERS = [
  { value: 'all',                           label: 'All Entities' },
  { value: 'virtual_facilities_services',   label: 'VFS' },
  { value: 'virtual_water_services',        label: 'VWS' },
]

const SUMMARY_CARD_CLASSES = 'rounded-xl border bg-card p-4 flex flex-col gap-1'

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')

  function reload() { setQuotes(getQuotes()) }
  useEffect(() => { reload() }, [])

  function handleDelete(id: string) {
    if (!confirm('Delete this quote? This cannot be undone.')) return
    deleteQuote(id)
    reload()
  }

  function updateStatus(quote: Quote, status: QuoteStatus) {
    saveQuote({ ...quote, status, updatedAt: new Date().toISOString() })
    reload()
  }

  const filtered = quotes.filter((q) => {
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    const matchType = typeFilter === 'all' || q.quoteType === typeFilter
    const matchEntity = entityFilter === 'all' || q.businessEntity === entityFilter
    const qStr = search.toLowerCase()
    const matchSearch =
      !qStr ||
      q.clientName.toLowerCase().includes(qStr) ||
      (q.sites ?? []).some((s) => s.name.toLowerCase().includes(qStr)) ||
      q.siteName?.toLowerCase().includes(qStr) ||
      q.reference.toLowerCase().includes(qStr)
    return matchStatus && matchType && matchEntity && matchSearch
  })

  const totalExVat   = filtered.reduce((s, q) => s + q.totalYear1, 0)
  const totalIncVat  = filtered.reduce((s, q) => s + (q.totalYear1IncVat ?? q.totalYear1 * 1.2), 0)
  const acceptedVal  = filtered.filter((q) => q.status === 'accepted').reduce((s, q) => s + q.totalYear1, 0)
  const pendingCount = filtered.filter((q) => q.status === 'sent').length

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="px-12 pt-6 pb-4 border-b bg-background">
        <div className="flex items-center justify-between gap-4 max-w-screen-xl mx-auto">
          <div>
            <h1 className="text-lg font-semibold">Quotes &amp; Tenders</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {quotes.length} total &middot; {filtered.length} shown
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/calculator">
              <Plus className="w-4 h-4 mr-1.5" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-12 py-7 max-w-screen-xl mx-auto flex flex-col gap-y-7">
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={SUMMARY_CARD_CLASSES}>
              <p className="text-xs text-muted-foreground font-medium">
                Pipeline (ex. VAT)
              </p>
              <p className="text-xl font-bold tabular-nums">
                {formatCurrency(totalExVat)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalIncVat)} inc. VAT
              </p>
            </div>
            <div className={SUMMARY_CARD_CLASSES}>
              <p className="text-xs text-muted-foreground font-medium">
                Won Value
              </p>
              <p className="text-xl font-bold tabular-nums text-emerald-600">
                {formatCurrency(acceptedVal)}
              </p>
              <p className="text-xs text-muted-foreground">
                {filtered.filter((q) => q.status === "accepted").length}{" "}
                accepted
              </p>
            </div>
            <div className={SUMMARY_CARD_CLASSES}>
              <p className="text-xs text-muted-foreground font-medium">
                Awaiting Decision
              </p>
              <p className="text-xl font-bold tabular-nums text-blue-600">
                {pendingCount}
              </p>
              <p className="text-xs text-muted-foreground">sent to clients</p>
            </div>
            <div className={SUMMARY_CARD_CLASSES}>
              <p className="text-xs text-muted-foreground font-medium">
                Win Rate
              </p>
              <p className="text-xl font-bold tabular-nums">
                {quotes.filter((q) => q.status !== "draft").length > 0
                  ? `${Math.round((quotes.filter((q) => q.status === "accepted").length / quotes.filter((q) => q.status !== "draft").length) * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">of submitted</p>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="grid grid-cols-5 gap-3">
            <div className="relative w-full col-span-2 h-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search client, site, reference..."
                className="pl-8 w-full text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as QuoteStatus | "all")}
            >
              <SelectTrigger className=" grid-cols-1 w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="grid-cols-1 w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="grid-cols-1 w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Table ── */}
          <div className="rounded-xl border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[minmax(0,2fr)_100px_80px_80px_130px_130px_40px] items-center bg-muted/50 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>Client / Site</span>
              <span>Entity &amp; Type</span>
              <span className="text-center">Status</span>
              <span className="text-center">Sites</span>
              <span className="text-right">Yr 1 ex. VAT</span>
              <span className="pl-2">Created</span>
              <span />
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {quotes.length === 0
                      ? "No quotes yet"
                      : "No quotes match your filters"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {quotes.length === 0
                      ? "Create your first quote to get started."
                      : "Try adjusting the search or filters above."}
                  </p>
                </div>
                {quotes.length === 0 && (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/calculator">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      New Quote
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((q) => {
                  const sc = statusConfig(q.status);
                  const tc = quoteTypeConfig(q.quoteType ?? "tender");
                  const ec = businessEntityConfig(
                    q.businessEntity ?? "virtual_facilities_services",
                  );
                  const siteCount = (q.sites ?? []).length || 1;
                  const primarySite = q.sites?.[0]?.name || q.siteName || null;
                  const year2 =
                    q.totalYear1 * (1 + (q.annualAdjustmentPct ?? 2) / 100);

                  return (
                    <Link
                      key={q.id}
                      href={`/quotes/${q.id}`}
                      className="grid grid-cols-[minmax(0,2fr)_100px_80px_80px_130px_130px_40px] items-center gap-0 px-4 py-3 hover:bg-muted/30 transition-colors group"
                    >
                      {/* Client / site */}
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-medium truncate leading-tight">
                          {q.clientName}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {primarySite && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground truncate max-w-[220px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{primarySite}</span>
                            </span>
                          )}
                          {siteCount > 1 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1 py-0 h-4 leading-none"
                            >
                              +{siteCount - 1}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground/60 ml-1 flex-shrink-0">
                            {q.reference}
                          </span>
                        </div>
                      </div>

                      {/* Entity & type */}
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4 leading-none font-medium",
                            ec.badge,
                          )}
                        >
                          {ec.short}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4 leading-none",
                            tc.badge,
                          )}
                        >
                          {tc.label}
                        </Badge>
                      </div>

                      {/* Status */}
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                            sc.badge,
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              sc.dot,
                            )}
                          />
                          {sc.label}
                        </span>
                      </div>

                      {/* Sites count */}
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{siteCount}</span>
                      </div>

                      {/* Pricing */}
                      <div className="text-right pr-1">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(q.totalYear1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums leading-tight">
                          {formatCurrency(
                            q.totalYear1IncVat ?? q.totalYear1 * 1.2,
                          )}{" "}
                          inc. VAT
                        </p>
                        {q.annualAdjustmentPct && (
                          <p className="text-[10px] text-muted-foreground/70 tabular-nums flex items-center justify-end gap-0.5 mt-0.5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Yr 2: {formatCurrency(year2)}
                          </p>
                        )}
                      </div>

                      {/* Created */}
                      <div className="pl-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(q.createdAt)}
                        </p>
                        {q.notes && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate max-w-[110px]">
                            {q.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions — stop propagation so click doesn't navigate */}
                      <div
                        className="flex justify-end"
                        onClick={(e) => e.preventDefault()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/quotes/${q.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View / Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {q.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => updateStatus(q, "sent")}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {(q.status === "sent" || q.status === "draft") && (
                              <DropdownMenuItem
                                onClick={() => updateStatus(q, "accepted")}
                              >
                                <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                                Mark as Accepted
                              </DropdownMenuItem>
                            )}
                            {q.status === "sent" && (
                              <DropdownMenuItem
                                onClick={() => updateStatus(q, "declined")}
                              >
                                <XCircle className="w-4 h-4 mr-2 text-red-500" />
                                Mark as Declined
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(q.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="grid grid-cols-[minmax(0,2fr)_100px_80px_80px_130px_130px_40px] items-center bg-muted/30 border-t px-4 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium">
                  {filtered.length} document{filtered.length !== 1 ? "s" : ""}
                </span>
                <span />
                <span />
                <span />
                <div className="text-right pr-1">
                  <p className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(totalExVat)}
                  </p>
                  <p className="text-[10px] tabular-nums">
                    {formatCurrency(totalIncVat)} inc. VAT
                  </p>
                </div>
                <span />
                <span />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
