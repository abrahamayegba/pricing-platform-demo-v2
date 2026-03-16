'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  HelpCircle, Calculator, Percent, TrendingUp, DollarSign,
  Layers, Clock, Building2, AlertTriangle, ChevronRight,
  Wrench, FileText, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'overview',     label: 'How It Works',          icon: Calculator },
  { id: 'ppm',          label: 'PPM Calculation',        icon: Wrench },
  { id: 'criticality',  label: 'Criticality Levels',     icon: AlertTriangle },
  { id: 'rates',        label: 'Regional Rates',         icon: BarChart2 },
  { id: 'mobilisation', label: 'Mobilisation Costs',     icon: Layers },
  { id: 'support',      label: 'Support & Overhead',     icon: Building2 },
  { id: 'margin',       label: 'Profit Margin',          icon: Percent },
  { id: 'vat',          label: 'VAT & Annual Uplift',    icon: TrendingUp },
  { id: 'totals',       label: 'Final Price Build-Up',   icon: DollarSign },
  { id: 'terms',        label: 'Key Terms',              icon: FileText },
] as const

type SectionId = typeof SECTIONS[number]['id']

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg bg-muted/60 border px-4 py-3 font-mono text-xs text-foreground leading-relaxed">
      {children}
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 my-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-100">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

function DefList({ items }: { items: { term: string; def: string }[] }) {
  return (
    <dl className="space-y-2 my-3">
      {items.map(({ term, def }) => (
        <div key={term} className="grid grid-cols-[120px_1fr] gap-2 text-xs">
          <dt className="font-semibold text-foreground/80 truncate">{term}</dt>
          <dd className="text-muted-foreground leading-relaxed">{def}</dd>
        </div>
      ))}
    </dl>
  )
}

