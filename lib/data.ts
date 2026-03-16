import type { SFG20Task, Region, RateCard, Discipline, FrequencyBand } from './types'

// ── Sections ─────────────────────────────────────────────────────────────────

export const SFG20_SECTIONS = [
  { code: 'AC', name: 'A/C & Mechanical' },
  { code: 'G',  name: 'Gas & Boilers' },
  { code: 'V',  name: 'Ventilation & Ductwork' },
  { code: 'F',  name: 'Fire & Life Safety' },
  { code: 'W',  name: 'Water Hygiene & Safety' },
  { code: 'J',  name: 'Electrical' },
]

// ── SFG20 Asset Library ───────────────────────────────────────────────────────
// Real asset types from SFG20. Each asset can have multiple service level bands.
// sfgHours = hours per visit for each active frequency band.
// Assets with the same code but different customised variants are listed separately.

export const SFG20_TASKS: SFG20Task[] = [
  // ── A/C & Mechanical ──────────────────────────────────────────────────────
  {
    id: 'aci-tm44',
    code: 'SFG 17-01',
    section: 'A/C & Mechanical',
    sectionCode: 'AC',
    discipline: 'ac_refrigeration',
    description: 'Air Conditioning Inspection (ACI / TM44) – England, Wales & NI',
    sfgHours: { '12M': 4 },
    notes: '60-month statutory cycle; hours shown as annual equivalent',
  },
  {
    id: 'air-pressure-relief-damper',
    code: 'SFG 05-21',
    section: 'A/C & Mechanical',
    sectionCode: 'AC',
    discipline: 'mechanical',
    description: 'Air Pressure Relief Damper',
    sfgHours: { '6M': 1.5, '12M': 2 },
  },
  {
    id: 'air-to-water-heat-pump',
    code: 'SFG 05-39',
    section: 'A/C & Mechanical',
    sectionCode: 'AC',
    discipline: 'mechanical',
    description: 'Air to Water Heat Pump',
    sfgHours: { '3M': 0.5, '6M': 1.5, '12M': 3, '12M-5Y': 1 },
    notes: '5Y band shown as 12M amortised',
  },
  {
    id: 'room-air-conditioners',
    code: 'SFG 17-02',
    section: 'A/C & Mechanical',
    sectionCode: 'AC',
    discipline: 'ac_refrigeration',
    description: 'Room Air Conditioners',
    sfgHours: { '6M': 1.5, '12M': 2.5 },
  },

  // ── Gas & Boilers ──────────────────────────────────────────────────────────
  {
    id: 'atm-gas-burner-freestanding',
    code: 'SFG 05-01',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'gas',
    description: 'Atmospheric Gas Burner – Free Standing Boiler',
    sfgHours: { '1M': 0.5, '3M': 1, '12M': 3 },
  },
  {
    id: 'biomass-boiler',
    code: 'SFG 05-38',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'mechanical',
    description: 'Biomass Boiler',
    sfgHours: { '1W': 0.25, '1M': 0.5, '2M': 1, '3M': 1.5, '6M': 2, '12M': 4 },
    notes: 'Also includes 1D and 3D bands for daily/3-day checks',
  },
  {
    id: 'biomass-boiler-c0064-1',
    code: 'C05-38-0064-1',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'mechanical',
    description: 'Biomass Boiler (Customised C05-38-0064-1)',
    sfgHours: { '1W': 0.25, '1M': 0.5, '3M': 1.5, '4M': 1.75, '6M': 2, '12M': 4 },
  },
  {
    id: 'biomass-boiler-c0064-1-0004',
    code: 'C05-38-0064-1-0004',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'mechanical',
    description: 'Biomass Boiler (Customised C05-38-0064-1-0004)',
    sfgHours: { '3M': 1.5, '4M': 1.75, '6M': 2, '12M': 4 },
  },
  {
    id: 'biomass-boiler-c0064-1-0005',
    code: 'C05-38-0064-1-0005',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'mechanical',
    description: 'Biomass Boiler (Customised C05-38-0064-1-0005)',
    sfgHours: { '1W': 0.25, '1M': 0.5, '3M': 1.5, '4M': 1.75, '6M': 2, '12M': 4 },
  },
  {
    id: 'biomass-boiler-c0064-1-0011',
    code: 'C05-38-0064-1-0011',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'mechanical',
    description: 'Biomass Boiler (Customised C05-38-0064-1-0011)',
    sfgHours: { '1W': 0.25, '1M': 0.5, '3M': 1.5, '4M': 1.75, '6M': 2, '12M': 4 },
  },
  {
    id: 'biomass-boiler-c0064-1-0013',
    code: 'C05-38-0064-1-0013',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'mechanical',
    description: 'Biomass Boiler (Customised C05-38-0064-1-0013)',
    sfgHours: { '1W': 0.25, '1M': 0.5, '3M': 1.5, '4M': 1.75, '6M': 2, '12M': 4 },
  },
  {
    id: 'biomass-boiler-c0064-1-0015',
    code: 'C05-38-0064-1-0015',
    section: 'Gas & Boilers',
    sectionCode: 'G',
    discipline: 'mechanical',
    description: 'Biomass Boiler (Customised C05-38-0064-1-0015)',
    sfgHours: { '1W': 0.25, '1M': 0.5, '3M': 1.5, '4M': 1.75, '6M': 2, '12M': 4 },
  },

  // ── Ventilation & Ductwork ─────────────────────────────────────────────────
  {
    id: 'ducting-attenuators',
    code: 'SFG 05-51',
    section: 'Ventilation & Ductwork',
    sectionCode: 'V',
    discipline: 'mechanical',
    description: 'Ducting – Attenuators',
    sfgHours: { '12M': 1 },
  },
  {
    id: 'ducting-fire-smoke-dampers',
    code: 'SFG 05-56',
    section: 'Ventilation & Ductwork',
    sectionCode: 'V',
    discipline: 'mechanical',
    description: 'Ducting – Combined Fire/Smoke Dampers used in Ventilation Systems',
    sfgHours: { '12M': 2 },
  },

  // ── Fire & Life Safety ────────────────────────────────────────────────────
  {
    id: 'fire-doors',
    code: 'SFG 20-01',
    section: 'Fire & Life Safety',
    sectionCode: 'F',
    discipline: 'fabric',
    description: 'Fire Doors',
    sfgHours: { '1M': 0.25, '3M': 0.5, '6M': 1, '12M': 2 },
  },
  {
    id: 'fire-extinguishers-co2',
    code: 'SFG 20-11',
    section: 'Fire & Life Safety',
    sectionCode: 'F',
    discipline: 'me',
    description: 'Fire Extinguishers – Carbon Dioxide',
    sfgHours: { '1M': 0.1, '12M': 0.25 },
    notes: '120M (10-year) extended service also available',
  },

  // ── Water Hygiene ──────────────────────────────────────────────────────────
  {
    id: 'co-alarms-residential',
    code: 'SFG 23-10',
    section: 'Water Hygiene & Safety',
    sectionCode: 'W',
    discipline: 'water_hygiene',
    description: 'Carbon Monoxide Alarms – Residential and Domestic (England)',
    sfgHours: { '1M': 0.1, '5M': 0.25, '12M': 0.5 },
    notes: '1D (daily check) band also available',
  },

  // ── Electrical ────────────────────────────────────────────────────────────
  {
    id: 'j-db-inspect',
    code: 'SFG 56-01',
    section: 'Electrical',
    sectionCode: 'J',
    discipline: 'electrical',
    description: 'Distribution Board – Inspection & Thermographic Survey',
    sfgHours: { '12M': 4 },
  },
  {
    id: 'j-em-monthly',
    code: 'SFG 56-10',
    section: 'Electrical',
    sectionCode: 'J',
    discipline: 'electrical',
    description: 'Emergency Lighting – Monthly Function Test & Annual Duration Test',
    sfgHours: { '1M': 0.5, '12M': 4 },
  },
  {
    id: 'j-lightning',
    code: 'SFG 56-30',
    section: 'Electrical',
    sectionCode: 'J',
    discipline: 'electrical',
    description: 'Lightning Protection – Annual Inspection & Testing',
    sfgHours: { '12M': 3 },
  },
  {
    id: 'j-access-ctrl',
    code: 'SFG 56-50',
    section: 'Electrical',
    sectionCode: 'J',
    discipline: 'electrical',
    description: 'Access Control System – Annual Full Service',
    sfgHours: { '6M': 2, '12M': 4 },
  },
  {
    id: 'j-generator',
    code: 'SFG 56-20',
    section: 'Electrical',
    sectionCode: 'J',
    discipline: 'electrical',
    description: 'Standby Generator – Full Load Test & Service',
    sfgHours: { '1M': 0.5, '6M': 2, '12M': 4 },
  },
]

