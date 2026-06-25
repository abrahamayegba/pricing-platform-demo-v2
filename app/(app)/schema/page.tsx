'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Users, KeyRound, MapPin, Star, BookOpen, FileText, Building2, Wrench,
  Package, ClipboardList, Banknote, UserCog, AlertCircle, ChevronDown,
  ChevronRight, Link2, Database, Info,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FieldKind = 'pk' | 'fk' | 'enum' | 'scalar' | 'computed'

interface Field {
  name: string
  type: string
  kind: FieldKind
  nullable?: boolean
  default?: string
  note?: string
}

interface ModelDef {
  name: string
  table: string
  group: string
  icon: React.ElementType
  color: string        // tailwind bg class for header
  textColor: string    // tailwind text class
  description: string
  fields: Field[]
  relations?: string[] // names of other models this connects to
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Data
// ─────────────────────────────────────────────────────────────────────────────

const MODELS: ModelDef[] = [
  // ── AUTH ──────────────────────────────────────────────────────────────────
  {
    name: 'User',
    table: 'users',
    group: 'Auth',
    icon: Users,
    color: 'bg-violet-600',
    textColor: 'text-violet-700',
    description: 'Platform users with role-based access. Passwords are bcrypt-hashed.',
    relations: ['Session', 'Quote', 'AuditLog'],
    fields: [
      { name: 'id',           type: 'String (cuid)',   kind: 'pk' },
      { name: 'email',        type: 'String',          kind: 'scalar', note: 'unique' },
      { name: 'name',         type: 'String',          kind: 'scalar' },
      { name: 'initials',     type: 'String',          kind: 'scalar', note: 'max 4 chars' },
      { name: 'passwordHash', type: 'String',          kind: 'scalar', note: 'bcrypt' },
      { name: 'role',         type: 'UserRole',        kind: 'enum',   default: 'VIEWER' },
      { name: 'createdAt',    type: 'DateTime',        kind: 'scalar', default: 'now()' },
      { name: 'updatedAt',    type: 'DateTime',        kind: 'scalar' },
    ],
  },
  {
    name: 'Session',
    table: 'sessions',
    group: 'Auth',
    icon: KeyRound,
    color: 'bg-violet-500',
    textColor: 'text-violet-600',
    description: 'Token-based sessions. Expire at a fixed datetime; expired rows can be cleaned up by a cron job.',
    relations: ['User'],
    fields: [
      { name: 'id',        type: 'String (cuid)', kind: 'pk' },
      { name: 'userId',    type: 'String',        kind: 'fk',    note: '→ User' },
      { name: 'token',     type: 'String',        kind: 'scalar', note: 'unique, bearer token' },
      { name: 'expiresAt', type: 'DateTime',      kind: 'scalar' },
      { name: 'createdAt', type: 'DateTime',      kind: 'scalar', default: 'now()' },
    ],
  },

  // ── RATES ─────────────────────────────────────────────────────────────────
  {
    name: 'Region',
    table: 'regions',
    group: 'Rates',
    icon: MapPin,
    color: 'bg-sky-600',
    textColor: 'text-sky-700',
    description: 'UK regions (Scotland, Yorkshire, London etc.). Each region gets one rate card.',
    relations: ['RateCard', 'Quote'],
    fields: [
      { name: 'id',        type: 'String',   kind: 'pk',     note: 'slug e.g. "scotland"' },
      { name: 'name',      type: 'String',   kind: 'scalar', note: 'unique' },
      { name: 'createdAt', type: 'DateTime', kind: 'scalar', default: 'now()' },
    ],
  },
  {
    name: 'RateCard',
    table: 'rate_cards',
    group: 'Rates',
    icon: Star,
    color: 'bg-sky-500',
    textColor: 'text-sky-700',
    description: 'Overhead and efficiency settings per region. One RateCard per Region.',
    relations: ['Region', 'DisciplineRate'],
    fields: [
      { name: 'id',                         type: 'String (cuid)', kind: 'pk' },
      { name: 'regionId',                   type: 'String',        kind: 'fk',     note: '→ Region (unique)' },
      { name: 'overheadAndProfitLabour',    type: 'Decimal',       kind: 'scalar', default: '17', note: '%' },
      { name: 'overheadAndProfitMaterials', type: 'Decimal',       kind: 'scalar', default: '17', note: '%' },
      { name: 'sfgEfficiencyIndex',         type: 'Decimal',       kind: 'scalar', default: '1.0', note: 'multiplier' },
      { name: 'updatedAt',                  type: 'DateTime',      kind: 'scalar' },
    ],
  },
  {
    name: 'DisciplineRate',
    table: 'discipline_rates',
    group: 'Rates',
    icon: Wrench,
    color: 'bg-cyan-600',
    textColor: 'text-cyan-700',
    description: 'One row per discipline per rate card. Holds base cost and sales rate used to price SFG20 tasks.',
    relations: ['RateCard'],
    fields: [
      { name: 'id',         type: 'String (cuid)', kind: 'pk' },
      { name: 'rateCardId', type: 'String',        kind: 'fk',     note: '→ RateCard' },
      { name: 'discipline', type: 'Discipline',    kind: 'enum' },
      { name: 'baseRate',   type: 'Decimal',       kind: 'scalar', note: '£/hr — internal cost' },
      { name: 'salesRate',  type: 'Decimal',       kind: 'scalar', note: '£/hr — client charge' },
      { name: 'ot15Rate',   type: 'Decimal',       kind: 'scalar', note: '£/hr — overtime ×1.5' },
      { name: 'ot2Rate',    type: 'Decimal',       kind: 'scalar', note: '£/hr — overtime ×2.0' },
      { name: 'updatedAt',  type: 'DateTime',      kind: 'scalar' },
    ],
  },

  // ── SFG20 ─────────────────────────────────────────────────────────────────
  {
    name: 'SFG20Task',
    table: 'sfg20_tasks',
    group: 'SFG20 Library',
    icon: BookOpen,
    color: 'bg-amber-600',
    textColor: 'text-amber-700',
    description: 'Master record for each SFG20 schedule task. Cached locally from the SFG20 API and resynced on a schedule.',
    relations: ['SFG20FrequencyHour', 'AssetLine'],
    fields: [
      { name: 'id',          type: 'String (cuid)', kind: 'pk' },
      { name: 'code',        type: 'String',        kind: 'scalar', note: 'unique — e.g. "SFG 56-10"' },
      { name: 'section',     type: 'String',        kind: 'scalar', note: 'e.g. "Electrical"' },
      { name: 'sectionCode', type: 'String',        kind: 'scalar' },
      { name: 'description', type: 'String',        kind: 'scalar' },
      { name: 'discipline',  type: 'Discipline',    kind: 'enum' },
      { name: 'notes',       type: 'String',        kind: 'scalar', nullable: true },
      { name: 'syncedAt',    type: 'DateTime',      kind: 'scalar', nullable: true, note: 'last API sync' },
      { name: 'createdAt',   type: 'DateTime',      kind: 'scalar', default: 'now()' },
      { name: 'updatedAt',   type: 'DateTime',      kind: 'scalar' },
    ],
  },
  {
    name: 'SFG20FrequencyHour',
    table: 'sfg20_frequency_hours',
    group: 'SFG20 Library',
    icon: BookOpen,
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    description: 'Hours per visit for each frequency band of an SFG20 task — normalised from the library.',
    relations: ['SFG20Task'],
    fields: [
      { name: 'id',            type: 'String (cuid)', kind: 'pk' },
      { name: 'taskId',        type: 'String',        kind: 'fk',     note: '→ SFG20Task' },
      { name: 'band',          type: 'FrequencyBand', kind: 'enum',   note: 'W1 M1 M2 M3 M4 M5 M6 M12' },
      { name: 'hoursPerVisit', type: 'Decimal',       kind: 'scalar', note: 'e.g. 0.5, 4.0' },
    ],
  },

  // ── QUOTES ────────────────────────────────────────────────────────────────
  {
    name: 'Quote',
    table: 'quotes',
    group: 'Quotes',
    icon: FileText,
    color: 'bg-emerald-600',
    textColor: 'text-emerald-700',
    description: 'The core pricing document. A Quote is either a Tender (multi-year PPM contract) or a Quote (one-off / small works). Computed totals are stored for fast dashboard queries.',
    relations: ['Region', 'User', 'Site', 'AssetLine', 'ManualTask', 'MobilisationCost', 'SupportCost', 'OneOffCost', 'AuditLog'],
    fields: [
      { name: 'id',                   type: 'String (cuid)',  kind: 'pk' },
      { name: 'reference',            type: 'String',         kind: 'scalar', note: 'unique — e.g. QT-2025-001' },
      { name: 'quoteType',            type: 'QuoteType',      kind: 'enum',   note: 'TENDER | QUOTE' },
      { name: 'businessEntity',       type: 'BusinessEntity', kind: 'enum',   note: 'VFS | VWS' },
      { name: 'clientName',           type: 'String',         kind: 'scalar' },
      { name: 'regionId',             type: 'String',         kind: 'fk',     note: '→ Region' },
      { name: 'status',               type: 'QuoteStatus',    kind: 'enum',   default: 'DRAFT' },
      { name: 'profitMarginPct',      type: 'Decimal',        kind: 'scalar', default: '17', note: '%' },
      { name: 'annualAdjPct',         type: 'Decimal',        kind: 'scalar', default: '2',  note: 'year-on-year uplift %' },
      { name: 'vatRate',              type: 'Decimal',        kind: 'scalar', default: '20', note: '%' },
      { name: 'notes',                type: 'String',         kind: 'scalar', nullable: true },
      { name: 'ppmSubtotal',          type: 'Decimal',        kind: 'computed', note: 'sum of all asset line costs' },
      { name: 'manualSubtotal',       type: 'Decimal',        kind: 'computed' },
      { name: 'mobilisationTotal',    type: 'Decimal',        kind: 'computed' },
      { name: 'supportTotal',         type: 'Decimal',        kind: 'computed' },
      { name: 'oneOffTotal',          type: 'Decimal',        kind: 'computed' },
      { name: 'subtotalBeforeMargin', type: 'Decimal',        kind: 'computed' },
      { name: 'marginAmount',         type: 'Decimal',        kind: 'computed' },
      { name: 'vatAmount',            type: 'Decimal',        kind: 'computed' },
      { name: 'totalYear1',           type: 'Decimal',        kind: 'computed' },
      { name: 'totalYear2',           type: 'Decimal',        kind: 'computed', note: 'Year 1 × (1 + annualAdjPct)' },
      { name: 'totalYear3',           type: 'Decimal',        kind: 'computed', note: 'Year 2 × (1 + annualAdjPct)' },
      { name: 'createdById',          type: 'String',         kind: 'fk',     note: '→ User' },
      { name: 'createdAt',            type: 'DateTime',       kind: 'scalar', default: 'now()' },
      { name: 'updatedAt',            type: 'DateTime',       kind: 'scalar' },
    ],
  },
  {
    name: 'Site',
    table: 'sites',
    group: 'Quotes',
    icon: Building2,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    description: 'A physical location attached to a quote. A quote can have multiple sites (multi-site tender).',
    relations: ['Quote', 'AssetLine', 'ManualTask'],
    fields: [
      { name: 'id',        type: 'String (cuid)', kind: 'pk' },
      { name: 'quoteId',   type: 'String',        kind: 'fk',     note: '→ Quote' },
      { name: 'name',      type: 'String',        kind: 'scalar', note: 'e.g. "Plant Room A"' },
      { name: 'address',   type: 'String',        kind: 'scalar' },
      { name: 'sortOrder', type: 'Int',           kind: 'scalar', default: '0' },
    ],
  },

  // ── COST LINES ────────────────────────────────────────────────────────────
  {
    name: 'AssetLine',
    table: 'asset_lines',
    group: 'Cost Lines',
    icon: Package,
    color: 'bg-blue-600',
    textColor: 'text-blue-700',
    description: 'An SFG20 task applied to a specific asset. The annualCost is cached from salesRate × hours × quantity at save time.',
    relations: ['Quote', 'Site', 'SFG20Task', 'AssetLineBand', 'AssetLineEfficiency'],
    fields: [
      { name: 'id',          type: 'String (cuid)',   kind: 'pk' },
      { name: 'quoteId',     type: 'String',          kind: 'fk',       note: '→ Quote' },
      { name: 'siteId',      type: 'String',          kind: 'fk',       note: '→ Site' },
      { name: 'sfg20TaskId', type: 'String',          kind: 'fk',       note: '→ SFG20Task' },
      { name: 'discipline',  type: 'Discipline',      kind: 'enum' },
      { name: 'location',    type: 'String',          kind: 'scalar',   note: 'e.g. "Plant Room"' },
      { name: 'service',     type: 'String',          kind: 'scalar',   note: 'asset name / label' },
      { name: 'makeModel',   type: 'String',          kind: 'scalar',   nullable: true },
      { name: 'quantity',    type: 'Int',             kind: 'scalar' },
      { name: 'criticality', type: 'CriticalityLevel', kind: 'enum' },
      { name: 'annualCost',  type: 'Decimal',         kind: 'computed', note: 'cached at save' },
      { name: 'sortOrder',   type: 'Int',             kind: 'scalar',   default: '0' },
    ],
  },
  {
    name: 'AssetLineBand',
    table: 'asset_line_bands',
    group: 'Cost Lines',
    icon: Package,
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    description: 'Which frequency bands are active (included in pricing) for this asset line — driven by the criticality level.',
    relations: ['AssetLine'],
    fields: [
      { name: 'id',          type: 'String (cuid)', kind: 'pk' },
      { name: 'assetLineId', type: 'String',        kind: 'fk',  note: '→ AssetLine' },
      { name: 'band',        type: 'FrequencyBand', kind: 'enum' },
    ],
  },
  {
    name: 'AssetLineEfficiency',
    table: 'asset_line_efficiencies',
    group: 'Cost Lines',
    icon: Package,
    color: 'bg-blue-400',
    textColor: 'text-blue-600',
    description: 'Per-band efficiency override for an asset line. Default 1.0 (100%) comes from the rate card.',
    relations: ['AssetLine'],
    fields: [
      { name: 'id',          type: 'String (cuid)', kind: 'pk' },
      { name: 'assetLineId', type: 'String',        kind: 'fk',     note: '→ AssetLine' },
      { name: 'band',        type: 'FrequencyBand', kind: 'enum' },
      { name: 'factor',      type: 'Decimal',       kind: 'scalar', default: '1.0', note: 'e.g. 0.85 = 85%' },
    ],
  },
  {
    name: 'ManualTask',
    table: 'manual_tasks',
    group: 'Cost Lines',
    icon: ClipboardList,
    color: 'bg-indigo-600',
    textColor: 'text-indigo-700',
    description: 'User-defined labour lines not sourced from the SFG20 library. Cost = salesRate × hoursPerVisit × visitsPerYear × efficiencyFactor × quantity.',
    relations: ['Quote', 'Site'],
    fields: [
      { name: 'id',               type: 'String (cuid)', kind: 'pk' },
      { name: 'quoteId',          type: 'String',        kind: 'fk',       note: '→ Quote' },
      { name: 'siteId',           type: 'String',        kind: 'fk',       note: '→ Site' },
      { name: 'description',      type: 'String',        kind: 'scalar' },
      { name: 'discipline',       type: 'Discipline',    kind: 'enum' },
      { name: 'location',         type: 'String',        kind: 'scalar' },
      { name: 'makeModel',        type: 'String',        kind: 'scalar',   nullable: true },
      { name: 'quantity',         type: 'Int',           kind: 'scalar' },
      { name: 'hoursPerVisit',    type: 'Decimal',       kind: 'scalar' },
      { name: 'visitsPerYear',    type: 'Decimal',       kind: 'scalar' },
      { name: 'efficiencyFactor', type: 'Decimal',       kind: 'scalar',   default: '1' },
      { name: 'annualCost',       type: 'Decimal',       kind: 'computed', note: 'cached at save' },
    ],
  },
  {
    name: 'MobilisationCost',
    table: 'mobilisation_costs',
    group: 'Cost Lines',
    icon: Banknote,
    color: 'bg-teal-600',
    textColor: 'text-teal-700',
    description: 'One-time setup costs (surveys, CSCS checks, DBS, equipment). Can have an optional profit markup applied.',
    relations: ['Quote'],
    fields: [
      { name: 'id',           type: 'String (cuid)', kind: 'pk' },
      { name: 'quoteId',      type: 'String',        kind: 'fk',     note: '→ Quote' },
      { name: 'description',  type: 'String',        kind: 'scalar' },
      { name: 'quantity',     type: 'Decimal',       kind: 'scalar' },
      { name: 'unit',         type: 'String',        kind: 'scalar', note: '"Days" | "Item" | "Week"' },
      { name: 'pricePerUnit', type: 'Decimal',       kind: 'scalar' },
      { name: 'applyMarkup',  type: 'Boolean',       kind: 'scalar', default: 'true' },
      { name: 'profitMarkup', type: 'Decimal',       kind: 'scalar', note: '% when applyMarkup=true' },
    ],
  },
  {
    name: 'SupportCost',
    table: 'support_costs',
    group: 'Cost Lines',
    icon: UserCog,
    color: 'bg-orange-600',
    textColor: 'text-orange-700',
    description: 'People overhead for running a contract (Contract Manager, Account Manager etc.). Employment cost = salary × FTE × (1 + NI + pension) + car + fuel.',
    relations: ['Quote'],
    fields: [
      { name: 'id',              type: 'String (cuid)', kind: 'pk' },
      { name: 'quoteId',         type: 'String',        kind: 'fk',       note: '→ Quote' },
      { name: 'position',        type: 'String',        kind: 'scalar',   note: 'e.g. "Contract Manager (0.25 FTE)"' },
      { name: 'daysRequiredPA',  type: 'Decimal',       kind: 'scalar' },
      { name: 'fte',             type: 'Decimal',       kind: 'scalar',   note: 'e.g. 0.25' },
      { name: 'estimatedSalary', type: 'Decimal',       kind: 'scalar' },
      { name: 'car',             type: 'Decimal',       kind: 'scalar',   note: 'annual car allowance' },
      { name: 'fuelEstimate',    type: 'Decimal',       kind: 'scalar' },
      { name: 'niRate',          type: 'Decimal',       kind: 'scalar',   note: 'e.g. 0.15 (15%)' },
      { name: 'pensionRate',     type: 'Decimal',       kind: 'scalar',   note: 'e.g. 0.03 (3%)' },
      { name: 'employmentCost',  type: 'Decimal',       kind: 'computed', note: 'total employment cost' },
      { name: 'profitMarkup',    type: 'Decimal',       kind: 'scalar',   note: '%' },
    ],
  },
  {
    name: 'OneOffCost',
    table: 'one_off_costs',
    group: 'Cost Lines',
    icon: Banknote,
    color: 'bg-rose-600',
    textColor: 'text-rose-700',
    description: 'Fixed costs that appear once in the quote — licences, CAFM setup, SFG20 subscriptions etc.',
    relations: ['Quote'],
    fields: [
      { name: 'id',           type: 'String (cuid)', kind: 'pk' },
      { name: 'quoteId',      type: 'String',        kind: 'fk',     note: '→ Quote' },
      { name: 'description',  type: 'String',        kind: 'scalar' },
      { name: 'amount',       type: 'Decimal',       kind: 'scalar' },
      { name: 'applyMarkup',  type: 'Boolean',       kind: 'scalar', default: 'false' },
      { name: 'profitMarkup', type: 'Decimal',       kind: 'scalar', default: '0' },
      { name: 'notes',        type: 'String',        kind: 'scalar', nullable: true },
    ],
  },

  // ── AUDIT ─────────────────────────────────────────────────────────────────
  {
    name: 'AuditLog',
    table: 'audit_logs',
    group: 'Audit',
    icon: AlertCircle,
    color: 'bg-slate-600',
    textColor: 'text-slate-700',
    description: 'Immutable log of all create/update/delete and status-change events. payload stores before/after field snapshots as JSON.',
    relations: ['User', 'Quote'],
    fields: [
      { name: 'id',        type: 'String (cuid)', kind: 'pk' },
      { name: 'userId',    type: 'String',        kind: 'fk',     note: '→ User' },
      { name: 'quoteId',   type: 'String',        kind: 'fk',     note: '→ Quote (nullable)', nullable: true },
      { name: 'action',    type: 'String',        kind: 'scalar', note: 'CREATE | UPDATE | SEND | ACCEPT …' },
      { name: 'entity',    type: 'String',        kind: 'scalar', note: 'Quote | AssetLine | RateCard …' },
      { name: 'payload',   type: 'Json',          kind: 'scalar', nullable: true, note: 'before/after snapshot' },
      { name: 'createdAt', type: 'DateTime',      kind: 'scalar', default: 'now()' },
    ],
  },
]

const GROUPS = ['Auth', 'Rates', 'SFG20 Library', 'Quotes', 'Cost Lines', 'Audit']

const ENUMS: { name: string; values: { value: string; note?: string }[] }[] = [
  {
    name: 'UserRole',
    values: [
      { value: 'ADMIN',           note: 'Full access — manage users, rates, all quotes' },
      { value: 'PRICING_MANAGER', note: 'Create and edit quotes, view rates' },
      { value: 'VIEWER',          note: 'Read-only access to quotes' },
    ],
  },
  {
    name: 'BusinessEntity',
    values: [
      { value: 'VFS', note: 'Virtual Facility Services' },
      { value: 'VWS', note: 'Virtual Water Services' },
    ],
  },
  {
    name: 'QuoteType',
    values: [
      { value: 'TENDER', note: 'Long-term PPM contract — shows Year 1/2/3 price projections' },
      { value: 'QUOTE',  note: 'One-off or small works — single total price, no projections' },
    ],
  },
  {
    name: 'QuoteStatus',
    values: [
      { value: 'DRAFT',    note: 'Being built' },
      { value: 'SENT',     note: 'Submitted to client' },
      { value: 'ACCEPTED', note: 'Client agreed' },
      { value: 'DECLINED', note: 'Client rejected' },
    ],
  },
  {
    name: 'Discipline',
    values: [
      { value: 'ELECTRICAL' },
      { value: 'MECHANICAL' },
      { value: 'GAS' },
      { value: 'AC_REFRIGERATION' },
      { value: 'FABRIC' },
      { value: 'ME',            note: 'M&E general' },
      { value: 'WATER_HYGIENE' },
    ],
  },
  {
    name: 'CriticalityLevel',
    values: [
      { value: 'CRITICAL', note: 'Red — Statutory & Mandatory (all bands active)' },
      { value: 'HIGH',     note: 'Amber — Business Critical' },
      { value: 'MEDIUM',   note: 'Pink — Recommended (quarterly+)' },
      { value: 'LOW',      note: 'Green — Low Priority (6M+)' },
      { value: 'CUSTOM',   note: 'User picks active bands manually' },
    ],
  },
  {
    name: 'FrequencyBand',
    values: [
      { value: 'W1',  note: 'Weekly (52×/yr)' },
      { value: 'M1',  note: 'Monthly (12×/yr)' },
      { value: 'M2',  note: 'Every 2 months (6×/yr)' },
      { value: 'M3',  note: 'Quarterly (4×/yr)' },
      { value: 'M4',  note: 'Every 4 months (3×/yr)' },
      { value: 'M5',  note: 'Every 5 months (2.4×/yr)' },
      { value: 'M6',  note: 'Half-yearly (2×/yr)' },
      { value: 'M12', note: 'Annual (1×/yr)' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Relationship edges for the ERD panel
// ─────────────────────────────────────────────────────────────────────────────

const EDGES: { from: string; to: string; label: string; card: string }[] = [
  { from: 'User',              to: 'Session',             label: 'has',     card: '1 → N' },
  { from: 'User',              to: 'Quote',               label: 'creates', card: '1 → N' },
  { from: 'User',              to: 'AuditLog',            label: 'logs',    card: '1 → N' },
  { from: 'Region',            to: 'RateCard',            label: 'has',     card: '1 → 1' },
  { from: 'Region',            to: 'Quote',               label: 'used by', card: '1 → N' },
  { from: 'RateCard',          to: 'DisciplineRate',      label: 'has',     card: '1 → N' },
  { from: 'SFG20Task',         to: 'SFG20FrequencyHour',  label: 'has',     card: '1 → N' },
  { from: 'SFG20Task',         to: 'AssetLine',           label: 'used in', card: '1 → N' },
  { from: 'Quote',             to: 'Site',                label: 'has',     card: '1 → N' },
  { from: 'Quote',             to: 'AssetLine',           label: 'has',     card: '1 → N' },
  { from: 'Quote',             to: 'ManualTask',          label: 'has',     card: '1 → N' },
  { from: 'Quote',             to: 'MobilisationCost',    label: 'has',     card: '1 → N' },
  { from: 'Quote',             to: 'SupportCost',         label: 'has',     card: '1 → N' },
  { from: 'Quote',             to: 'OneOffCost',          label: 'has',     card: '1 → N' },
  { from: 'Quote',             to: 'AuditLog',            label: 'logs',    card: '1 → N' },
  { from: 'Site',              to: 'AssetLine',           label: 'has',     card: '1 → N' },
  { from: 'Site',              to: 'ManualTask',          label: 'has',     card: '1 → N' },
  { from: 'AssetLine',         to: 'AssetLineBand',       label: 'has',     card: '1 → N' },
  { from: 'AssetLine',         to: 'AssetLineEfficiency', label: 'has',     card: '1 → N' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_KIND_STYLES: Record<FieldKind, string> = {
  pk:       'bg-amber-100 text-amber-800 border-amber-200',
  fk:       'bg-blue-100 text-blue-800 border-blue-200',
  enum:     'bg-violet-100 text-violet-800 border-violet-200',
  scalar:   'bg-secondary text-secondary-foreground border-border',
  computed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}
const FIELD_KIND_LABELS: Record<FieldKind, string> = {
  pk: 'PK', fk: 'FK', enum: 'enum', scalar: 'field', computed: 'computed',
}

function FieldRow({ field }: { field: Field }) {
  return (
    <div className="flex items-start gap-2 py-1.5 px-3 border-b border-border/60 last:border-0 hover:bg-secondary/40 transition-colors">
      <span className={cn('mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 w-[58px] justify-center', FIELD_KIND_STYLES[field.kind])}>
        {FIELD_KIND_LABELS[field.kind]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={cn('text-xs font-mono font-semibold', field.kind === 'pk' && 'text-amber-700', field.kind === 'fk' && 'text-blue-700')}>
            {field.name}
            {field.nullable && <span className="text-muted-foreground font-normal">?</span>}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">{field.type}</span>
          {field.default && (
            <span className="text-[10px] text-muted-foreground">= {field.default}</span>
          )}
        </div>
        {field.note && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{field.note}</p>
        )}
      </div>
    </div>
  )
}

function ModelCard({ model, isOpen, onToggle }: { model: ModelDef; isOpen: boolean; onToggle: () => void }) {
  const Icon = model.icon
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', model.color)}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{model.name}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{model.table}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">{model.fields.length} fields</span>
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border">
          <p className="px-4 py-2.5 text-xs text-muted-foreground border-b border-border/60 leading-relaxed">
            {model.description}
          </p>
          {model.fields.map((f) => <FieldRow key={f.name} field={f} />)}
          {model.relations && model.relations.length > 0 && (
            <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap border-t border-border/60 bg-secondary/20">
              <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground mr-1">Relations:</span>
              {model.relations.map((r) => (
                <span key={r} className="text-[11px] bg-background border border-border rounded px-1.5 py-0.5 font-mono">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SchemaPage() {
  const [openModels, setOpenModels] = useState<Set<string>>(new Set(['Quote', 'AssetLine']))
  const [activeTab, setActiveTab] = useState<'models' | 'erd' | 'enums' | 'prisma'>('models')
  const [activeGroup, setActiveGroup] = useState<string>('All')

  function toggleModel(name: string) {
    setOpenModels((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function expandAll() {
    setOpenModels(new Set(MODELS.map((m) => m.name)))
  }
  function collapseAll() {
    setOpenModels(new Set())
  }

  const visibleModels = activeGroup === 'All'
    ? MODELS
    : MODELS.filter((m) => m.group === activeGroup)

  return (
    <div className="min-h-full bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Database className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold">Database Schema</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Prisma · PostgreSQL · Node.js · Express · TypeScript
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-md px-3 py-1.5 border border-border">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{MODELS.length} models &middot; {ENUMS.length} enums &middot; {EDGES.length} relationships</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {(['models', 'erd', 'enums', 'prisma'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {tab === 'erd' ? 'Relationships' : tab === 'prisma' ? 'schema.prisma' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ── MODELS TAB ── */}
        {activeTab === 'models' && (
          <div>
            {/* Group filter + expand/collapse */}
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {['All', ...GROUPS].map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                      activeGroup === g
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {g}
                    {g !== 'All' && (
                      <span className="ml-1 opacity-60">
                        {MODELS.filter((m) => m.group === g).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={expandAll}   className="text-xs text-muted-foreground hover:text-foreground transition-colors">Expand all</button>
                <span className="text-muted-foreground text-xs">/</span>
                <button onClick={collapseAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Collapse all</button>
              </div>
            </div>

            <div className="space-y-2">
              {visibleModels.map((m) => (
                <ModelCard
                  key={m.name}
                  model={m}
                  isOpen={openModels.has(m.name)}
                  onToggle={() => toggleModel(m.name)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── RELATIONSHIPS (ERD) TAB ── */}
        {activeTab === 'erd' && (
          <div className="space-y-6">
            {/* Legend */}
            <div className="flex items-center gap-6 flex-wrap text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-border rounded" /><span className="font-mono text-[11px]">→</span><span>foreign key</span></div>
              <div className="flex items-center gap-1.5"><span className="font-mono bg-secondary border border-border rounded px-1 text-[11px]">1 → 1</span><span>one-to-one</span></div>
              <div className="flex items-center gap-1.5"><span className="font-mono bg-secondary border border-border rounded px-1 text-[11px]">1 → N</span><span>one-to-many</span></div>
            </div>

            {/* Edges table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] text-xs font-semibold bg-secondary px-4 py-2.5 border-b border-border gap-4">
                <span>From</span>
                <span>Cardinality</span>
                <span>To</span>
                <span>Relation</span>
              </div>
              {EDGES.map((e, i) => {
                const fromModel = MODELS.find((m) => m.name === e.from)
                const toModel   = MODELS.find((m) => m.name === e.to)
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_1fr_auto] px-4 py-2.5 gap-4 items-center border-b border-border/60 last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {fromModel && (
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', fromModel.color)} />
                      )}
                      <span className="text-xs font-mono font-semibold">{e.from}</span>
                    </div>
                    <span className="font-mono text-[11px] bg-secondary border border-border rounded px-1.5 py-0.5 text-center whitespace-nowrap">
                      {e.card}
                    </span>
                    <div className="flex items-center gap-2">
                      {toModel && (
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', toModel.color)} />
                      )}
                      <span className="text-xs font-mono font-semibold">{e.to}</span>
                    </div>
                    <span className="text-xs text-muted-foreground italic">{e.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Data flow diagram — text-based ERD */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Core data flow</h3>
              <div className="space-y-4 text-xs font-mono leading-relaxed text-foreground">

                {/* Auth cluster */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Auth</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-violet-100 text-violet-800 border border-violet-200 rounded px-2 py-1">User</span>
                    <span className="text-muted-foreground">1 → N</span>
                    <span className="bg-violet-50 text-violet-700 border border-violet-200 rounded px-2 py-1">Session</span>
                  </div>
                </div>

                {/* Rates cluster */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Rates</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-sky-100 text-sky-800 border border-sky-200 rounded px-2 py-1">Region</span>
                    <span className="text-muted-foreground">1 → 1</span>
                    <span className="bg-sky-50 text-sky-700 border border-sky-200 rounded px-2 py-1">RateCard</span>
                    <span className="text-muted-foreground">1 → N</span>
                    <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 rounded px-2 py-1">DisciplineRate</span>
                  </div>
                </div>

                {/* SFG20 cluster */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">SFG20 Library</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 rounded px-2 py-1">SFG20Task</span>
                    <span className="text-muted-foreground">1 → N</span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1">SFG20FrequencyHour</span>
                  </div>
                </div>

                {/* Quote cluster */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Quote</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-600 text-white rounded px-2 py-1 font-bold">Quote</span>
                      <span className="text-muted-foreground">1 → N</span>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-2 py-1">Site</span>
                      <span className="text-muted-foreground">1 → N</span>
                      <span className="bg-blue-100 text-blue-800 border border-blue-200 rounded px-2 py-1">AssetLine</span>
                      <span className="text-muted-foreground">↔</span>
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 rounded px-2 py-1">SFG20Task</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pl-4 border-l-2 border-emerald-200">
                      <span className="text-muted-foreground">also has →</span>
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-2 py-1">ManualTask</span>
                      <span className="bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-1">MobilisationCost</span>
                      <span className="bg-orange-50 text-orange-700 border border-orange-200 rounded px-2 py-1">SupportCost</span>
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 rounded px-2 py-1">OneOffCost</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pl-4 border-l-2 border-emerald-200">
                      <span className="text-muted-foreground">asset line →</span>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">AssetLineBand</span>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">AssetLineEfficiency</span>
                    </div>
                  </div>
                </div>

                {/* Audit */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Audit</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-600 text-white rounded px-2 py-1">Quote</span>
                    <span className="text-muted-foreground">1 → N</span>
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 rounded px-2 py-1">AuditLog</span>
                    <span className="text-muted-foreground">N → 1</span>
                    <span className="bg-violet-100 text-violet-800 border border-violet-200 rounded px-2 py-1">User</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── ENUMS TAB ── */}
        {activeTab === 'enums' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ENUMS.map((e) => (
              <div key={e.name} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-secondary/60 border-b border-border">
                  <span className="text-sm font-mono font-semibold">{e.name}</span>
                </div>
                <div>
                  {e.values.map((v) => (
                    <div key={v.value} className="flex items-start gap-3 px-4 py-2 border-b border-border/60 last:border-0">
                      <span className="text-xs font-mono font-semibold text-primary mt-0.5 w-28 flex-shrink-0">{v.value}</span>
                      {v.note && <span className="text-xs text-muted-foreground leading-relaxed">{v.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PRISMA FILE TAB ── */}
        {activeTab === 'prisma' && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/60 border-b border-border">
              <span className="text-sm font-mono font-medium text-foreground">prisma/schema.prisma</span>
              <span className="text-xs text-muted-foreground">PostgreSQL · Prisma ORM</span>
            </div>
            <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto text-foreground/90 whitespace-pre bg-[oklch(0.97_0.004_248)] dark:bg-[oklch(0.145_0_0)]">
{`// Stack: PostgreSQL · Prisma · Node.js · Express · TypeScript

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── ENUMS ──────────────────────────────────────────────────────

enum UserRole        { ADMIN PRICING_MANAGER VIEWER }
enum BusinessEntity  { VFS VWS }
enum QuoteType       { TENDER QUOTE }
enum QuoteStatus     { DRAFT SENT ACCEPTED DECLINED }
enum Discipline      { ELECTRICAL MECHANICAL GAS AC_REFRIGERATION FABRIC ME WATER_HYGIENE }
enum CriticalityLevel{ CRITICAL HIGH MEDIUM LOW CUSTOM }
enum FrequencyBand   { W1 M1 M2 M3 M4 M5 M6 M12 }

// ── AUTH ──────────────────────────────────────────────────────

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  initials     String    @db.VarChar(4)
  passwordHash String
  role         UserRole  @default(VIEWER)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  quotes       Quote[]
  sessions     Session[]
  auditLogs    AuditLog[]
  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([token])
  @@map("sessions")
}

// ── RATES ─────────────────────────────────────────────────────

model Region {
  id        String    @id
  name      String    @unique
  createdAt DateTime  @default(now())
  rateCard  RateCard?
  quotes    Quote[]
  @@map("regions")
}

model RateCard {
  id                         String          @id @default(cuid())
  regionId                   String          @unique
  overheadAndProfitLabour    Decimal         @db.Decimal(6, 2) @default(17)
  overheadAndProfitMaterials Decimal         @db.Decimal(6, 2) @default(17)
  sfgEfficiencyIndex         Decimal         @db.Decimal(6, 4) @default(1)
  updatedAt                  DateTime        @updatedAt
  region          Region          @relation(fields: [regionId], references: [id], onDelete: Cascade)
  disciplineRates DisciplineRate[]
  @@map("rate_cards")
}

model DisciplineRate {
  id         String     @id @default(cuid())
  rateCardId String
  discipline Discipline
  baseRate   Decimal    @db.Decimal(10, 4)
  salesRate  Decimal    @db.Decimal(10, 4)
  ot15Rate   Decimal    @db.Decimal(10, 4)
  ot2Rate    Decimal    @db.Decimal(10, 4)
  updatedAt  DateTime   @updatedAt
  rateCard   RateCard   @relation(fields: [rateCardId], references: [id], onDelete: Cascade)
  @@unique([rateCardId, discipline])
  @@map("discipline_rates")
}

// ── SFG20 LIBRARY ─────────────────────────────────────────────

model SFG20Task {
  id           String    @id @default(cuid())
  code         String    @unique
  section      String
  sectionCode  String
  description  String
  discipline   Discipline
  notes        String?
  syncedAt     DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  frequencyHours SFG20FrequencyHour[]
  assetLines     AssetLine[]
  @@index([discipline])
  @@map("sfg20_tasks")
}

model SFG20FrequencyHour {
  id            String        @id @default(cuid())
  taskId        String
  band          FrequencyBand
  hoursPerVisit Decimal       @db.Decimal(8, 4)
  task          SFG20Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  @@unique([taskId, band])
  @@map("sfg20_frequency_hours")
}

// ── QUOTES ────────────────────────────────────────────────────

model Quote {
  id                   String         @id @default(cuid())
  reference            String         @unique
  quoteType            QuoteType
  businessEntity       BusinessEntity
  clientName           String
  regionId             String
  status               QuoteStatus    @default(DRAFT)
  profitMarginPct      Decimal        @db.Decimal(6,2)  @default(17)
  annualAdjPct         Decimal        @db.Decimal(6,2)  @default(2)
  vatRate              Decimal        @db.Decimal(6,2)  @default(20)
  notes                String?
  // Cached computed totals
  ppmSubtotal          Decimal        @db.Decimal(12,2) @default(0)
  manualSubtotal       Decimal        @db.Decimal(12,2) @default(0)
  mobilisationTotal    Decimal        @db.Decimal(12,2) @default(0)
  supportTotal         Decimal        @db.Decimal(12,2) @default(0)
  oneOffTotal          Decimal        @db.Decimal(12,2) @default(0)
  subtotalBeforeMargin Decimal        @db.Decimal(12,2) @default(0)
  marginAmount         Decimal        @db.Decimal(12,2) @default(0)
  vatAmount            Decimal        @db.Decimal(12,2) @default(0)
  totalYear1           Decimal        @db.Decimal(12,2) @default(0)
  totalYear2           Decimal        @db.Decimal(12,2) @default(0)
  totalYear3           Decimal        @db.Decimal(12,2) @default(0)
  createdById          String
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  region               Region         @relation(fields: [regionId], references: [id])
  createdBy            User           @relation(fields: [createdById], references: [id])
  sites                Site[]
  assetLines           AssetLine[]
  manualTasks          ManualTask[]
  mobilisationCosts    MobilisationCost[]
  supportCosts         SupportCost[]
  oneOffCosts          OneOffCost[]
  auditLogs            AuditLog[]
  @@index([status])
  @@index([clientName])
  @@index([createdById])
  @@index([createdAt])
  @@map("quotes")
}

model Site {
  id        String   @id @default(cuid())
  quoteId   String
  name      String
  address   String
  sortOrder Int      @default(0)
  quote       Quote       @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  assetLines  AssetLine[]
  manualTasks ManualTask[]
  @@index([quoteId])
  @@map("sites")
}

// ── COST LINES ────────────────────────────────────────────────

model AssetLine {
  id          String           @id @default(cuid())
  quoteId     String
  siteId      String
  sfg20TaskId String
  discipline  Discipline
  location    String
  service     String
  makeModel   String?
  quantity    Int
  criticality CriticalityLevel
  annualCost  Decimal          @db.Decimal(12,2) @default(0)
  sortOrder   Int              @default(0)
  quote        Quote            @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  site         Site             @relation(fields: [siteId], references: [id])
  sfg20Task    SFG20Task        @relation(fields: [sfg20TaskId], references: [id])
  activeBands  AssetLineBand[]
  efficiencies AssetLineEfficiency[]
  @@index([quoteId])
  @@index([siteId])
  @@map("asset_lines")
}

model AssetLineBand {
  id          String        @id @default(cuid())
  assetLineId String
  band        FrequencyBand
  assetLine   AssetLine     @relation(fields: [assetLineId], references: [id], onDelete: Cascade)
  @@unique([assetLineId, band])
  @@map("asset_line_bands")
}

model AssetLineEfficiency {
  id          String        @id @default(cuid())
  assetLineId String
  band        FrequencyBand
  factor      Decimal       @db.Decimal(6,4) @default(1)
  assetLine   AssetLine     @relation(fields: [assetLineId], references: [id], onDelete: Cascade)
  @@unique([assetLineId, band])
  @@map("asset_line_efficiencies")
}

model ManualTask {
  id               String     @id @default(cuid())
  quoteId          String
  siteId           String
  description      String
  discipline       Discipline
  location         String
  makeModel        String?
  quantity         Int
  hoursPerVisit    Decimal    @db.Decimal(8,4)
  visitsPerYear    Decimal    @db.Decimal(6,2)
  efficiencyFactor Decimal    @db.Decimal(6,4) @default(1)
  annualCost       Decimal    @db.Decimal(12,2) @default(0)
  quote            Quote      @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  site             Site       @relation(fields: [siteId], references: [id])
  @@index([quoteId])
  @@map("manual_tasks")
}

model MobilisationCost {
  id           String   @id @default(cuid())
  quoteId      String
  description  String
  quantity     Decimal  @db.Decimal(10,4)
  unit         String
  pricePerUnit Decimal  @db.Decimal(10,2)
  applyMarkup  Boolean  @default(true)
  profitMarkup Decimal  @db.Decimal(6,2)
  quote        Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  @@index([quoteId])
  @@map("mobilisation_costs")
}

model SupportCost {
  id              String   @id @default(cuid())
  quoteId         String
  position        String
  daysRequiredPA  Decimal  @db.Decimal(8,2)
  fte             Decimal  @db.Decimal(6,4)
  estimatedSalary Decimal  @db.Decimal(12,2)
  car             Decimal  @db.Decimal(10,2)
  fuelEstimate    Decimal  @db.Decimal(10,2)
  niRate          Decimal  @db.Decimal(6,4)
  pensionRate     Decimal  @db.Decimal(6,4)
  employmentCost  Decimal  @db.Decimal(12,2)
  profitMarkup    Decimal  @db.Decimal(6,2)
  quote           Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  @@index([quoteId])
  @@map("support_costs")
}

model OneOffCost {
  id           String   @id @default(cuid())
  quoteId      String
  description  String
  amount       Decimal  @db.Decimal(12,2)
  applyMarkup  Boolean  @default(false)
  profitMarkup Decimal  @db.Decimal(6,2)  @default(0)
  notes        String?
  quote        Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  @@index([quoteId])
  @@map("one_off_costs")
}

// ── AUDIT ─────────────────────────────────────────────────────

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  quoteId   String?
  action    String
  entity    String
  payload   Json?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: SetNull)
  quote     Quote?   @relation(fields: [quoteId], references: [id], onDelete: SetNull)
  @@index([userId])
  @@index([quoteId])
  @@index([createdAt])
  @@map("audit_logs")
}`}
            </pre>
          </div>
        )}

      </div>
    </div>
  )
}
