import type {
  RateCard, Quote, QuoteStatus, AssetLine, FrequencyBand,
  MobilisationCost, SupportCost, ManualTask, OneOffCost, AppSettings,
  RoleRate, BusinessEntity, QuoteType,
} from './types'
import { DEFAULT_RATE_CARDS } from './data'
import { VISITS_PER_YEAR, DEFAULT_APP_SETTINGS } from './types'

const KEYS = {
  RATE_CARDS:  'sfg20_rate_cards_v4',
  QUOTES:      'sfg20_quotes_v5',
  SEEDED:      'sfg20_seeded_v5',
  SETTINGS:    'sfg20_settings_v4',
  ROLE_RATES:  'sfg20_role_rates_v4',
  DRAFT_QUOTE: 'sfg20_draft_quote_v1',
}

// ── App Settings ──────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS
  const s = localStorage.getItem(KEYS.SETTINGS)
  if (!s) return DEFAULT_APP_SETTINGS
  return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(s) }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

// ── Draft Quote (auto-save while building) ────────────────────────────────────

export function saveDraftQuote(draft: object) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS.DRAFT_QUOTE, JSON.stringify({ ...draft, _savedAt: new Date().toISOString() }))
}

export function loadDraftQuote(): (Record<string, unknown> & { _savedAt?: string }) | null {
  if (typeof window === 'undefined') return null
  const s = localStorage.getItem(KEYS.DRAFT_QUOTE)
  if (!s) return null
  try { return JSON.parse(s) } catch { return null }
}

export function clearDraftQuote() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEYS.DRAFT_QUOTE)
}

// ── Role Rates ────────────────────────────────────────────────────────────────

const DEFAULT_ROLE_RATES: RoleRate[] = [
  { id: 'rr-contract-mgr',    position: 'Contract Manager',          dayRate: 350, baseRate: 250, isCustom: false },
  { id: 'rr-account-mgr',     position: 'Account Manager',           dayRate: 320, baseRate: 220, isCustom: false },
  { id: 'rr-project-mgr',     position: 'Project Manager',           dayRate: 380, baseRate: 280, isCustom: false },
  { id: 'rr-site-supervisor', position: 'Site Supervisor',           dayRate: 280, baseRate: 200, isCustom: false },
  { id: 'rr-admin',           position: 'Administrative Support',    dayRate: 180, baseRate: 130, isCustom: false },
  { id: 'rr-director',        position: 'Director',                  dayRate: 600, baseRate: 450, isCustom: false },
]

export function getRoleRates(): RoleRate[] {
  if (typeof window === 'undefined') return DEFAULT_ROLE_RATES
  const s = localStorage.getItem(KEYS.ROLE_RATES)
  return s ? JSON.parse(s) : DEFAULT_ROLE_RATES
}

export function saveRoleRates(rates: RoleRate[]) {
  localStorage.setItem(KEYS.ROLE_RATES, JSON.stringify(rates))
}

// ── Rate Cards ────────────────────────────────────────────────────────────────

export function getRateCards(): RateCard[] {
  if (typeof window === 'undefined') return DEFAULT_RATE_CARDS
  const s = localStorage.getItem(KEYS.RATE_CARDS)
  return s ? JSON.parse(s) : DEFAULT_RATE_CARDS
}

export function saveRateCards(cards: RateCard[]) {
  localStorage.setItem(KEYS.RATE_CARDS, JSON.stringify(cards))
}

export function getRateCard(regionId: string): RateCard | undefined {
  return getRateCards().find((c) => c.regionId === regionId)
}

export function updateRateCard(card: RateCard) {
  const cards = getRateCards()
  const i = cards.findIndex((c) => c.regionId === card.regionId)
  if (i >= 0) cards[i] = card
  else cards.push(card)
  saveRateCards(cards)
}

// ── Asset line calculation ────────────────────────────────────────────────────

export const FREQ_BANDS: FrequencyBand[] = ['1W', '1M', '2M', '3M', '4M', '5M', '6M', '12M']

export function calcAssetLine(line: AssetLine, salesRate: number) {
  let totalSFGHours = 0
  let totalFlexedHours = 0
  const annualHoursByBand = {} as Record<FrequencyBand, number>

  for (const band of FREQ_BANDS) {
    // Only count bands that are active (selected by criticality)
    const isActive = line.activeBands ? line.activeBands.includes(band) : true
    const hrsPerVisit = isActive ? (line.sfgHours[band] ?? 0) : 0
    const visits = VISITS_PER_YEAR[band]
    const rawAnnual = hrsPerVisit * visits * line.quantity
    const efficiency = line.efficiencyFactor[band] ?? 1.0
    const flexed = rawAnnual * efficiency
    annualHoursByBand[band] = flexed
    totalSFGHours += rawAnnual
    totalFlexedHours += flexed
  }

  return {
    annualHoursByBand,
    totalSFGHours,
    totalFlexedHours,
    annualCost: totalFlexedHours * salesRate,
  }
}

export function calcManualTask(task: ManualTask, salesRate: number) {
  const annualHours = task.hoursPerVisit * task.visitsPerYear * task.quantity * task.efficiencyFactor
  return {
    annualHours,
    annualCost: annualHours * salesRate,
  }
}

// ── Quote Calculation ────────────────────────────────────────────────────────