// ── Regions ───────────────────────────────────────────────────────────────────

export const REGIONS: Region[] = [
  { id: 'london',       name: 'London' },
  { id: 'south_east',   name: 'South East' },
  { id: 'south_west',   name: 'South West' },
  { id: 'east_england', name: 'East of England' },
  { id: 'midlands',     name: 'Midlands' },
  { id: 'north_west',   name: 'North West' },
  { id: 'north_east',   name: 'North East' },
  { id: 'yorkshire',    name: 'Yorkshire & Humber' },
  { id: 'scotland',     name: 'Scotland' },
  { id: 'wales',        name: 'Wales' },
]

// ── Discipline labels & colours ───────────────────────────────────────────────

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  electrical:      'Electrical',
  mechanical:      'Mechanical',
  gas:             'Gas Engineer',
  ac_refrigeration:'A/C Engineer',
  fabric:          'Fabric Engineer',
  me:              'M&E Engineer',
  water_hygiene:   'Water Hygiene Engineer',
}

export const DISCIPLINE_COLORS: Record<Discipline, string> = {
  electrical:      'bg-amber-100 text-amber-800',
  mechanical:      'bg-blue-100 text-blue-800',
  gas:             'bg-orange-100 text-orange-800',
  ac_refrigeration:'bg-cyan-100 text-cyan-800',
  fabric:          'bg-stone-100 text-stone-800',
  me:              'bg-indigo-100 text-indigo-800',
  water_hygiene:   'bg-teal-100 text-teal-800',
}

