// ── Discriminated Union Types ────────────────────────────────────────────────
// These align with Prisma models but are used in Express/API layer

// USER & AUTH
export type UserRole = 'admin' | 'pricing_manager' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  initials: string
  createdAt: Date
  updatedAt: Date
}

// For login/signup payloads
export interface UserCreatePayload {
  name: string
  email: string
  password: string // plain text, will be hashed
  role?: UserRole
}

export interface UserUpdatePayload {
  name?: string
  email?: string
  password?: string // new password, hashed
}

// JWT payload
export interface JWTPayload {
  userId: string
  role: UserRole
  iat: number
  exp: number
}

// ────────────────────────────────────────────────────────────────────────────

// REGIONS & RATE CARDS

export interface Region {
  id: string
  name: string
}

export type Discipline =
  | 'electrical'
  | 'mechanical'
  | 'gas'
  | 'ac_refrigeration'
  | 'fabric'
  | 'me'
  | 'water_hygiene'

export interface DisciplineRate {
  id: string
  rateCardId: string
  discipline: Discipline
  baseRate: number
  salesRate: number
  ot15Rate: number
  ot2Rate: number
  createdAt: Date
  updatedAt: Date
}

export interface RateCard {
  id: string
  regionId: string
  overheadAndProfitLabour: number
  overheadAndProfitMaterials: number
  sfgEfficiencyIndex: number
  createdAt: Date
  updatedAt: Date
  // Relations (populated on GET)
  disciplines?: DisciplineRate[]
}

// Update payload: admin/pricing_manager can update overhead/sfg efficiency
export interface RateCardUpdatePayload {
  overheadAndProfitLabour?: number
  overheadAndProfitMaterials?: number
  sfgEfficiencyIndex?: number
  disciplines?: {
    discipline: Discipline
    baseRate: number
    salesRate: number
    ot15Rate: number
    ot2Rate: number
  }[]
}

// ────────────────────────────────────────────────────────────────────────────

// SFG20 TASK LIBRARY

export type FrequencyBand = '1W' | '1M' | '2M' | '3M' | '4M' | '6M' | '12M'

export interface SFG20FrequencyHour {
  id: string
  sfg20TaskId: string
  frequencyBand: FrequencyBand
  hoursPerVisit: number
  createdAt: Date
  updatedAt: Date
}

export interface SFG20Task {
  id: string
  code: string
  section: string
  sectionCode: string
  discipline: Discipline
  description: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  // Relations (populated on GET)
  frequencyHours?: SFG20FrequencyHour[]
}

export interface SFG20TaskCreatePayload {
  code: string
  section: string
  sectionCode: string
  discipline: Discipline
  description: string
  notes?: string
  frequencyHours: {
    frequencyBand: FrequencyBand
    hoursPerVisit: number
  }[]
}

// ────────────────────────────────────────────────────────────────────────────

// QUOTE & ASSET LINES

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined'

export interface AssetLineEfficiency {
  id: string
  assetLineId: string
  frequencyBand: FrequencyBand
  efficiencyFactor: number
  createdAt: Date
  updatedAt: Date
}

export interface AssetLine {
  id: string
  quoteId: string
  discipline: Discipline
  location: string
  service: string
  makeModel: string
  quantity: number
  sfg20TaskId: string
  createdAt: Date
  updatedAt: Date
  // Relations
  sfg20Task?: SFG20Task
  efficiencyFactors?: AssetLineEfficiency[]
}

export interface AssetLineCreatePayload {
  discipline: Discipline
  location: string
  service: string
  makeModel: string
  quantity: number
  sfg20TaskId: string
  efficiencyFactors?: {
    frequencyBand: FrequencyBand
    efficiencyFactor: number
  }[]
}

// ────────────────────────────────────────────────────────────────────────────

export interface MobilisationCost {
  id: string
  quoteId: string
  description: string
  quantity: number
  unit: string
  pricePerUnit: number
  applyMarkup: boolean
  profitMarkup: number
  createdAt: Date
  updatedAt: Date
}

export interface MobilisationCostPayload {
  description: string
  quantity: number
  unit: string
  pricePerUnit: number
  applyMarkup?: boolean
  profitMarkup?: number
}

export interface SupportCost {
  id: string
  quoteId: string
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
  createdAt: Date
  updatedAt: Date
}

export interface SupportCostPayload {
  position: string
  daysRequiredPA: number
  fte: number
  estimatedSalary: number
  car: number
  fuelEstimate: number
  niRate?: number
  pensionRate?: number
  profitMarkup: number
}

export interface Quote {
  id: string
  reference: string
  clientName: string
  siteName: string
  siteAddress: string
  regionId: string
  rateCardId: string
  status: QuoteStatus
  ppmSubtotal: number
  mobilisationTotal: number
  supportTotal: number
  subtotalBeforeMargin: number
  profitMarginPct: number
  marginAmount: number
  markupPct: number
  annualAdjustmentPct: number
  totalYear1: number
  totalYear2: number
  totalYear3: number
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  // Relations
  region?: Region
  rateCard?: RateCard
  user?: User
  assetLines?: AssetLine[]
  mobilisationCosts?: MobilisationCost[]
  supportCosts?: SupportCost[]
}

export interface QuoteCreatePayload {
  reference: string
  clientName: string
  siteName: string
  siteAddress: string
  regionId: string
  profitMarginPct?: number
  annualAdjustmentPct?: number
  notes?: string
  assetLines?: AssetLineCreatePayload[]
  mobilisationCosts?: MobilisationCostPayload[]
  supportCosts?: SupportCostPayload[]
}

export interface QuoteUpdatePayload {
  clientName?: string
  siteName?: string
  siteAddress?: string
  regionId?: string
  status?: QuoteStatus
  profitMarginPct?: number
  annualAdjustmentPct?: number
  notes?: string
  assetLines?: AssetLineCreatePayload[]
  mobilisationCosts?: MobilisationCostPayload[]
  supportCosts?: SupportCostPayload[]
}

// ────────────────────────────────────────────────────────────────────────────

// AUDIT LOG

export interface AuditLog {
  id: string
  userId: string
  quoteId?: string
  action: string
  entity: string
  details?: string
  createdAt: Date
}

// ────────────────────────────────────────────────────────────────────────────

// API RESPONSE WRAPPERS

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  error?: string
  statusCode: number
}

export interface ApiError {
  statusCode: number
  message: string
  details?: Record<string, string>
}
