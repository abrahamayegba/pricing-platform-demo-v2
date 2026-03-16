import type { QuoteStatus, QuoteType, BusinessEntity } from './types'

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
}

export function formatCurrencyDecimal(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`
}

export function statusConfig(status: QuoteStatus) {
  const map: Record<QuoteStatus, { label: string; badge: string; dot: string }> = {
    draft:    { label: 'Draft',    badge: 'bg-secondary text-secondary-foreground border-border',    dot: 'bg-muted-foreground' },
    sent:     { label: 'Sent',     badge: 'bg-blue-50 text-blue-700 border-blue-200',                dot: 'bg-blue-500' },
    accepted: { label: 'Accepted', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',       dot: 'bg-emerald-500' },
    declined: { label: 'Declined', badge: 'bg-red-50 text-red-700 border-red-200',                  dot: 'bg-red-500' },
  }
  return map[status]
}

export function quoteTypeConfig(type: QuoteType) {
  const map: Record<QuoteType, { label: string; badge: string }> = {
    tender: { label: 'Tender',     badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    quote:  { label: 'Small Work', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  return map[type]
}

export function businessEntityConfig(entity: BusinessEntity) {
  const map: Record<BusinessEntity, { label: string; short: string; badge: string }> = {
    virtual_facilities_management: { label: 'Virtual Facilities Management', short: 'VFM', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    virtual_water_services:        { label: 'Virtual Water Services',        short: 'VWS', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
    virtual_facilities_services:   { label: 'Virtual Facilities Services',   short: 'VFS', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }
  return map[entity]
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function pctDiff(base: number, sales: number): string {
  if (base === 0) return '—'
  const diff = ((sales - base) / base) * 100
  return `+${diff.toFixed(1)}%`
}