export function calculateQuoteTotals(quote: Quote): Quote {
  const settings = getSettings()
  const vatRate = quote.vatRate ?? settings.vatRate

  const subtotalBeforeMargin =
    quote.ppmSubtotal +
    quote.manualTaskSubtotal +
    quote.mobilisationTotal +
    quote.supportTotal +
    quote.oneOffTotal

  const marginAmount = subtotalBeforeMargin * (quote.profitMarginPct / 100)
  const totalYear1 = subtotalBeforeMargin + marginAmount
  const totalYear2 = totalYear1 * (1 + quote.annualAdjustmentPct / 100)
  const totalYear3 = totalYear2 * (1 + quote.annualAdjustmentPct / 100)
  const markupPct = (quote.profitMarginPct / (100 - quote.profitMarginPct)) * 100
  const vatAmount = totalYear1 * (vatRate / 100)

  return {
    ...quote,
    vatRate,
    subtotalBeforeMargin,
    marginAmount,
    totalYear1,
    totalYear2,
    totalYear3,
    markupPct,
    vatAmount,
    totalYear1IncVat: totalYear1 + vatAmount,
    totalYear2IncVat: totalYear2 + totalYear2 * (vatRate / 100),
    totalYear3IncVat: totalYear3 + totalYear3 * (vatRate / 100),
  }
}

// ── Quote migration helper (backfill legacy quotes) ───────────────────────────

function migrateQuote(q: any): Quote {
  const defaultSite = {
    id: 'site-default',
    name: q.siteName ?? '',
    address: q.siteAddress ?? '',
  }
  return {
    ...q,
    quoteType: q.quoteType ?? 'tender',
    businessEntity: q.businessEntity ?? 'virtual_facilities_management',
    sites: q.sites && q.sites.length > 0 ? q.sites : [defaultSite],
    manualTasks: q.manualTasks ?? [],
    oneOffCosts: q.oneOffCosts ?? [],
    manualTaskSubtotal: q.manualTaskSubtotal ?? 0,
    oneOffTotal: q.oneOffTotal ?? 0,
    vatRate: q.vatRate ?? 20,
    vatAmount: q.vatAmount ?? 0,
    totalYear1IncVat: q.totalYear1IncVat ?? (q.totalYear1 ?? 0) * 1.2,
    totalYear2IncVat: q.totalYear2IncVat ?? (q.totalYear2 ?? 0) * 1.2,
    totalYear3IncVat: q.totalYear3IncVat ?? (q.totalYear3 ?? 0) * 1.2,
    // Migrate assetLines to add siteId and activeBands if missing
    assetLines: (q.assetLines ?? []).map((l: any) => ({
      ...l,
      siteId: l.siteId ?? 'site-default',
      activeBands: l.activeBands ?? FREQ_BANDS.filter((b) => (l.sfgHours?.[b] ?? 0) > 0),
      criticality: l.criticality ?? 'custom',
      isManual: false,
    })),
  }
}

// ── Quotes ────────────────────────────────────────────────────────────────────

const EFF1: Record<FrequencyBand, number> = { '1W': 1, '1M': 1, '2M': 1, '3M': 1, '4M': 1, '5M': 1, '6M': 1, '12M': 1 }
const H0: Record<FrequencyBand, number> = { '1W': 0, '1M': 0, '2M': 0, '3M': 0, '4M': 0, '5M': 0, '6M': 0, '12M': 0 }

function buildQuote(opts: {
  id: string; reference: string; clientName: string;
  quoteType: QuoteType; businessEntity: BusinessEntity;
  sites: { id: string; name: string; address: string }[];
  regionId: string; regionName: string; status: QuoteStatus;
  assets: AssetLine[]; manualTasks?: ManualTask[];
  mobilisationCosts: MobilisationCost[];
  supportCosts: SupportCost[];
  oneOffCosts?: OneOffCost[];
  profitMarginPct: number; annualAdjustmentPct: number;
  vatRate: number;
  notes: string; createdBy: string; daysAgo: number; updatedDaysAgo: number;
}): Quote {
  const card = DEFAULT_RATE_CARDS.find((r) => r.regionId === opts.regionId)!
  let ppmSubtotal = 0
  for (const asset of opts.assets) {
    const rate = card.disciplines[asset.discipline].salesRate
    ppmSubtotal += calcAssetLine(asset, rate).annualCost
  }
  let manualTaskSubtotal = 0
  for (const m of (opts.manualTasks ?? [])) {
    const rate = card.disciplines[m.discipline].salesRate
    manualTaskSubtotal += calcManualTask(m, rate).annualCost
  }
  let mobilisationTotal = 0
  for (const m of opts.mobilisationCosts) {
    const base = m.quantity * m.pricePerUnit
    mobilisationTotal += m.applyMarkup ? base * (1 + m.profitMarkup / 100) : base
  }
  let supportTotal = 0
  for (const s of opts.supportCosts) {
    supportTotal += s.employmentCost * (1 + s.profitMarkup / 100)
  }
  let oneOffTotal = 0
  for (const c of (opts.oneOffCosts ?? [])) {
    oneOffTotal += c.applyMarkup ? c.amount * (1 + c.profitMarkup / 100) : c.amount
  }
  const subtotalBeforeMargin = ppmSubtotal + manualTaskSubtotal + mobilisationTotal + supportTotal + oneOffTotal
  const marginAmount = subtotalBeforeMargin * (opts.profitMarginPct / 100)
  const totalYear1 = subtotalBeforeMargin + marginAmount
  const totalYear2 = totalYear1 * (1 + opts.annualAdjustmentPct / 100)
  const totalYear3 = totalYear2 * (1 + opts.annualAdjustmentPct / 100)
  const vatAmount = totalYear1 * (opts.vatRate / 100)

  return {
    id: opts.id,
    reference: opts.reference,
    quoteType: opts.quoteType,
    businessEntity: opts.businessEntity,
    clientName: opts.clientName,
    sites: opts.sites,
    siteName: opts.sites[0]?.name ?? '',
    siteAddress: opts.sites[0]?.address ?? '',
    regionId: opts.regionId,
    regionName: opts.regionName,
    status: opts.status,
    assetLines: opts.assets,
    manualTasks: opts.manualTasks ?? [],
    mobilisationCosts: opts.mobilisationCosts,
    supportCosts: opts.supportCosts,
    oneOffCosts: opts.oneOffCosts ?? [],
    ppmSubtotal,
    manualTaskSubtotal,
    mobilisationTotal,
    supportTotal,
    oneOffTotal,
    subtotalBeforeMargin,
    profitMarginPct: opts.profitMarginPct,
    marginAmount,
    markupPct: (opts.profitMarginPct / (100 - opts.profitMarginPct)) * 100,
    annualAdjustmentPct: opts.annualAdjustmentPct,
    vatRate: opts.vatRate,
    vatAmount,
    totalYear1,
    totalYear2,
    totalYear3,
    totalYear1IncVat: totalYear1 + vatAmount,
    totalYear2IncVat: totalYear2 + totalYear2 * (opts.vatRate / 100),
    totalYear3IncVat: totalYear3 + totalYear3 * (opts.vatRate / 100),
    notes: opts.notes,
    createdBy: opts.createdBy,
    createdAt: new Date(Date.now() - opts.daysAgo * 864e5).toISOString(),
    updatedAt: new Date(Date.now() - opts.updatedDaysAgo * 864e5).toISOString(),
  }
}

