// ── Discipline / Role ────────────────────────────────────────────────────────

export type Discipline =
  | 'electrical'
  | 'mechanical'
  | 'gas'
  | 'ac_refrigeration'
  | 'fabric'
  | 'me'
  | 'water_hygiene'

// ── Business Entities ────────────────────────────────────────────────────────

export type BusinessEntity =
  | 'virtual_facilities_management'
  | 'virtual_water_services'
  | 'virtual_facilities_services'

export const BUSINESS_ENTITY_LABELS: Record<BusinessEntity, string> = {
  virtual_facilities_management: 'Virtual Facilities Management',
  virtual_water_services:        'Virtual Water Services',
  virtual_facilities_services:   'Virtual Facilities Services',
}

export const BUSINESS_ENTITY_SHORT: Record<BusinessEntity, string> = {
  virtual_facilities_management: 'VFM',
  virtual_water_services:        'VWS',
  virtual_facilities_services:   'VFS',
}

export const BUSINESS_ENTITIES: BusinessEntity[] = [
  'virtual_facilities_management',
  'virtual_water_services',
  'virtual_facilities_services',
]

// ── Quote Type ───────────────────────────────────────────────────────────────

export type QuoteType = 'tender' | 'quote'

export const QUOTE_TYPE_LABELS: Record<QuoteType, string> = {
  tender: 'Tender / Proposal',
  quote:  'Quote / Small Work',
}

export const QUOTE_TYPE_DESCRIPTIONS: Record<QuoteType, string> = {
  tender: 'Ongoing planned maintenance contract (continuous)',
  quote:  'One-off job or reactive repair (single event)',
}

// ── SFG20 Task from the library ──────────────────────────────────────────────

export interface SFG20Task {
  id: string
  code: string
  section: string
  sectionCode: string
  description: string
  discipline: Discipline
  sfgHours: {
    '1W'?: number
    '1M'?: number
    '2M'?: number
    '3M'?: number
    '4M'?: number
    '5M'?: number
    '6M'?: number
    '12M'?: number
    '12M-5Y'?: number
  }
  notes?: string
}

export type FrequencyBand = '1W' | '1M' | '2M' | '3M' | '4M' | '5M' | '6M' | '12M'

export const VISITS_PER_YEAR: Record<FrequencyBand, number> = {
  '1W':  52,
  '1M':  12,
  '2M':   6,
  '3M':   4,
  '4M':   3,
  '5M':   2.4,
  '6M':   2,
  '12M':  1,
}

// ── Criticality ──────────────────────────────────────────────────────────────

// Criticality determines which frequency bands of an SFG20 task are active.
// The bands available for a task come from its sfgHours object.
// The user selects one criticality level; we compute the active bands from that.
// Red = Statutory & Mandatory (most frequent / all bands)
// Amber = Business Critical (all but most frequent)
// Pink = Recommended (quarterly+)
// Green = Low priority (6M+)
export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low' | 'custom'

export const CRITICALITY_LABELS: Record<CriticalityLevel, string> = {
  critical: 'Red – Statutory & Mandatory',
  high:     'Amber – Business Critical',
  medium:   'Pink – Recommended',
  low:      'Green – Low Priority',
  custom:   'Custom',
}

export const CRITICALITY_SHORT: Record<CriticalityLevel, string> = {
  critical: 'Red',
  high:     'Amber',
  medium:   'Pink',
  low:      'Green',
  custom:   'Custom',
}

export const CRITICALITY_COLORS: Record<CriticalityLevel, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  high:     'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  medium:   'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  low:      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  custom:   'bg-secondary text-secondary-foreground border-border',
}

// Given the available bands on a task, return which ones are active per criticality.
// Red = all bands, Amber = all but most frequent, Pink = quarterly+, Green = 6M+, Custom = user picks.
export function getCriticalityBands(
  availableBands: FrequencyBand[],
  level: CriticalityLevel
): FrequencyBand[] {
  if (level === 'custom') return availableBands
  const ordered: FrequencyBand[] = ['1W', '1M', '2M', '3M', '4M', '6M', '12M']
  const present = ordered.filter((b) => availableBands.includes(b))
  if (level === 'critical') return present
  if (level === 'high') return present.filter((_, i) => i >= Math.min(1, present.length - 1))
  if (level === 'medium') {
    const cutoff: FrequencyBand[] = ['3M', '4M', '6M', '12M']
    const filtered = present.filter((b) => cutoff.includes(b))
    return filtered.length > 0 ? filtered : present.slice(-1)
  }
  if (level === 'low') {
    const cutoff: FrequencyBand[] = ['6M', '12M']
    const filtered = present.filter((b) => cutoff.includes(b))
    return filtered.length > 0 ? filtered : present.slice(-1)
  }
  return present
}