export const DISCIPLINES: Discipline[] = [
  'electrical', 'mechanical', 'gas', 'ac_refrigeration', 'fabric', 'me', 'water_hygiene',
]

// ── Default Rate Cards ────────────────────────────────────────────────────────
// Base rates and sales rates match the PDF labour calculator output.
// London sales rates from PDF: Electrical £42.73, Mechanical £41.58, Gas £43.65, A/C £43.65, Fabric £38.19, M&E £42.84, Water Hygiene £39.04

function makeRates(
  baseRates: Record<Discipline, number>,
  upliftPct: number
): RateCard['disciplines'] {
  const result = {} as RateCard['disciplines']
  for (const d of DISCIPLINES) {
    const base = baseRates[d]
    const sales = parseFloat((base * (1 + upliftPct / 100)).toFixed(2))
    result[d] = {
      baseRate: base,
      salesRate: sales,
      ot15Rate: parseFloat((sales * 1.5 - base * 0.5).toFixed(2)),
      ot2Rate:  parseFloat((sales * 2 - base).toFixed(2)),
    }
  }
  return result
}

export const DEFAULT_RATE_CARDS: RateCard[] = [
  {
    regionId: 'london',
    disciplines: makeRates(
      { electrical: 20.68, mechanical: 20.00, gas: 21.22, ac_refrigeration: 21.22, fabric: 18.00, me: 20.68, water_hygiene: 18.50 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'south_east',
    disciplines: makeRates(
      { electrical: 19.50, mechanical: 18.80, gas: 20.00, ac_refrigeration: 20.00, fabric: 16.80, me: 19.50, water_hygiene: 17.40 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'south_west',
    disciplines: makeRates(
      { electrical: 18.00, mechanical: 17.40, gas: 18.50, ac_refrigeration: 18.50, fabric: 15.50, me: 18.00, water_hygiene: 16.00 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'east_england',
    disciplines: makeRates(
      { electrical: 18.00, mechanical: 17.40, gas: 18.50, ac_refrigeration: 18.50, fabric: 15.50, me: 18.00, water_hygiene: 16.00 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'midlands',
    disciplines: makeRates(
      { electrical: 17.50, mechanical: 16.80, gas: 18.00, ac_refrigeration: 18.00, fabric: 15.00, me: 17.50, water_hygiene: 15.50 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'north_west',
    disciplines: makeRates(
      { electrical: 16.80, mechanical: 16.20, gas: 17.20, ac_refrigeration: 17.20, fabric: 14.50, me: 16.80, water_hygiene: 15.00 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'north_east',
    disciplines: makeRates(
      { electrical: 16.00, mechanical: 15.50, gas: 16.50, ac_refrigeration: 16.50, fabric: 14.00, me: 16.00, water_hygiene: 14.50 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'yorkshire',
    disciplines: makeRates(
      { electrical: 16.50, mechanical: 15.80, gas: 16.80, ac_refrigeration: 16.80, fabric: 14.20, me: 16.50, water_hygiene: 14.80 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'scotland',
    disciplines: makeRates(
      { electrical: 17.20, mechanical: 16.50, gas: 17.80, ac_refrigeration: 17.80, fabric: 14.80, me: 17.20, water_hygiene: 15.20 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
  {
    regionId: 'wales',
    disciplines: makeRates(
      { electrical: 16.50, mechanical: 15.80, gas: 17.00, ac_refrigeration: 17.00, fabric: 14.20, me: 16.50, water_hygiene: 14.80 },
      17
    ),
    overheadAndProfitLabour: 17,
    overheadAndProfitMaterials: 17,
    sfgEfficiencyIndex: 1.0,
  },
]