function makeAsset(
  id: string, siteId: string, discipline: AssetLine['discipline'],
  location: string, service: string, makeModel: string, quantity: number,
  code: string, description: string, hours: Partial<Record<FrequencyBand, number>>
): AssetLine {
  const sfgHours = { ...H0, ...hours } as Record<FrequencyBand, number>
  const activeBands = FREQ_BANDS.filter((b) => (sfgHours[b] ?? 0) > 0)
  return {
    id, siteId, discipline, location, service, makeModel, quantity,
    sfgCode: code, sfgDescription: description,
    sfgHours, efficiencyFactor: { ...EFF1 },
    activeBands, criticality: 'critical', isManual: false,
  }
}

function seed(): Quote[] {
  return [
    // ── Q1: SFH Opco / Casa by Moda – North Lodge Wynd, Glasgow (Scotland) ──
    buildQuote({
      id: 'demo-q1', reference: 'QT-2025-001',
      quoteType: 'tender', businessEntity: 'virtual_facilities_management',
      clientName: 'SFH Opco Limited (Casa by Moda)',
      sites: [
        { id: 's1a', name: '1 North Lodge Wynd', address: '1 North Lodge Wynd, Glasgow, G33 4BG' },
        { id: 's1b', name: '2 North Lodge Wynd', address: '2 North Lodge Wynd, Glasgow, G33 4BF' },
        { id: 's1c', name: '3 North Lodge Wynd', address: '3 North Lodge Wynd, Glasgow, G33 4BG' },
        { id: 's1d', name: '4 North Lodge Wynd', address: '4 North Lodge Wynd, Glasgow, G33 4BG' },
        { id: 's1e', name: '5 North Lodge Gate',  address: '5 North Lodge Gate, Glasgow, G33 4BH' },
        { id: 's1f', name: '1190 Edinburgh Road', address: '1190 Edinburgh Road, Glasgow, G33 4BJ' },
      ],
      regionId: 'scotland', regionName: 'Scotland', status: 'sent',
      assets: [
        // Site 1a
        makeAsset('a1','s1a','gas','Plant Room','Gas Boiler Annual Service','Ideal Logic',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('a2','s1a','electrical','Hallway','Emergency Lighting Monthly Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('a3','s1a','water_hygiene','All Outlets','Carbon Monoxide Alarm Check','N/A',2,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('a4','s1a','fabric','Building Envelope','Fire Door Inspection','N/A',3,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        // Site 1b
        makeAsset('a5','s1b','gas','Plant Room','Gas Boiler Annual Service','Worcester Bosch',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('a6','s1b','electrical','Hallway','Emergency Lighting Monthly Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('a7','s1b','water_hygiene','Kitchen/Bathroom','CO Alarm Checks','N/A',2,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        // Site 1c
        makeAsset('a8','s1c','gas','Plant Room','Gas Boiler Annual Service','Vaillant',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('a9','s1c','electrical','Hallway','Emergency Lighting Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('a10','s1c','fabric','Building Envelope','Fire Door Inspection','N/A',2,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        // Site 1d
        makeAsset('a11','s1d','gas','Plant Room','Gas Boiler Annual Service','Baxi',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('a12','s1d','electrical','Hallway','Emergency Lighting Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('a13','s1d','me','Common Areas','Fire Extinguisher CO2 Check','N/A',2,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
        // Site 1e
        makeAsset('a14','s1e','gas','Plant Room','Gas Boiler Annual Service','Ideal Logic',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('a15','s1e','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('a16','s1e','electrical','Common Areas','Emergency Lighting Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        // Site 1f
        makeAsset('a17','s1f','gas','Plant Room','Gas Boiler Annual Service','Vaillant',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('a18','s1f','electrical','Hallway','Emergency Lighting Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('a19','s1f','water_hygiene','All Outlets','CO Alarm Check','N/A',2,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
      ],
      mobilisationCosts: [
        { id: 'm1', description: 'Asset Survey & Loading (6 sites)', quantity: 6, unit: 'Days', pricePerUnit: 175, applyMarkup: true, profitMarkup: 13.64 },
        { id: 'm2', description: 'SimPRO Licence Setup', quantity: 1, unit: 'Item', pricePerUnit: 330, applyMarkup: true, profitMarkup: 13.64 },
      ],
      supportCosts: [],
      oneOffCosts: [
        { id: 'oc1', description: 'SFG20 Licence', amount: 2500, applyMarkup: false, profitMarkup: 0, notes: 'Annual SFG20 task library access' },
        { id: 'oc2', description: 'SimPRO CAFM Licence', amount: 1200, applyMarkup: false, profitMarkup: 0 },
      ],
      profitMarginPct: 17, annualAdjustmentPct: 2, vatRate: 20,
      notes: 'Build-to-rent portfolio. All 6 properties require same specification PPM scope. Access must be coordinated with tenants — 48h notice required.',
      createdBy: 'K. Morrison', daysAgo: 12, updatedDaysAgo: 5,
    }),

    // ── Q2: Royal Conservatoire of Scotland – 100 Renfrew Street, Glasgow ──
    buildQuote({
      id: 'demo-q2', reference: 'QT-2025-002',
      quoteType: 'tender', businessEntity: 'virtual_water_services',
      clientName: 'Royal Conservatoire of Scotland',
      sites: [
        { id: 's2a', name: '100 Renfrew Street',   address: '100 Renfrew Street, Glasgow, G2 3DB' },
        { id: 's2b', name: '300 Bath Street (VFM)', address: 'Tay House, 300 Bath Street, Glasgow, G2 4LH' },
      ],
      regionId: 'scotland', regionName: 'Scotland', status: 'accepted',
      assets: [
        // 100 Renfrew Street – full hard services scope
        makeAsset('b1','s2a','mechanical','Roof','Air to Water Heat Pump','Mitsubishi',2,'SFG 05-39','Air to Water Heat Pump',{'3M':0.5,'6M':1.5,'12M':3}),
        makeAsset('b2','s2a','mechanical','Roof','Air Pressure Relief Dampers','Trox',4,'SFG 05-21','Air Pressure Relief Damper',{'6M':1.5,'12M':2}),
        makeAsset('b3','s2a','ac_refrigeration','Performance Spaces','Room Air Conditioners','Daikin',8,'SFG 17-02','Room Air Conditioners',{'6M':1.5,'12M':2.5}),
        makeAsset('b4','s2a','ac_refrigeration','Server Room','ACI Inspection','N/A',1,'SFG 17-01','Air Conditioning Inspection (ACI / TM44) – England, Wales & NI',{'12M':4}),
        makeAsset('b5','s2a','electrical','Main Switchroom','Distribution Board Inspection','Schneider',6,'SFG 56-01','Distribution Board – Inspection & Thermographic Survey',{'12M':4}),
        makeAsset('b6','s2a','electrical','All Floors','Emergency Lighting Monthly Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('b7','s2a','electrical','Roof','Lightning Protection Inspection','N/A',1,'SFG 56-30','Lightning Protection – Annual Inspection & Testing',{'12M':3}),
        makeAsset('b8','s2a','electrical','Main Entrance','Access Control Annual Service','Paxton',1,'SFG 56-50','Access Control System – Annual Full Service',{'6M':2,'12M':4}),
        makeAsset('b9','s2a','mechanical','Ventilation Plant','Ducting Attenuators','Trox',8,'SFG 05-51','Ducting – Attenuators',{'12M':1}),
        makeAsset('b10','s2a','mechanical','Ventilation Plant','Fire/Smoke Dampers','Trox',12,'SFG 05-56','Ducting – Combined Fire/Smoke Dampers used in Ventilation Systems',{'12M':2}),
        makeAsset('b11','s2a','fabric','All Floors','Fire Door Annual Inspection','N/A',24,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('b12','s2a','me','All Floors','Fire Extinguisher CO2 Annual','N/A',16,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
        // 300 Bath Street – support office scope
        makeAsset('b13','s2b','electrical','Office Floor','DB Inspection','Schneider',2,'SFG 56-01','Distribution Board – Inspection & Thermographic Survey',{'12M':4}),
        makeAsset('b14','s2b','electrical','Office Hallway','Emergency Lighting Test','Ansell',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('b15','s2b','electrical','Roof','Standby Generator Service','Pramac',1,'SFG 56-20','Standby Generator – Full Load Test & Service',{'1M':0.5,'6M':2,'12M':4}),
        makeAsset('b16','s2b','fabric','Common Areas','Fire Door Inspection','N/A',6,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
      ],
      mobilisationCosts: [
        { id: 'bm1', description: 'Asset Survey & Loading (2 sites)', quantity: 6, unit: 'Days', pricePerUnit: 175, applyMarkup: true, profitMarkup: 13.64 },
        { id: 'bm2', description: 'CSCS Checks', quantity: 8, unit: 'Item', pricePerUnit: 50, applyMarkup: false, profitMarkup: 0 },
      ],
      supportCosts: [
        { id: 'bs1', position: 'Contract Manager (0.25 FTE)', daysRequiredPA: 60, fte: 0.25, estimatedSalary: 48000, car: 4500, fuelEstimate: 2000, niRate: 15, pensionRate: 3, employmentCost: 48000 * 0.25 * 1.18 + 4500 * 0.25 + 2000 * 0.25, shareOfTotal: 0, profitMarkup: 13.64, costFactoredIn: 0 },
      ],
      oneOffCosts: [
        { id: 'oc3', description: 'SFG20 Licence', amount: 2500, applyMarkup: false, profitMarkup: 0, notes: 'Annual SFG20 task library access' },
        { id: 'oc4', description: 'SimPRO CAFM Licence', amount: 1200, applyMarkup: false, profitMarkup: 0 },
      ],
      profitMarginPct: 17, annualAdjustmentPct: 2.5, vatRate: 20,
      notes: 'Heritage building (Grade A listed equivalent). All works must comply with Historic Environment Scotland guidance. Theatrical environments — dust and vibration sensitive.',
      createdBy: 'S. Chen', daysAgo: 30, updatedDaysAgo: 8,
    }),

    // ── Q3: Virtual FM Ltd – 300 Bath Street / 39-41 George Street Edinburgh ──
    buildQuote({
      id: 'demo-q3', reference: 'QT-2025-003',
      quoteType: 'tender', businessEntity: 'virtual_facilities_services',
      clientName: 'Virtual FM Ltd',
      sites: [
        { id: 's3a', name: '300 Bath Street (LSPIM Office)', address: 'Tay House, 300 Bath Street, Glasgow, G2 4LH' },
        { id: 's3b', name: '39-41 George Street',            address: '39-41 George Street, Edinburgh, EH2 2HN' },
        { id: 's3c', name: '133 Finnieston Street',          address: '133 Finnieston Street, Glasgow, G3 8GJ' },
      ],
      regionId: 'scotland', regionName: 'Scotland', status: 'draft',
      assets: [
        // 300 Bath Street
        makeAsset('c1','s3a','mechanical','Plant Room','Biomass Boiler Full Service','Windhager',1,'SFG 05-38','Biomass Boiler',{'1W':0.25,'1M':0.5,'3M':1.5,'6M':2,'12M':4}),
        makeAsset('c2','s3a','ac_refrigeration','Server Room','Room Air Conditioners Service','Daikin',4,'SFG 17-02','Room Air Conditioners',{'6M':1.5,'12M':2.5}),
        makeAsset('c3','s3a','electrical','Main Switchroom','DB Inspection & Thermo','Schneider',4,'SFG 56-01','Distribution Board – Inspection & Thermographic Survey',{'12M':4}),
        makeAsset('c4','s3a','electrical','Office Floors','Emergency Lighting','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('c5','s3a','electrical','Main Entrance','Access Control Service','Paxton',1,'SFG 56-50','Access Control System – Annual Full Service',{'6M':2,'12M':4}),
        // 39-41 George Street Edinburgh
        makeAsset('c6','s3b','mechanical','Plant Room','Air to Water Heat Pump','Mitsubishi',2,'SFG 05-39','Air to Water Heat Pump',{'3M':0.5,'6M':1.5,'12M':3}),
        makeAsset('c7','s3b','mechanical','AHU Room','Fire/Smoke Dampers','Trox',8,'SFG 05-56','Ducting – Combined Fire/Smoke Dampers used in Ventilation Systems',{'12M':2}),
        makeAsset('c8','s3b','electrical','Main Switchroom','DB Inspection & Thermo','ABB',3,'SFG 56-01','Distribution Board – Inspection & Thermographic Survey',{'12M':4}),
        makeAsset('c9','s3b','electrical','All Floors','Emergency Lighting Monthly','Ansell',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('c10','s3b','electrical','Roof','Lightning Protection','N/A',1,'SFG 56-30','Lightning Protection – Annual Inspection & Testing',{'12M':3}),
        makeAsset('c11','s3b','fabric','All Floors','Fire Door Inspection','N/A',18,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        // 133 Finnieston Street
        makeAsset('c12','s3c','ac_refrigeration','Office Spaces','Room Air Conditioners','Samsung',6,'SFG 17-02','Room Air Conditioners',{'6M':1.5,'12M':2.5}),
        makeAsset('c13','s3c','electrical','Switchroom','DB Inspection','Hager',2,'SFG 56-01','Distribution Board – Inspection & Thermographic Survey',{'12M':4}),
        makeAsset('c14','s3c','electrical','Hallway','Emergency Lighting','Ansell',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('c15','s3c','fabric','Common Areas','Fire Door Annual Inspection','N/A',8,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('c16','s3c','me','Common Areas','Fire Extinguisher CO2','N/A',6,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
      ],
      manualTasks: [
        { id: 'mt1', siteId: 's3a', description: 'Reactive Allowance – General Fabric Works', discipline: 'fabric', location: 'General', makeModel: 'N/A', quantity: 1, hoursPerVisit: 4, visitsPerYear: 6, efficiencyFactor: 1 },
        { id: 'mt2', siteId: 's3b', description: 'Reactive Allowance – M&E Callouts', discipline: 'me', location: 'General', makeModel: 'N/A', quantity: 1, hoursPerVisit: 3, visitsPerYear: 4, efficiencyFactor: 1 },
      ],
      mobilisationCosts: [
        { id: 'cm1', description: 'Asset Survey & Loading (3 sites)', quantity: 5, unit: 'Days', pricePerUnit: 175, applyMarkup: true, profitMarkup: 13.64 },
      ],
      supportCosts: [],
      profitMarginPct: 17, annualAdjustmentPct: 2, vatRate: 20,
      notes: 'Multi-site office portfolio managed by VFM internal FM team. Biomass boiler at 300 Bath St requires specialist certified engineer.',
      createdBy: 'K. Morrison', daysAgo: 3, updatedDaysAgo: 1,
    }),

    // ── Q4: Enable Scotland – Multiple Sites, Glasgow ──
    buildQuote({
      id: 'demo-q4', reference: 'QT-2025-004',
      quoteType: 'tender', businessEntity: 'virtual_facilities_management',
      clientName: 'Enable Scotland (Leading The Way) Ltd',
      sites: [
        { id: 's4a', name: '1 Allnach Place, Easterhouse', address: '1 Allnach Place, Easterhouse, Glasgow, G34 0DW' },
        { id: 's4b', name: '4 Rogart Street, Bridgeton',   address: '4 Rogart Street, Bridgeton, Glasgow, G40 2AA' },
      ],
      regionId: 'scotland', regionName: 'Scotland', status: 'sent',
      assets: [
        // Easterhouse – Residential supported living
        makeAsset('d1','s4a','gas','Plant Room','Gas Boiler Service','Ideal Logic',2,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('d2','s4a','water_hygiene','All Rooms','CO Alarm Inspection','N/A',6,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('d3','s4a','fabric','All Floors','Fire Door Inspection','N/A',8,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('d4','s4a','me','Common Areas','Fire Extinguisher CO2','N/A',4,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
        makeAsset('d5','s4a','electrical','Hallway','Emergency Lighting Monthly Test','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('d6','s4a','electrical','Main Entrance','Access Control Service','Paxton',1,'SFG 56-50','Access Control System – Annual Full Service',{'6M':2,'12M':4}),
        // Bridgeton – Community support hub
        makeAsset('d7','s4b','gas','Plant Room','Gas Boiler Service','Worcester Bosch',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('d8','s4b','mechanical','AHU Room','Air Pressure Relief Dampers','Trox',2,'SFG 05-21','Air Pressure Relief Damper',{'6M':1.5,'12M':2}),
        makeAsset('d9','s4b','water_hygiene','Kitchen/Bathrooms','CO Alarm Inspection','N/A',4,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('d10','s4b','fabric','All Floors','Fire Door Inspection','N/A',12,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('d11','s4b','electrical','Hallway','Emergency Lighting Test','Ansell',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('d12','s4b','me','Common Areas','Fire Extinguisher CO2','N/A',6,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
      ],
      mobilisationCosts: [
        { id: 'dm1', description: 'Asset Survey (2 sites)', quantity: 4, unit: 'Days', pricePerUnit: 175, applyMarkup: true, profitMarkup: 13.64 },
        { id: 'dm2', description: 'DBS Checks', quantity: 6, unit: 'Item', pricePerUnit: 44, applyMarkup: false, profitMarkup: 0 },
      ],
      supportCosts: [],
      oneOffCosts: [
        { id: 'oc5', description: 'SFG20 Licence', amount: 2500, applyMarkup: false, profitMarkup: 0 },
      ],
      profitMarginPct: 15, annualAdjustmentPct: 2, vatRate: 20,
      notes: 'Supported living & community care facilities. All engineers require PVG scheme membership. Sensitive occupants — access coordination critical. DBS enhanced required.',
      createdBy: 'J. Okafor', daysAgo: 20, updatedDaysAgo: 14,
    }),

    // ── Q5: Casa by Moda – Leeds Portfolio (Tannery Row / Bookmakers Place) ──
    buildQuote({
      id: 'demo-q5', reference: 'QT-2025-005',
      quoteType: 'tender', businessEntity: 'virtual_facilities_services',
      clientName: 'SFH Opco Limited (Casa by Moda)',
      sites: [
        { id: 's5a', name: '14 Tannery Row, Kirkstall', address: '14 Tannery Row, Kirkstall, Leeds, LS5 3FL' },
        { id: 's5b', name: '20 Tannery Row, Kirkstall', address: '20 Tannery Row, Kirkstall, Leeds, LS5 3FG' },
        { id: 's5c', name: '36 Tannery Row, Kirkstall', address: '36 Tannery Row, Kirkstall, Leeds, LS5 3FL' },
        { id: 's5d', name: '42 Tannery Row, Kirkstall', address: '42 Tannery Row, Kirkstall, Leeds, LS5 3FG' },
        { id: 's5e', name: '10 Bookmakers Place',       address: '10 Bookmakers Place, Leeds, LS5 3FH' },
      ],
      regionId: 'yorkshire', regionName: 'Yorkshire & Humber', status: 'accepted',
      assets: [
        // Tannery Row 14
        makeAsset('e1','s5a','gas','Plant Room','Gas Boiler Annual Service','Vaillant',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('e2','s5a','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('e3','s5a','water_hygiene','All Rooms','CO Alarm Checks','N/A',3,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('e4','s5a','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        // Tannery Row 20
        makeAsset('e5','s5b','gas','Plant Room','Gas Boiler Annual Service','Ideal Logic',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('e6','s5b','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('e7','s5b','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('e8','s5b','me','Common Areas','Fire Extinguisher CO2','N/A',2,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
        // Tannery Row 36
        makeAsset('e9','s5c','gas','Plant Room','Gas Boiler Annual Service','Worcester Bosch',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('e10','s5c','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('e11','s5c','water_hygiene','All Rooms','CO Alarm Checks','N/A',3,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('e12','s5c','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        // Tannery Row 42
        makeAsset('e13','s5d','gas','Plant Room','Gas Boiler Annual Service','Baxi',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('e14','s5d','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('e15','s5d','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        // 10 Bookmakers Place
        makeAsset('e16','s5e','gas','Plant Room','Gas Boiler Annual Service','Vaillant',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('e17','s5e','mechanical','AHU Room','Air Pressure Relief Dampers','Trox',2,'SFG 05-21','Air Pressure Relief Damper',{'6M':1.5,'12M':2}),
        makeAsset('e18','s5e','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('e19','s5e','electrical','Main Entrance','Access Control Service','Paxton',1,'SFG 56-50','Access Control System – Annual Full Service',{'6M':2,'12M':4}),
        makeAsset('e20','s5e','fabric','Building Envelope','Fire Door Inspection','N/A',6,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('e21','s5e','me','Common Areas','Fire Extinguisher CO2','N/A',4,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
      ],
      mobilisationCosts: [
        { id: 'em1', description: 'Asset Loading (5 sites)', quantity: 5, unit: 'Days', pricePerUnit: 175, applyMarkup: true, profitMarkup: 13.64 },
      ],
      supportCosts: [],
      profitMarginPct: 17, annualAdjustmentPct: 2, vatRate: 20,
      notes: 'Build-to-rent portfolio – Yorkshire region. Access via managing agent. Consistent specification across all units.',
      createdBy: 'K. Morrison', daysAgo: 45, updatedDaysAgo: 35,
    }),

    // ── Q6: Genus Communications – 216 West George Street, Glasgow ──
    buildQuote({
      id: 'demo-q6', reference: 'QT-2026-001',
      quoteType: 'tender', businessEntity: 'virtual_facilities_management',
      clientName: 'Genus Communications',
      sites: [
        { id: 's6a', name: '216 West George Street', address: '216 West George Street, Glasgow, G2 2PQ' },
      ],
      regionId: 'scotland', regionName: 'Scotland', status: 'draft',
      assets: [
        makeAsset('f1','s6a','mechanical','Roof','Air to Water Heat Pump','Samsung',2,'SFG 05-39','Air to Water Heat Pump',{'3M':0.5,'6M':1.5,'12M':3}),
        makeAsset('f2','s6a','ac_refrigeration','Server Room / IT Suite','Room Air Conditioners','Daikin',6,'SFG 17-02','Room Air Conditioners',{'6M':1.5,'12M':2.5}),
        makeAsset('f3','s6a','ac_refrigeration','MD Offices','ACI / TM44 Inspection','N/A',1,'SFG 17-01','Air Conditioning Inspection (ACI / TM44) – England, Wales & NI',{'12M':4}),
        makeAsset('f4','s6a','electrical','Main Switchroom','DB Inspection & Thermographic Survey','ABB',4,'SFG 56-01','Distribution Board – Inspection & Thermographic Survey',{'12M':4}),
        makeAsset('f5','s6a','electrical','All Floors','Emergency Lighting Monthly Test','Thorn',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('f6','s6a','electrical','Basement','Standby Generator Full Service','Caterpillar',1,'SFG 56-20','Standby Generator – Full Load Test & Service',{'1M':0.5,'6M':2,'12M':4}),
        makeAsset('f7','s6a','electrical','Roof','Lightning Protection','N/A',1,'SFG 56-30','Lightning Protection – Annual Inspection & Testing',{'12M':3}),
        makeAsset('f8','s6a','electrical','Main Entrance / Reception','Access Control Annual Service','Gallagher',2,'SFG 56-50','Access Control System – Annual Full Service',{'6M':2,'12M':4}),
        makeAsset('f9','s6a','mechanical','Ventilation Plant','Ducting – Attenuators','Trox',6,'SFG 05-51','Ducting – Attenuators',{'12M':1}),
        makeAsset('f10','s6a','mechanical','Ventilation Plant','Combined Fire/Smoke Dampers','Trox',10,'SFG 05-56','Ducting – Combined Fire/Smoke Dampers used in Ventilation Systems',{'12M':2}),
        makeAsset('f11','s6a','fabric','All Floors','Fire Door Annual Inspection','N/A',16,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('f12','s6a','me','All Floors','Fire Extinguisher CO2 Annual','N/A',12,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
      ],
      mobilisationCosts: [
        { id: 'fm1', description: 'Asset Survey & Loading', quantity: 3, unit: 'Days', pricePerUnit: 175, applyMarkup: true, profitMarkup: 13.64 },
        { id: 'fm2', description: 'SimPRO Licence Setup', quantity: 1, unit: 'Item', pricePerUnit: 1200, applyMarkup: true, profitMarkup: 13.64 },
      ],
      supportCosts: [
        { id: 'fs1', position: 'Contract Manager (0.5 FTE)', daysRequiredPA: 120, fte: 0.5, estimatedSalary: 48000, car: 4500, fuelEstimate: 2000, niRate: 15, pensionRate: 3, employmentCost: 48000 * 0.5 * 1.18 + 4500 * 0.5 + 2000 * 0.5, shareOfTotal: 0, profitMarkup: 13.64, costFactoredIn: 0 },
      ],
      oneOffCosts: [
        { id: 'oc6', description: 'SFG20 Licence', amount: 2500, applyMarkup: false, profitMarkup: 0 },
        { id: 'oc7', description: 'SimPRO CAFM Licence', amount: 1200, applyMarkup: false, profitMarkup: 0 },
      ],
      profitMarginPct: 18, annualAdjustmentPct: 3, vatRate: 20,
      notes: 'Commercial office over 5 floors. Sensitive communications infrastructure — all works require prior written approval from IT manager. Server room access restricted to vetted engineers only.',
      createdBy: 'K. Morrison', daysAgo: 2, updatedDaysAgo: 0,
    }),

    // ── Q7: Casa by Moda – Armthorpe, Doncaster + Hardy Crescent ──
    buildQuote({
      id: 'demo-q7', reference: 'QT-2026-002',
      quoteType: 'tender', businessEntity: 'virtual_facilities_management',
      clientName: 'SFH Opco Limited (Casa by Moda)',
      sites: [
        { id: 's7a', name: '16 Mason Drive, Armthorpe', address: '16 Mason Drive, Armthorpe, Doncaster, DN3 3RB' },
        { id: 's7b', name: '18 Hardy Crescent',          address: '18 Hardy Crescent, Armthorpe, Doncaster, DN3 3FZ' },
        { id: 's7c', name: '18 Tannery Row, Kirkstall',  address: '18 Tannery Row, Kirkstall, Leeds, LS5 3FG' },
        { id: 's7d', name: '22 Tannery Row, Kirkstall',  address: '22 Tannery Row, Kirkstall, Leeds, LS5 3FG' },
      ],
      regionId: 'north_east', regionName: 'North East', status: 'accepted',
      assets: [
        // Mason Drive
        makeAsset('g1','s7a','gas','Plant Room','Gas Boiler Annual Service','Vaillant',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('g2','s7a','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('g3','s7a','water_hygiene','All Rooms','CO Alarm Checks','N/A',3,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('g4','s7a','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('g5','s7a','me','Common Areas','Fire Extinguisher CO2','N/A',2,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
        // Hardy Crescent
        makeAsset('g6','s7b','gas','Plant Room','Gas Boiler Annual Service','Worcester Bosch',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('g7','s7b','electrical','Hallway','Emergency Lighting Monthly','Ansell',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('g8','s7b','water_hygiene','All Rooms','CO Alarm Checks','N/A',3,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('g9','s7b','fabric','Building Envelope','Fire Door Inspection','N/A',5,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        // Tannery Row 18
        makeAsset('g10','s7c','gas','Plant Room','Gas Boiler Annual Service','Baxi',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('g11','s7c','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('g12','s7c','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
        makeAsset('g13','s7c','me','Common Areas','Fire Extinguisher CO2','N/A',2,'SFG 20-11','Fire Extinguishers – Carbon Dioxide',{'1M':0.1,'12M':0.25}),
        // Tannery Row 22
        makeAsset('g14','s7d','gas','Plant Room','Gas Boiler Annual Service','Ideal Logic',1,'SFG 05-01','Atmospheric Gas Burner – Free Standing Boiler',{'1M':0.5,'3M':1,'12M':3}),
        makeAsset('g15','s7d','electrical','Hallway','Emergency Lighting Monthly','Eaton',1,'SFG 56-10','Emergency Lighting – Monthly Function Test & Annual Duration Test',{'1M':0.5,'12M':4}),
        makeAsset('g16','s7d','water_hygiene','All Rooms','CO Alarm Checks','N/A',3,'SFG 23-10','Carbon Monoxide Alarms – Residential',{'1M':0.1,'5M':0.25,'12M':0.5}),
        makeAsset('g17','s7d','fabric','Building Envelope','Fire Door Inspection','N/A',4,'SFG 20-01','Fire Doors',{'1M':0.25,'3M':0.5,'6M':1,'12M':2}),
      ],
      mobilisationCosts: [
        { id: 'gm1', description: 'Asset Loading (4 sites)', quantity: 4, unit: 'Days', pricePerUnit: 175, applyMarkup: true, profitMarkup: 13.64 },
      ],
      supportCosts: [],
      profitMarginPct: 17, annualAdjustmentPct: 2.5, vatRate: 20,
      notes: 'North East & Yorkshire BTR portfolio. Coordinated access via Casa by Moda tenancy team — minimum 24h notice.',
      createdBy: 'S. Chen', daysAgo: 60, updatedDaysAgo: 15,
    }),
  ]
}

export function getQuotes(): Quote[] {
  if (typeof window === 'undefined') return []
  if (!localStorage.getItem(KEYS.SEEDED)) {
    const demos = seed()
    localStorage.setItem(KEYS.QUOTES, JSON.stringify(demos))
    localStorage.setItem(KEYS.SEEDED, '1')
    return demos
  }
  const s = localStorage.getItem(KEYS.QUOTES)
  if (!s) return []
  const raw: any[] = JSON.parse(s)
  return raw.map(migrateQuote)
}

export function saveQuote(quote: Quote) {
  const calculated = calculateQuoteTotals(quote)
  const quotes = getQuotes()
  const i = quotes.findIndex((q) => q.id === calculated.id)
  if (i >= 0) quotes[i] = calculated
  else quotes.unshift(calculated)
  localStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes))
}

export function deleteQuote(id: string) {
  localStorage.setItem(KEYS.QUOTES, JSON.stringify(getQuotes().filter((q) => q.id !== id)))
}

export function getQuote(id: string) {
  return getQuotes().find((q) => q.id === id)
}

export function generateReference(type: QuoteType = 'tender'): string {
  const yr = new Date().getFullYear()
  const prefix = type === 'quote' ? 'SW' : 'QT'
  const n = getQuotes().filter((q) => q.reference.includes(`${prefix}-${yr}`)).length + 1
  return `${prefix}-${yr}-${String(n).padStart(3, '0')}`
}