// ── Site ─────────────────────────────────────────────────────────────────────

export interface Site {
  id: string
  name: string
  address: string
}

// ── Asset Register Line ──────────────────────────────────────────────────────

export interface AssetLine {
  id: string
  siteId: string            // which site this asset belongs to
  discipline: Discipline
  location: string
  service: string
  makeModel: string
  quantity: number
  sfgCode: string
  sfgDescription: string
  sfgHours: Record<FrequencyBand, number>
  efficiencyFactor: Record<FrequencyBand, number>
  activeBands: FrequencyBand[]  // bands included in pricing (from criticality)
  criticality: CriticalityLevel
  isManual: false          // always false for SFG20 tasks
}

// ── Manual Task ──────────────────────────────────────────────────────────────

export interface ManualTask {
  id: string
  siteId: string
  description: string
  discipline: Discipline
  location: string
  makeModel: string
  quantity: number
  hoursPerVisit: number
  visitsPerYear: number
  efficiencyFactor: number
}

// Derived per line, computed on the fly
export interface AssetLineCalc {
  line: AssetLine
  annualHoursByBand: Record<FrequencyBand, number>
  totalSFGHours: number
  totalFlexedHours: number
  annualCost: number
}

// ── Rate Card ────────────────────────────────────────────────────────────────

export interface DisciplineRates {
  baseRate: number
  salesRate: number
  ot15Rate: number
  ot2Rate: number
}

export type RateCard = {
  regionId: string
  disciplines: Record<Discipline, DisciplineRates>
  overheadAndProfitLabour: number
  overheadAndProfitMaterials: number
  sfgEfficiencyIndex: number
}

// ── Role Rate ─────────────────────────────────────────────────────────────────

export interface RoleRate {
  id: string
  position: string
  dayRate: number    // day rate charged to client
  baseRate: number   // internal cost
  isCustom: boolean
}

// ── Mobilisation Costs ───────────────────────────────────────────────────────

export interface MobilisationCost {
  id: string
  description: string
  quantity: number
  unit: string
  pricePerUnit: number
  applyMarkup: boolean
  profitMarkup: number
}

// ── One-Off Cost ─────────────────────────────────────────────────────���────────

export interface OneOffCost {
  id: string
  description: string
  amount: number
  applyMarkup: boolean
  profitMarkup: number
  notes?: string
}

// ── Contract Support Costs ───────────────────────────────────────────────────

export interface SupportCost {
  id: string
  position: string
  daysRequiredPA: number
  fte: number
  estimatedSalary: number
  car: number
  fuelEstimate: number
  niRate: number
  pensionRate: number
  employmentCost: number
  shareOfTotal: number
  profitMarkup: number
  costFactoredIn: number
}

// ── App Settings ──────────────────────────────────────────────────────────────

export interface AppSettings {
  vatRate: number            // e.g. 20 (%)
  defaultProfitMarginPct: number
  defaultAnnualAdjustmentPct: number
  defaultMobilisationMarkup: number
  companyName: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  vatRate: 20,
  defaultProfitMarginPct: 17,
  defaultAnnualAdjustmentPct: 2,
  defaultMobilisationMarkup: 13.64,
  companyName: 'Virtual FM Group',
}

// ── Quote ────────────────────────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined'

export interface Quote {
  id: string
  reference: string
  quoteType: QuoteType
  businessEntity: BusinessEntity
  clientName: string
  // Multi-site
  sites: Site[]
  // Legacy single-site fields (kept for backward compat, derived from sites[0])
  siteName: string
  siteAddress: string
  regionId: string
  regionName: string
  status: QuoteStatus
  // Pricing inputs
  assetLines: AssetLine[]
  manualTasks: ManualTask[]
  mobilisationCosts: MobilisationCost[]
  supportCosts: SupportCost[]
  oneOffCosts: OneOffCost[]
  // Summary figures (computed and stored)
  ppmSubtotal: number
  manualTaskSubtotal: number
  mobilisationTotal: number
  supportTotal: number
  oneOffTotal: number
  subtotalBeforeMargin: number
  profitMarginPct: number
  marginAmount: number
  markupPct: number
  annualAdjustmentPct: number
  // VAT
  vatRate: number
  vatAmount: number
  totalYear1: number
  totalYear2: number
  totalYear3: number
  // VAT-inclusive totals
  totalYear1IncVat: number
  totalYear2IncVat: number
  totalYear3IncVat: number
  notes: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface Region {
  id: string
  name: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'pricing_manager' | 'viewer'
  initials: string
}