function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'overview':
      return (
        <div className="space-y-3 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            The pricing platform builds a fully costed annual PPM contract price from the ground up using
            SFG20 task schedules, regional engineer rates, and your chosen commercial parameters.
          </p>
          <p className="text-muted-foreground">There are five cost layers:</p>
          <ol className="space-y-2">
            {[
              ['PPM Labour', 'SFG20 task hours × engineer rate × quantity × efficiency'],
              ['Mobilisation', 'One-time costs to set up the contract (surveys, CAFM, licences)'],
              ['Support & Overhead', 'Management and overhead staff allocated to this contract'],
              ['One-Off Costs', 'Fixed items such as SFG20 licences or CAFM subscriptions'],
              ['Profit Margin', 'Applied to the sum of all four layers above'],
            ].map(([title, desc], i) => (
              <li key={i} className="flex gap-3 text-xs">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>
                  <strong className="text-foreground">{title}</strong>
                  <span className="text-muted-foreground"> — {desc}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground text-xs">
            VAT is added last to the total price. Annual uplift is applied to Years 2 and 3.
          </p>
        </div>
      )

    case 'ppm':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each asset line uses an SFG20 task code with defined hours per frequency band. The annual cost
            is calculated as follows:
          </p>
          <Formula>
            Annual Hours (per band) =<br />
            &nbsp;&nbsp;Hours Per Visit × Visits Per Year × Quantity × Efficiency Factor
          </Formula>
          <Formula>
            Total Annual Hours = Sum of all active band hours<br /><br />
            Annual Cost = Total Annual Hours × Sales Rate (£/hr)
          </Formula>
          <p className="text-xs font-semibold mt-2">Frequency Bands & Visits Per Year</p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Band</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Visits/yr</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ['1W', 'Weekly', 52],
                  ['1M', 'Monthly', 12],
                  ['2M', '2-Monthly', 6],
                  ['3M', 'Quarterly', 4],
                  ['4M', '4-Monthly', 3],
                  ['5M', '5-Monthly', 2.4],
                  ['6M', '6-Monthly', 2],
                  ['12M', 'Annual', 1],
                ].map(([band, name, visits]) => (
                  <tr key={String(band)} className="hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono font-medium">{band}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-semibold mt-2">Efficiency Factor</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The efficiency factor (default 1.0) allows you to apply a productivity gain or loss per band.
            For example, 0.9 means engineers complete the task in 90% of the SFG20 benchmark time
            (e.g. due to multi-site route efficiency). Values above 1.0 increase the costed hours.
          </p>
          <Note>
            Only bands selected by the criticality level are included in the annual cost.
            Inactive bands contribute zero hours regardless of the SFG20 schedule.
          </Note>
        </div>
      )

    case 'criticality':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Criticality controls which frequency bands are active for an asset. SFG20 tasks specify
            hours across multiple bands — criticality selects a subset appropriate to the risk level.
          </p>
          <div className="space-y-2">
            {[
              {
                level: 'Red',
                sub: 'Statutory & Mandatory',
                color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
                desc: 'All available frequency bands are active. Used for life-safety or statutory compliance assets (e.g. fire systems, legionella, emergency lighting). No band is skipped.',
              },
              {
                level: 'Amber',
                sub: 'Business Critical',
                color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
                desc: 'All bands except the most frequent are active. Appropriate for operationally important assets where maximum frequency is not required.',
              },
              {
                level: 'Pink',
                sub: 'Recommended',
                color: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
                desc: 'Only quarterly (3M) and less frequent bands are active. Suitable for assets that are important but not business-critical on a monthly cycle.',
              },
              {
                level: 'Green',
                sub: 'Low Priority',
                color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
                desc: 'Only 6-Monthly and Annual bands are active. Used for low-risk assets where infrequent servicing is sufficient.',
              },
              {
                level: 'Custom',
                sub: 'User Defined',
                color: 'bg-secondary text-secondary-foreground border-border',
                desc: 'You manually select which frequency bands to activate. All other bands are inactive.',
              },
            ].map(({ level, sub, color, desc }) => (
              <div key={level} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', color)}>{level}</Badge>
                  <span className="text-xs font-medium text-muted-foreground">{sub}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'rates':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each region has a rate card defining the sales rate (charged to client) and the base cost rate
            (your cost) for each engineering discipline.
          </p>
          <DefList items={[
            { term: 'Sales Rate',  def: 'The hourly rate charged to the client for this discipline in this region. Used to compute annual cost per asset line.' },
            { term: 'Base Rate',   def: 'Your internal cost rate (i.e. what you pay engineers). Used in the Rates page to show internal margin.' },
            { term: 'Discipline',  def: 'Engineering trade — Gas, Mechanical, Electrical, AC / Refrigeration, Water Hygiene, Fabric, M&E.' },
          ]} />
          <p className="text-xs font-semibold">Discipline Rate Formula</p>
          <Formula>
            Line Annual Cost = Flexed Hours × Sales Rate (£/hr)
          </Formula>
          <Note>
            Rates are configurable per region in the Regional Rates page. Changing a rate card
            affects all future calculations but does not retroactively update saved quotes.
          </Note>
        </div>
      )

    case 'mobilisation':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mobilisation costs cover one-time expenses to set up a contract: asset surveys, CAFM loading,
            software licences, induction days, and similar.
          </p>
          <p className="text-xs font-semibold">With markup applied:</p>
          <Formula>
            Line Total = Quantity × Unit Price × (1 + Markup %/100)
          </Formula>
          <p className="text-xs font-semibold">Without markup:</p>
          <Formula>
            Line Total = Quantity × Unit Price
          </Formula>
          <p className="text-xs font-semibold">Mobilisation Total</p>
          <Formula>
            Mobilisation Total = Sum of all mobilisation line totals
          </Formula>
          <DefList items={[
            { term: 'Markup',      def: 'Percentage added to cover admin overhead on the mobilisation item. Default is the Mobilisation Markup set in Settings.' },
            { term: 'Unit',        def: 'Days, Items, Hours — used to describe the quantity unit for the line description.' },
          ]} />
          <Note>
            Mobilisation is a one-time cost included in Year 1 only. It does not recur in Year 2 or 3
            projections.
          </Note>
        </div>
      )

    case 'support':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Support costs represent the annual overhead of staff allocated to this contract: contract
            managers, account managers, resident engineers, and administrative support.
          </p>
          <p className="text-xs font-semibold">From Role Rate:</p>
          <Formula>
            Days Per Year = (Hours Per Week / 8) × 52<br />
            Employment Cost = Day Rate × Days Per Year<br />
            Line Total = Employment Cost × (1 + Markup % / 100)
          </Formula>
          <DefList items={[
            { term: 'Day Rate',      def: 'The daily charge rate for the role, taken from the Role Rates table in Settings.' },
            { term: 'Hours/Week',    def: 'How many hours per week this role spends on this specific contract.' },
            { term: 'FTE',          def: 'Full-Time Equivalent — derived from hours per week ÷ 40.' },
            { term: 'Markup',        def: 'Commercial margin applied on top of the employment cost.' },
          ]} />
        </div>
      )

    case 'margin':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Profit margin is applied as a percentage on top of the total cost base (PPM + Mobilisation +
            Support + One-Off costs). This is a gross margin on sales, not a markup on cost.
          </p>
          <Formula>
            Subtotal = PPM Cost + Mobilisation + Support + One-Off<br /><br />
            Margin Amount = Subtotal × (Margin % / 100)<br /><br />
            Total Year 1 (ex. VAT) = Subtotal + Margin Amount
          </Formula>
          <Note>
            This is a margin on the sales price, not a cost-plus markup. A 17% margin means
            17% of the final price is profit — not 17% added to cost (which would be ~20.5%).
          </Note>
          <DefList items={[
            { term: '10% margin',  def: 'Subtotal ÷ 0.90 = Sales Price' },
            { term: '15% margin',  def: 'Subtotal ÷ 0.85 = Sales Price' },
            { term: '17% margin',  def: 'Subtotal ÷ 0.83 = Sales Price' },
            { term: '20% margin',  def: 'Subtotal ÷ 0.80 = Sales Price' },
          ]} />
        </div>
      )

    case 'vat':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            VAT is applied at the standard rate (default 20%) to the total Year 1 price after margin.
            Annual adjustment is a compound uplift applied to Years 2 and 3 for multi-year projections.
          </p>
          <p className="text-xs font-semibold">VAT</p>
          <Formula>
            VAT Amount = Total Year 1 (ex. VAT) × VAT Rate / 100<br />
            Total Year 1 (inc. VAT) = Total Year 1 + VAT Amount
          </Formula>
          <p className="text-xs font-semibold">Annual Uplift (Compound)</p>
          <Formula>
            Year 2 = Year 1 × (1 + Uplift % / 100)<br />
            Year 3 = Year 2 × (1 + Uplift % / 100)
          </Formula>
          <Note>
            VAT is NOT included in the Year 2 / Year 3 uplift projections shown in the
            quote summary. Only the ex-VAT figure is projected forward.
          </Note>
          <DefList items={[
            { term: 'VAT Rate',     def: 'Standard UK rate is 20%. Configurable in Settings for non-standard scenarios.' },
            { term: 'Annual Uplift', def: 'Typically CPI or RPI-linked. Default 2%. Applied as a compound rate.' },
          ]} />
        </div>
      )

    case 'totals':
      return (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground leading-relaxed">
            The full price build-up from first principles to the client-facing total.
          </p>
          <div className="rounded-lg border overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Layer</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Calculation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ['PPM Subtotal',        'Sum of (Flexed Hours × Rate) per asset line'],
                  ['Manual Task Subtotal','Sum of (Hours × Rate) per manual task'],
                  ['Mobilisation Total',  'Sum of (Qty × Price × Markup)'],
                  ['Support Total',       'Sum of (Day Rate × Days × Markup)'],
                  ['One-Off Total',       'Sum of fixed cost items ± markup'],
                  ['Cost Base',           'Sum of all five rows above'],
                  ['Margin Amount',       'Cost Base × Margin % / 100'],
                  ['Total Year 1 ex. VAT','Cost Base + Margin Amount'],
                  ['VAT',                 'Total Year 1 ex. VAT × VAT %'],
                  ['Total Year 1 inc. VAT','Total ex. VAT + VAT'],
                  ['Year 2 (ex. VAT)',    'Year 1 × (1 + Uplift %)'],
                  ['Year 3 (ex. VAT)',    'Year 2 × (1 + Uplift %)'],
                ].map(([layer, calc]) => (
                  <tr key={String(layer)} className="hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-medium">{layer}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-right">{calc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

    case 'terms':
      return (
        <div className="space-y-3 text-sm">
          <DefList items={[
            { term: 'SFG20',           def: 'Standard maintenance specification published by BESA. Defines task codes, descriptions, and hours for all common FM tasks across all disciplines.' },
            { term: 'PPM',             def: 'Planned Preventative Maintenance — scheduled, proactive servicing carried out at defined intervals to prevent breakdown.' },
            { term: 'SFG Code',        def: 'The unique identifier for an SFG20 task (e.g. SFG 05-01). Used to reference the specific maintenance activity and its benchmark hours.' },
            { term: 'Frequency Band',  def: 'The maintenance interval for a task (1W, 1M, 3M, 6M, 12M etc). SFG20 defines different hour values per band for the same task.' },
            { term: 'Efficiency Factor', def: 'A multiplier on SFG20 hours (default 1.0). Reflects real-world productivity vs. the SFG20 benchmark — e.g. 0.9 for a high-volume multi-site contract.' },
            { term: 'Sales Rate',      def: 'The hourly rate charged to clients for a discipline in a region (£/hr). Set in the Regional Rates page.' },
            { term: 'Base Rate',       def: 'The internal cost rate (what you pay engineers). Not shown to clients.' },
            { term: 'Mobilisation',    def: 'One-time setup costs: asset surveys, CAFM loading, DBS checks, inductions, software licences.' },
            { term: 'CAFM',            def: 'Computer-Aided Facilities Management — software used to schedule and track PPM jobs (e.g. SimPRO, Concept Evolution).' },
            { term: 'Profit Margin',   def: 'Gross margin on sales price (not markup on cost). Applied to the sum of all cost layers.' },
            { term: 'Annual Uplift',   def: 'Year-on-year price increase to account for inflation (CPI / RPI). Applied as a compound rate.' },
            { term: 'FTE',             def: 'Full-Time Equivalent. 1.0 FTE = 40 hours/week. 0.25 FTE = 10 hours/week allocated to this contract.' },
            { term: 'PVG',             def: 'Protecting Vulnerable Groups scheme (Scotland) — enhanced disclosure for staff working with vulnerable adults or children.' },
          ]} />
        </div>
      )
  }
}

export function CalculationModelSheet({ trigger }: { trigger?: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 px-3 py-2 h-auto text-sm">
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            <span>Calculation Model</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <Calculator className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-base">Calculation Model</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">How PPM pricing is built from first principles</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left nav */}
          <nav className="w-48 flex-shrink-0 border-r bg-muted/20 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-left w-full transition-colors',
                  activeSection === id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="leading-tight">{label}</span>
                {activeSection === id && <ChevronRight className="w-3 h-3 ml-auto opacity-60 flex-shrink-0" />}
              </button>
            ))}

            <div className="mt-auto px-2 pt-3 border-t">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Based on SFG20 BESA standards. Rates and margins are configurable in Settings.
              </p>
            </div>
          </nav>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold mb-1">
                {SECTIONS.find((s) => s.id === activeSection)?.label}
              </h2>
              <Separator className="mb-4" />
              <SectionContent id={activeSection} />
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
