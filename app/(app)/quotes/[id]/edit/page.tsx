'use client'

import { useState, useCallback, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  SFG20_TASKS, SFG20_SECTIONS, DISCIPLINE_LABELS, DISCIPLINE_COLORS,
  REGIONS, DISCIPLINES,
} from '@/lib/data'
import {
  getRateCard, saveQuote, getQuote, generateReference, calcAssetLine, calcManualTask,
  FREQ_BANDS, getSettings, getRoleRates,
} from '@/lib/store'
import type {
  AssetLine, FrequencyBand, Discipline, Quote,
  MobilisationCost, SupportCost, ManualTask, OneOffCost, Site,
  CriticalityLevel, RoleRate,
} from '@/lib/types'
import {
  VISITS_PER_YEAR, CRITICALITY_LABELS, getCriticalityBands,
  BUSINESS_ENTITIES, BUSINESS_ENTITY_LABELS,
  QUOTE_TYPE_LABELS, QUOTE_TYPE_DESCRIPTIONS,
  CRITICALITY_COLORS, CRITICALITY_SHORT,
} from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import {
  Search, Plus, Trash2, ChevronDown, ChevronUp, Settings2,
  AlertCircle, Building2, MapPin, PlusCircle, ArrowLeft, X,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils-app'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

const BAND_LABELS: Record<FrequencyBand, string> = {
  '1W': 'Weekly', '1M': 'Monthly', '2M': '2-Monthly',
  '3M': 'Quarterly', '4M': '4-Monthly', '5M': '5-Monthly', '6M': '6-Monthly', '12M': 'Annual',
}

const DEFAULT_EFFICIENCY: Record<FrequencyBand, number> = {
  '1W': 1, '1M': 1, '2M': 1, '3M': 1, '4M': 1, '5M': 1, '6M': 1, '12M': 1,
}

function emptyHours(): Record<FrequencyBand, number> {
  return { '1W': 0, '1M': 0, '2M': 0, '3M': 0, '4M': 0, '5M': 0, '6M': 0, '12M': 0 }
}

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const settings = getSettings()

  const [notFound, setNotFound] = useState(false)
  const [quoteReference, setQuoteReference] = useState<string>('')
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string>('')
  const [originalCreatedBy, setOriginalCreatedBy] = useState<string>('')

  // ── Quote metadata ──────────────────────────────────────────────────────────
  const [quoteType, setQuoteType] = useState<'tender' | 'quote'>('tender')
  const [businessEntity, setBusinessEntity] = useState<typeof BUSINESS_ENTITIES[0]>('virtual_facilities_services')
  const [clientName, setClientName] = useState('')
  const [regionId, setRegionId] = useState('london')
  const [profitMarginPct, setProfitMarginPct] = useState(settings.defaultProfitMarginPct)
  const [annualAdjPct, setAnnualAdjPct] = useState(settings.defaultAnnualAdjustmentPct)
  const [vatRate] = useState(settings.vatRate)
  const [notes, setNotes] = useState('')

  // ── Multi-site ───────────────────────────────────────────────────────────────
  const [sites, setSites] = useState<Site[]>([
    { id: `site-${Date.now()}`, name: '', address: '' },
  ])
  const [activeSiteId, setActiveSiteId] = useState<string>(sites[0].id)

  function addSite() {
    const newSite: Site = { id: `site-${Date.now()}`, name: '', address: '' }
    setSites((prev) => [...prev, newSite])
    setActiveSiteId(newSite.id)
  }

  function removeSite(sId: string) {
    if (sites.length === 1) return
    setSites((prev) => prev.filter((s) => s.id !== sId))
    setActiveSiteId((prev) => (prev === sId ? sites[0].id : prev))
    setAssetLines((prev) => prev.filter((l) => l.siteId !== sId))
    setManualTasks((prev) => prev.filter((t) => t.siteId !== sId))
  }

  function updateSite(sId: string, field: keyof Site, value: string) {
    setSites((prev) => prev.map((s) => s.id === sId ? { ...s, [field]: value } : s))
  }

  // ── Asset register ──────────────────────────────────────────────────────────
  const [assetLines, setAssetLines] = useState<AssetLine[]>([])
  const [manualTasks, setManualTasks] = useState<ManualTask[]>([])
  const [mobilisationCosts, setMobilisationCosts] = useState<MobilisationCost[]>([])
  const [supportCosts, setSupportCosts] = useState<SupportCost[]>([])
  const [oneOffCosts, setOneOffCosts] = useState<OneOffCost[]>([])

  // ── Delete confirmation ──────────────────────────────────────────────────────
  type DeleteType = 'asset' | 'manual' | 'mob' | 'support' | 'oneoff'
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: DeleteType; id: string } | null>(null)

  // ── Task browser ────────────────────────────────────────────────────────────
  const [browserOpen, setBrowserOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // ── Add-task dialog (SFG20) ─────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [pendingTask, setPendingTask] = useState<typeof SFG20_TASKS[0] | null>(null)
  const [draftLine, setDraftLine] = useState<Partial<AssetLine>>({})
  const [selectedCriticality, setSelectedCriticality] = useState<CriticalityLevel>('critical')
  const [customBands, setCustomBands] = useState<FrequencyBand[]>([])
  const [targetSiteId, setTargetSiteId] = useState<string>('')

  // ── Edit SFG20 asset dialog ──────────────────────────────────────────────────
  const [editAssetDialogOpen, setEditAssetDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<AssetLine | null>(null)
  const [editAssetDraft, setEditAssetDraft] = useState<Partial<AssetLine>>({})
  const [editAssetCriticality, setEditAssetCriticality] = useState<CriticalityLevel>('critical')
  const [editAssetCustomBands, setEditAssetCustomBands] = useState<FrequencyBand[]>([])

  // ── Manual task dialog ───────────────────────────────────────────────────────
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [draftManual, setDraftManual] = useState<Partial<ManualTask>>({})

  // ── Mobilisation dialog ─────────────────────────────────────────────────────
  const [mobDialogOpen, setMobDialogOpen] = useState(false)
  const [draftMob, setDraftMob] = useState<Partial<MobilisationCost>>({})

  // ── One-off cost dialog ─────────────────────────────────────────────────────
  const [oneOffDialogOpen, setOneOffDialogOpen] = useState(false)
  const [draftOneOff, setDraftOneOff] = useState<Partial<OneOffCost>>({})

  // ── Support costs dialog ────────────────────────────────────────────────────
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  const [draftSupport, setDraftSupport] = useState<Partial<SupportCost>>({})
  const [supportMode, setSupportMode] = useState<'pick' | 'new'>('pick')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [supportHoursPerWeek, setSupportHoursPerWeek] = useState<number>(8)
  const roleRates = getRoleRates()

  const hasMounted = useRef(false)

  // Load existing quote
  useEffect(() => {
    if (hasMounted.current) return
    hasMounted.current = true
    const existing = getQuote(id)
    if (!existing) { setNotFound(true); return }
    setQuoteReference(existing.reference)
    setOriginalCreatedAt(existing.createdAt)
    setOriginalCreatedBy(existing.createdBy ?? '')
    setQuoteType(existing.quoteType ?? 'tender')
    setBusinessEntity(existing.businessEntity ?? 'virtual_facilities_services')
    setClientName(existing.clientName)
    setRegionId(existing.regionId)
    setProfitMarginPct(existing.profitMarginPct)
    setAnnualAdjPct(existing.annualAdjustmentPct)
    setNotes(existing.notes ?? '')
    if (existing.sites && existing.sites.length > 0) {
      setSites(existing.sites)
      setActiveSiteId(existing.sites[0].id)
    }
    setAssetLines(existing.assetLines ?? [])
    setManualTasks(existing.manualTasks ?? [])
    setMobilisationCosts(existing.mobilisationCosts ?? [])
    setSupportCosts(existing.supportCosts ?? [])
    setOneOffCosts(existing.oneOffCosts ?? [])
  }, [id])

  const rateCard = getRateCard(regionId)

  function getSalesRate(discipline: Discipline) {
    return rateCard?.disciplines[discipline]?.salesRate ?? 0
  }

  const calcLine = useCallback((line: AssetLine) => {
    return calcAssetLine(line, getSalesRate(line.discipline))
  }, [regionId, rateCard])

  // ── Asset actions ───────────────────────────────────────────────────────────
  function openAddDialog(task: typeof SFG20_TASKS[0]) {
    setPendingTask(task)
    const availBands = FREQ_BANDS.filter((b) => (task.sfgHours[b] ?? 0) > 0)
    setSelectedCriticality('critical')
    setCustomBands(availBands)
    setTargetSiteId(activeSiteId || sites[0]?.id || '')
    setDraftLine({
      discipline: task.discipline,
      location: '',
      service: task.description,
      makeModel: '',
      quantity: 1,
      sfgCode: task.code,
      sfgDescription: task.description,
      sfgHours: { ...emptyHours(), ...task.sfgHours },
      efficiencyFactor: { ...DEFAULT_EFFICIENCY },
    })
    setAddDialogOpen(true)
  }

  function confirmAdd() {
    if (!pendingTask) return
    const availBands = FREQ_BANDS.filter((b) => ((draftLine.sfgHours?.[b] ?? 0) > 0))
    const activeBands =
      selectedCriticality === 'custom'
        ? customBands
        : getCriticalityBands(availBands, selectedCriticality)

    const line: AssetLine = {
      id: Math.random().toString(36).slice(2),
      siteId: targetSiteId || sites[0]?.id || '',
      discipline: draftLine.discipline ?? pendingTask.discipline,
      location: draftLine.location ?? '',
      service: draftLine.service ?? pendingTask.description,
      makeModel: draftLine.makeModel ?? '',
      quantity: Number(draftLine.quantity) || 1,
      sfgCode: draftLine.sfgCode ?? pendingTask.code,
      sfgDescription: draftLine.sfgDescription ?? pendingTask.description,
      sfgHours: draftLine.sfgHours ?? { ...emptyHours(), ...pendingTask.sfgHours },
      efficiencyFactor: draftLine.efficiencyFactor ?? { ...DEFAULT_EFFICIENCY },
      activeBands,
      criticality: selectedCriticality,
      isManual: false,
    }
    setAssetLines((prev) => [...prev, line])
    setAddDialogOpen(false)
    setPendingTask(null)
  }

  function removeAsset(aId: string) {
    setAssetLines((prev) => prev.filter((l) => l.id !== aId))
  }

  function updateLineQty(aId: string, qty: number) {
    if (qty < 1) return
    setAssetLines((prev) => prev.map((l) => l.id === aId ? { ...l, quantity: qty } : l))
  }

  // ── Edit SFG20 asset ─────────────────────────────────────────────────────────
  function openEditAsset(asset: AssetLine) {
    setEditingAsset(asset)
    setEditAssetDraft({ ...asset })
    setEditAssetCriticality(asset.criticality)
    setEditAssetCustomBands(asset.activeBands ?? [])
    setEditAssetDialogOpen(true)
  }

  function saveEditedAsset() {
    if (!editingAsset || !editAssetDraft) return
    const availBands = FREQ_BANDS.filter((b) => ((editAssetDraft.sfgHours?.[b] ?? 0) > 0))
    const activeBands =
      editAssetCriticality === 'custom'
        ? editAssetCustomBands
        : getCriticalityBands(availBands, editAssetCriticality)

    const updated: AssetLine = {
      ...editingAsset,
      ...editAssetDraft,
      activeBands,
      criticality: editAssetCriticality,
      quantity: Number(editAssetDraft.quantity) || 1,
      isManual: false,
    } as AssetLine

    setAssetLines((prev) => prev.map((l) => l.id === editingAsset.id ? updated : l))
    setEditAssetDialogOpen(false)
    setEditingAsset(null)
  }

  // ── Manual task actions ──────────────────────────────────────────────────────
  function openAddManual() {
    setDraftManual({
      id: Math.random().toString(36).slice(2),
      siteId: activeSiteId || sites[0]?.id || '',
      discipline: 'fabric',
      location: '',
      makeModel: '',
      quantity: 1,
      hoursPerVisit: 2,
      visitsPerYear: 4,
      efficiencyFactor: 1,
    })
    setManualDialogOpen(true)
  }

  function saveManual() {
    if (!draftManual.description) return
    const task: ManualTask = {
      id: draftManual.id || Math.random().toString(36).slice(2),
      siteId: draftManual.siteId || sites[0]?.id || '',
      description: draftManual.description,
      discipline: draftManual.discipline ?? 'fabric',
      location: draftManual.location ?? '',
      makeModel: draftManual.makeModel ?? '',
      quantity: draftManual.quantity ?? 1,
      hoursPerVisit: draftManual.hoursPerVisit ?? 2,
      visitsPerYear: draftManual.visitsPerYear ?? 4,
      efficiencyFactor: draftManual.efficiencyFactor ?? 1,
    }
    setManualTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = task; return next }
      return [...prev, task]
    })
    setManualDialogOpen(false)
    setDraftManual({})
  }

  function editManual(task: ManualTask) {
    setDraftManual({ ...task })
    setManualDialogOpen(true)
  }

  // ── Mobilisation actions ────────────────────────────────────────────────────
  function openAddMobilisation() {
    setDraftMob({ id: Math.random().toString(36).slice(2), quantity: 1, unit: 'Days', pricePerUnit: 0, applyMarkup: true, profitMarkup: settings.defaultMobilisationMarkup })
    setMobDialogOpen(true)
  }

  function saveMobilisation() {
    if (!draftMob.description || draftMob.quantity === undefined || draftMob.pricePerUnit === undefined) return
    const mob: MobilisationCost = {
      id: draftMob.id || Math.random().toString(36).slice(2),
      description: draftMob.description,
      quantity: draftMob.quantity,
      unit: draftMob.unit || 'Days',
      pricePerUnit: draftMob.pricePerUnit,
      applyMarkup: draftMob.applyMarkup ?? true,
      profitMarkup: draftMob.profitMarkup || settings.defaultMobilisationMarkup,
    }
    setMobilisationCosts((prev) => {
      const idx = prev.findIndex((m) => m.id === mob.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = mob; return next }
      return [...prev, mob]
    })
    setMobDialogOpen(false)
    setDraftMob({})
  }

  function editMobilisation(mob: MobilisationCost) {
    setDraftMob(mob)
    setMobDialogOpen(true)
  }

  // ── One-off cost actions ─────────────────────────────────────────────────────
  function openAddOneOff() {
    setDraftOneOff({ id: Math.random().toString(36).slice(2), amount: 0, applyMarkup: false, profitMarkup: 0 })
    setOneOffDialogOpen(true)
  }

  function saveOneOff() {
    if (!draftOneOff.description) return
    const cost: OneOffCost = {
      id: draftOneOff.id || Math.random().toString(36).slice(2),
      description: draftOneOff.description,
      amount: draftOneOff.amount ?? 0,
      applyMarkup: draftOneOff.applyMarkup ?? false,
      profitMarkup: draftOneOff.profitMarkup ?? 0,
      notes: draftOneOff.notes,
    }
    setOneOffCosts((prev) => {
      const idx = prev.findIndex((c) => c.id === cost.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = cost; return next }
      return [...prev, cost]
    })
    setOneOffDialogOpen(false)
    setDraftOneOff({})
  }

  function editOneOff(cost: OneOffCost) {
    setDraftOneOff(cost)
    setOneOffDialogOpen(true)
  }

  // ── Support cost actions ────────────────────────────────────────────────────
  function openAddSupport() {
    setSupportMode('pick')
    setSelectedRoleId(roleRates[0]?.id ?? '')
    setSupportHoursPerWeek(8)
    setDraftSupport({
      id: Math.random().toString(36).slice(2),
      position: '', daysRequiredPA: 0, fte: 0,
      estimatedSalary: 0, car: 0, fuelEstimate: 0,
      niRate: 15, pensionRate: 3, employmentCost: 0,
      shareOfTotal: 0, profitMarkup: settings.defaultMobilisationMarkup, costFactoredIn: 0,
    })
    setSupportDialogOpen(true)
  }

  function saveSupport() {
    let position: string
    let dayRate: number

    if (supportMode === 'pick') {
      const role = roleRates.find((r) => r.id === selectedRoleId)
      if (!role) return
      position = role.position
      dayRate = role.dayRate
    } else {
      if (!draftSupport.position) return
      position = draftSupport.position
      dayRate = draftSupport.estimatedSalary || 0
    }

    const daysPA = Math.round((supportHoursPerWeek / 8) * 52)
    const annualCost = dayRate * daysPA

    const support: SupportCost = {
      id: draftSupport.id || Math.random().toString(36).slice(2),
      position,
      daysRequiredPA: daysPA,
      fte: parseFloat((supportHoursPerWeek / 40).toFixed(2)),
      estimatedSalary: dayRate,
      car: draftSupport.car || 0,
      fuelEstimate: draftSupport.fuelEstimate || 0,
      niRate: draftSupport.niRate || 15,
      pensionRate: draftSupport.pensionRate || 3,
      employmentCost: annualCost,
      shareOfTotal: 0,
      profitMarkup: draftSupport.profitMarkup || settings.defaultMobilisationMarkup,
      costFactoredIn: 0,
    }
    setSupportCosts((prev) => {
      const idx = prev.findIndex((s) => s.id === support.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = support; return next }
      return [...prev, support]
    })
    setSupportDialogOpen(false)
    setDraftSupport({})
  }

  function editSupport(support: SupportCost) {
    setSupportMode('new')
    setSupportHoursPerWeek(Math.round(support.fte * 40))
    setDraftSupport(support)
    setSupportDialogOpen(true)
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const lineCalcs = assetLines.map((l) => ({ line: l, ...calcLine(l) }))
  const ppmSubtotal = lineCalcs.reduce((s, c) => s + c.annualCost, 0)

  const manualCalcs = manualTasks.map((t) => ({ task: t, ...calcManualTask(t, getSalesRate(t.discipline)) }))
  const manualTaskSubtotal = manualCalcs.reduce((s, c) => s + c.annualCost, 0)

  let mobilisationTotal = 0
  for (const m of mobilisationCosts) {
    const base = m.quantity * m.pricePerUnit
    mobilisationTotal += m.applyMarkup ? base * (1 + m.profitMarkup / 100) : base
  }

  let supportTotal = 0
  for (const s of supportCosts) {
    supportTotal += s.employmentCost * (1 + s.profitMarkup / 100)
  }

  let oneOffTotal = 0
  for (const c of oneOffCosts) {
    oneOffTotal += c.applyMarkup ? c.amount * (1 + c.profitMarkup / 100) : c.amount
  }

  const subtotalBeforeMargin = ppmSubtotal + manualTaskSubtotal + mobilisationTotal + supportTotal + oneOffTotal
  const marginAmount = subtotalBeforeMargin * (profitMarginPct / 100)
  const totalYear1 = subtotalBeforeMargin + marginAmount
  const vatAmount = totalYear1 * (vatRate / 100)
  const totalYear1IncVat = totalYear1 + vatAmount
  const totalYear2 = totalYear1 * (1 + annualAdjPct / 100)
  const totalYear3 = totalYear2 * (1 + annualAdjPct / 100)

  // ── Task browser filter ─────────────────────────────────────────────────────
  const filteredTasks = SFG20_TASKS.filter((t) => {
    const matchSection = !activeSection || t.sectionCode === activeSection
    const q = search.toLowerCase()
    const matchSearch = !q || t.description.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    return matchSection && matchSearch
  })

  // ── Save ────────────────────────────────────────────────────────────────────
  function saveChanges() {
    if (!clientName.trim()) { alert('Please enter a client name.'); return }
    const region = REGIONS.find((r) => r.id === regionId)!
    const quote: Quote = {
      id,
      reference: quoteReference,
      quoteType,
      businessEntity,
      clientName: clientName.trim(),
      sites,
      siteName: sites[0]?.name ?? '',
      siteAddress: sites[0]?.address ?? '',
      regionId,
      regionName: region.name,
      status: (getQuote(id)?.status ?? 'draft'),
      assetLines,
      manualTasks,
      mobilisationCosts,
      supportCosts,
      oneOffCosts,
      ppmSubtotal,
      manualTaskSubtotal,
      mobilisationTotal,
      supportTotal,
      oneOffTotal,
      subtotalBeforeMargin,
      profitMarginPct,
      marginAmount,
      markupPct: parseFloat(((profitMarginPct / (100 - profitMarginPct)) * 100).toFixed(2)),
      annualAdjustmentPct: annualAdjPct,
      vatRate,
      vatAmount,
      totalYear1,
      totalYear2,
      totalYear3,
      totalYear1IncVat,
      totalYear2IncVat: totalYear2 + totalYear2 * (vatRate / 100),
      totalYear3IncVat: totalYear3 + totalYear3 * (vatRate / 100),
      notes: notes.trim(),
      createdBy: originalCreatedBy || user?.name || 'Unknown',
      createdAt: originalCreatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveQuote(quote)
    router.push(`/quotes/${id}`)
  }

  // Group assets by site
  const assetsBySite = sites.map((site) => ({
    site,
    lines: lineCalcs.filter((c) => c.line.siteId === site.id),
    manuals: manualCalcs.filter((c) => c.task.siteId === site.id),
  }))

  const pendingAvailBands = pendingTask
    ? FREQ_BANDS.filter((b) => (pendingTask.sfgHours[b] ?? 0) > 0)
    : []

  const previewBands =
    selectedCriticality === 'custom'
      ? customBands
      : getCriticalityBands(pendingAvailBands, selectedCriticality)

  const editAssetAvailBands = editingAsset
    ? FREQ_BANDS.filter((b) => (editAssetDraft.sfgHours?.[b] ?? 0) > 0)
    : []

  if (notFound) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => router.push('/quotes')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Quotes
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Quote not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-3 pt-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.push(`/quotes/${id}`)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Edit Quote</h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{quoteReference}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Update the pricing document and save changes.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/quotes/${id}`)}>
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Quote Type + Business Entity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Type &amp; Business Entity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">Document Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['tender', 'quote'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setQuoteType(type)}
                        className={cn(
                          'rounded-lg border-2 p-3 text-left transition-all',
                          quoteType === type ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                        )}
                      >
                        <p className="text-sm font-semibold">{QUOTE_TYPE_LABELS[type]}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{QUOTE_TYPE_DESCRIPTIONS[type]}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Business Entity</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {BUSINESS_ENTITIES.map((entity) => (
                      <button
                        key={entity}
                        onClick={() => setBusinessEntity(entity)}
                        className={cn(
                          'rounded-lg border-2 p-2.5 text-left transition-all',
                          businessEntity === entity ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs font-medium leading-tight">{BUSINESS_ENTITY_LABELS[entity]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Details */}
            <Card>
              <CardHeader><CardTitle className="text-base">Client Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Client Name</Label>
                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Canary Wharf Group" className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Region</Label>
                    <Select value={regionId} onValueChange={setRegionId}>
                      <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Multi-Site Manager */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between py-1">
                  <CardTitle className="text-base">Sites</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addSite}>
                    <PlusCircle className="w-3 h-3 mr-1" />Add Site
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                {sites.map((site, idx) => (
                  <div key={site.id} className={cn('rounded-lg border-2 p-3 transition-all', activeSiteId === site.id ? 'border-primary bg-primary/5' : 'border-border')}>
                    <div className="flex items-center justify-between mb-2">
                      <button className="flex items-center gap-2 text-sm font-medium" onClick={() => setActiveSiteId(site.id)}>
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        Site {idx + 1}{site.name && <span className="text-muted-foreground font-normal">— {site.name}</span>}
                        <Badge variant="outline" className="text-xs ml-1">
                          {assetLines.filter((l) => l.siteId === site.id).length + manualTasks.filter((t) => t.siteId === site.id).length} tasks
                        </Badge>
                      </button>
                      {sites.length > 1 && (
                        <button onClick={() => removeSite(site.id)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Site Name</Label>
                        <Input value={site.name} onChange={(e) => updateSite(site.id, 'name', e.target.value)} placeholder="e.g. One Canada Square" className="mt-1 h-8 text-xs" onFocus={() => setActiveSiteId(site.id)} />
                      </div>
                      <div>
                        <Label className="text-xs">Address</Label>
                        <Input value={site.address} onChange={(e) => updateSite(site.id, 'address', e.target.value)} placeholder="Full address" className="mt-1 h-8 text-xs" onFocus={() => setActiveSiteId(site.id)} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Task browser */}
            <Card>
              <CardHeader className="pb-0 cursor-pointer select-none" onClick={() => setBrowserOpen(!browserOpen)}>
                <div className="flex items-center justify-between py-1">
                  <CardTitle className="text-base">SFG20 Task Library</CardTitle>
                  {browserOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {browserOpen && (
                <CardContent className="pt-3">
                  <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-secondary/40 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    Adding tasks to:{' '}
                    <span className="font-semibold text-foreground ml-1">
                      {sites.find((s) => s.id === activeSiteId)?.name || `Site ${sites.findIndex((s) => s.id === activeSiteId) + 1}`}
                    </span>
                    {sites.length > 1 && (
                      <Select value={activeSiteId} onValueChange={setActiveSiteId}>
                        <SelectTrigger className="h-6 text-xs ml-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sites.map((s, i) => (<SelectItem key={s.id} value={s.id}>{s.name || `Site ${i + 1}`}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5 mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search by description or SFG code..." className="pl-9 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setActiveSection(null)} className={cn('px-2.5 py-0.5 rounded-full text-xs border transition-colors', !activeSection ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>All</button>
                      {SFG20_SECTIONS.map((s) => (
                        <button key={s.code} onClick={() => setActiveSection(activeSection === s.code ? null : s.code)} className={cn('px-2.5 py-0.5 rounded-full text-xs border transition-colors', activeSection === s.code ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                          {s.code} – {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y border rounded-md">
                    {filteredTasks.map((task) => {
                      const activeBands = FREQ_BANDS.filter((b) => (task.sfgHours[b] ?? 0) > 0)
                      return (
                        <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">{task.code}</span>
                              <span className="text-sm truncate">{task.description}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <Badge variant="outline" className={cn('text-xs py-0', DISCIPLINE_COLORS[task.discipline])}>{DISCIPLINE_LABELS[task.discipline].split(' ')[0]}</Badge>
                              {activeBands.map((b) => (<span key={b} className="text-xs text-muted-foreground">{BAND_LABELS[b]}: {task.sfgHours[b]}h</span>))}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={() => openAddDialog(task)}>
                            <Plus className="w-3 h-3 mr-1" />Add
                          </Button>
                        </div>
                      )
                    })}
                    {filteredTasks.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground text-center">No tasks match your search.</p>}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Asset Register — grouped by site */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between py-1">
                  <CardTitle className="text-base">Asset Register</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openAddManual}>
                      <Plus className="w-3 h-3 mr-1" />Non-SFG20 Task
                    </Button>
                    <span className="text-xs text-muted-foreground">{assetLines.length + manualTasks.length} task{assetLines.length + manualTasks.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                {assetLines.length === 0 && manualTasks.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">No tasks added yet.</div>
                ) : (
                  <div className="divide-y">
                    {assetsBySite.map(({ site, lines, manuals }) => {
                      if (lines.length === 0 && manuals.length === 0) return null
                      const siteCost = lines.reduce((s, c) => s + c.annualCost, 0) + manuals.reduce((s, c) => s + c.annualCost, 0)
                      return (
                        <div key={site.id}>
                          <div className="px-4 py-2 bg-secondary/30 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold">{site.name || `Site ${sites.indexOf(site) + 1}`}</span>
                            {site.address && <span className="text-xs text-muted-foreground">{site.address}</span>}
                            <span className="ml-auto text-xs font-semibold">{formatCurrency(siteCost)}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-y bg-secondary/20">
                                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Service</th>
                                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Location</th>
                                  <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Disc.</th>
                                  <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                                  <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Criticality</th>
                                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Hours/yr</th>
                                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Cost/yr</th>
                                  <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground">Acts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {lines.map(({ line, totalFlexedHours, annualCost }) => (
                                  <tr key={line.id} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-3 py-2.5">
                                      <div className="text-xs font-medium truncate max-w-[180px]">{line.sfgDescription}</div>
                                      <div className="text-xs text-muted-foreground font-mono">{line.sfgCode}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs truncate">{line.location || '—'}</td>
                                    <td className="px-2 py-2.5 text-center">
                                      <Badge variant="outline" className={cn('text-xs py-0 px-1', DISCIPLINE_COLORS[line.discipline])}>{DISCIPLINE_LABELS[line.discipline].split(' ')[0]}</Badge>
                                    </td>
                                    <td className="px-2 py-2.5">
                                      <div className="flex items-center justify-center gap-0.5">
                                        <button onClick={() => updateLineQty(line.id, line.quantity - 1)} className="w-4 h-4 text-xs">−</button>
                                        <span className="text-xs font-medium w-4 text-center">{line.quantity}</span>
                                        <button onClick={() => updateLineQty(line.id, line.quantity + 1)} className="w-4 h-4 text-xs">+</button>
                                      </div>
                                    </td>
                                    <td className="px-2 py-2.5 text-center">
                                      <Badge variant="outline" className={cn('text-xs py-0', CRITICALITY_COLORS[line.criticality])}>{CRITICALITY_SHORT[line.criticality]}</Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-xs font-medium">{totalFlexedHours.toFixed(1)}h</td>
                                    <td className="px-3 py-2.5 text-right text-xs font-semibold">{formatCurrency(annualCost)}</td>
                                    <td className="px-2 py-2.5">
                                      <div className="flex items-center justify-center gap-0.5">
                                        <button onClick={() => openEditAsset(line)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground" title="Edit asset">
                                          <Settings2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setDeleteConfirm({ type: 'asset', id: line.id })} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {manuals.map(({ task, annualHours, annualCost }) => (
                                  <tr key={task.id} className="hover:bg-secondary/20 transition-colors bg-amber-50/30">
                                    <td className="px-3 py-2.5">
                                      <div className="text-xs font-medium truncate max-w-[180px]">{task.description}</div>
                                      <div className="text-xs text-muted-foreground">Manual · {task.hoursPerVisit}h × {task.visitsPerYear}/yr</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs truncate">{task.location || '—'}</td>
                                    <td className="px-2 py-2.5 text-center">
                                      <Badge variant="outline" className={cn('text-xs py-0 px-1', DISCIPLINE_COLORS[task.discipline])}>{DISCIPLINE_LABELS[task.discipline].split(' ')[0]}</Badge>
                                    </td>
                                    <td className="px-2 py-2.5 text-center text-xs">{task.quantity}</td>
                                    <td className="px-2 py-2.5 text-center">
                                      <Badge variant="outline" className="text-xs py-0 bg-amber-50 text-amber-700 border-amber-200">Non-SFG20</Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-xs font-medium">{annualHours.toFixed(1)}h</td>
                                    <td className="px-3 py-2.5 text-right text-xs font-semibold">{formatCurrency(annualCost)}</td>
                                    <td className="px-2 py-2.5">
                                      <div className="flex items-center justify-center gap-0.5">
                                        <button onClick={() => editManual(task)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"><Settings2 className="w-3 h-3" /></button>
                                        <button onClick={() => setDeleteConfirm({ type: 'manual', id: task.id })} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-secondary/40 border-t">
                                  <td colSpan={6} className="px-3 py-2 text-right text-sm font-semibold">Total PPM</td>
                                  <td className="px-3 py-2 text-right text-sm font-bold">{formatCurrency(ppmSubtotal + manualTaskSubtotal)}</td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobilisation Costs */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between py-1">
                  <CardTitle className="text-base">Mobilisation Costs</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openAddMobilisation}><Plus className="w-3 h-3 mr-1" />Add Cost</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                {mobilisationCosts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No mobilisation costs added.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y bg-secondary/50">
                          <th className="text-left px-4 py-2 text-xs font-medium">Description</th>
                          <th className="text-right px-4 py-2 text-xs font-medium">Qty</th>
                          <th className="text-right px-4 py-2 text-xs font-medium">Unit Price</th>
                          <th className="text-right px-4 py-2 text-xs font-medium">Total</th>
                          <th className="text-center px-2 py-2 text-xs font-medium">Acts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {mobilisationCosts.map((m) => {
                          const base = m.quantity * m.pricePerUnit
                          const total = m.applyMarkup ? base * (1 + m.profitMarkup / 100) : base
                          return (
                            <tr key={m.id} className="hover:bg-secondary/20">
                              <td className="px-4 py-2 text-xs">{m.description}</td>
                              <td className="px-4 py-2 text-right text-xs">{m.quantity}</td>
                              <td className="px-4 py-2 text-right text-xs">{formatCurrency(m.pricePerUnit)}</td>
                              <td className="px-4 py-2 text-right text-xs font-semibold">{formatCurrency(total)}</td>
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button onClick={() => editMobilisation(m)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"><Settings2 className="w-3 h-3" /></button>
                                  <button onClick={() => setDeleteConfirm({ type: 'mob', id: m.id })} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-secondary/40 border-t font-semibold text-sm">
                          <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(mobilisationTotal)}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* One-Off Costs */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between py-1">
                  <CardTitle className="text-base">One-Off Costs</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openAddOneOff}><Plus className="w-3 h-3 mr-1" />Add</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                {oneOffCosts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No one-off costs added.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y bg-secondary/50">
                          <th className="text-left px-4 py-2 text-xs font-medium">Description</th>
                          <th className="text-left px-4 py-2 text-xs font-medium">Notes</th>
                          <th className="text-right px-4 py-2 text-xs font-medium">Amount</th>
                          <th className="text-center px-2 py-2 text-xs font-medium">Acts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {oneOffCosts.map((c) => {
                          const total = c.applyMarkup ? c.amount * (1 + c.profitMarkup / 100) : c.amount
                          return (
                            <tr key={c.id} className="hover:bg-secondary/20">
                              <td className="px-4 py-2 text-xs">{c.description}</td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">{c.notes || '—'}</td>
                              <td className="px-4 py-2 text-right text-xs font-semibold">{formatCurrency(total)}</td>
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button onClick={() => editOneOff(c)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"><Settings2 className="w-3 h-3" /></button>
                                  <button onClick={() => setDeleteConfirm({ type: 'oneoff', id: c.id })} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-secondary/40 border-t font-semibold text-sm">
                          <td colSpan={2} className="px-4 py-2 text-right">Total</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(oneOffTotal)}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support Costs */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between py-1">
                  <CardTitle className="text-base">Contract Support Costs</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openAddSupport}><Plus className="w-3 h-3 mr-1" />Add Role</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 mt-2">
                {supportCosts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No support costs added.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y bg-secondary/50">
                          <th className="text-left px-4 py-2 text-xs font-medium">Position</th>
                          <th className="text-right px-4 py-2 text-xs font-medium">Salary</th>
                          <th className="text-right px-4 py-2 text-xs font-medium">Employment Cost</th>
                          <th className="text-right px-4 py-2 text-xs font-medium">Total</th>
                          <th className="text-center px-2 py-2 text-xs font-medium">Acts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {supportCosts.map((s) => {
                          const total = s.employmentCost * (1 + s.profitMarkup / 100)
                          return (
                            <tr key={s.id} className="hover:bg-secondary/20">
                              <td className="px-4 py-2 text-xs">{s.position}</td>
                              <td className="px-4 py-2 text-right text-xs">{formatCurrency(s.estimatedSalary)}</td>
                              <td className="px-4 py-2 text-right text-xs">{formatCurrency(s.employmentCost)}</td>
                              <td className="px-4 py-2 text-right text-xs font-semibold">{formatCurrency(total)}</td>
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button onClick={() => editSupport(s)} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"><Settings2 className="w-3 h-3" /></button>
                                  <button onClick={() => setDeleteConfirm({ type: 'support', id: s.id })} className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-secondary/40 border-t font-semibold text-sm">
                          <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(supportTotal)}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Pricing Summary */}
          <div className="w-full lg:w-80 lg:sticky lg:top-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Pricing Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm border-b pb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PPM (SFG20)</span>
                    <span className="font-semibold">{formatCurrency(ppmSubtotal)}</span>
                  </div>
                  {manualTaskSubtotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Non-SFG20 Tasks</span>
                      <span className="font-semibold">{formatCurrency(manualTaskSubtotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobilisation</span>
                    <span className="font-semibold">{formatCurrency(mobilisationTotal)}</span>
                  </div>
                  {oneOffTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">One-Off Costs</span>
                      <span className="font-semibold">{formatCurrency(oneOffTotal)}</span>
                    </div>
                  )}
                  {supportTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Support Costs</span>
                      <span className="font-semibold">{formatCurrency(supportTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(subtotalBeforeMargin)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">+ {profitMarginPct}% Margin</span>
                    <span className="font-semibold">{formatCurrency(marginAmount)}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm border-b pb-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Year 1 (ex. VAT)</span>
                    <span className="text-lg font-bold">{formatCurrency(totalYear1)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>+ VAT ({vatRate}%)</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-primary border-t pt-2">
                    <span>Year 1 (inc. VAT)</span>
                    <span>{formatCurrency(totalYear1IncVat)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Year 2 (+{annualAdjPct}%)</span>
                    <span>{formatCurrency(totalYear2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Year 3 (+{annualAdjPct}%)</span>
                    <span>{formatCurrency(totalYear3)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Profit Margin %</Label>
                    <Input type="number" value={profitMarginPct} onChange={(e) => setProfitMarginPct(Number(e.target.value))} min="0" max="50" className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Annual Adjustment %</Label>
                    <Input type="number" value={annualAdjPct} onChange={(e) => setAnnualAdjPct(Number(e.target.value))} min="0" max="10" className="mt-1 h-8 text-xs" />
                  </div>
                  <div className="flex justify-between text-xs p-2 bg-secondary/40 rounded-md">
                    <span className="text-muted-foreground">VAT Rate</span>
                    <span className="font-medium">{vatRate}% (set in Settings)</span>
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." className="mt-1 text-xs min-h-20" />
                  </div>
                </div>

                <Button onClick={saveChanges} className="w-full" size="sm">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Add SFG20 Asset Dialog ── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add SFG20 Asset</DialogTitle>
            {pendingTask && <DialogDescription>{pendingTask.code} – {pendingTask.description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pendingTask && pendingAvailBands.length > 0 && (
              <div className="p-3 rounded-md bg-secondary/40 space-y-2">
                <p className="font-semibold text-xs text-foreground">Hours per visit (edit if SFG20 hours need adjusting):</p>
                <div className="grid grid-cols-2 gap-2">
                  {pendingAvailBands.map((b) => (
                    <div key={b} className="flex items-center gap-2">
                      <Label className="text-xs w-20 flex-shrink-0">{BAND_LABELS[b]}</Label>
                      <Input type="number" step="0.25" min="0" className="h-7 text-xs w-20"
                        value={draftLine.sfgHours?.[b] ?? pendingTask.sfgHours[b] ?? 0}
                        onChange={(e) => setDraftLine({ ...draftLine, sfgHours: { ...(draftLine.sfgHours ?? { ...emptyHours(), ...pendingTask.sfgHours }), [b]: Number(e.target.value) } })}
                      />
                      <span className="text-xs text-muted-foreground">h/visit</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sites.length > 1 && (
              <div>
                <Label className="text-xs">Site</Label>
                <Select value={targetSiteId} onValueChange={setTargetSiteId}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{sites.map((s, i) => (<SelectItem key={s.id} value={s.id}>{s.name || `Site ${i + 1}`}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">Location</Label><Input value={draftLine.location || ''} onChange={(e) => setDraftLine({ ...draftLine, location: e.target.value })} placeholder="e.g. Ground Floor" className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Make/Model</Label><Input value={draftLine.makeModel || ''} onChange={(e) => setDraftLine({ ...draftLine, makeModel: e.target.value })} placeholder="e.g. Schneider" className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Quantity</Label><Input type="number" value={draftLine.quantity || 1} onChange={(e) => setDraftLine({ ...draftLine, quantity: Number(e.target.value) })} min="1" className="mt-1 h-8 text-xs" /></div>
            <Separator />
            <div>
              <Label className="text-xs font-semibold block mb-1">Criticality Level</Label>
              <div className="grid grid-cols-1 gap-2">
                {(['critical', 'high', 'medium', 'low', 'custom'] as CriticalityLevel[]).map((level) => {
                  const bands = level === 'custom' ? customBands : getCriticalityBands(pendingAvailBands, level)
                  const isSelected = selectedCriticality === level
                  return (
                    <button key={level} onClick={() => setSelectedCriticality(level)} className={cn('rounded-lg border-2 p-2.5 text-left transition-all w-full', isSelected ? cn('border-current', CRITICALITY_COLORS[level]) : 'border-border hover:border-primary/30 bg-background')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', level === 'critical' && 'bg-red-500', level === 'high' && 'bg-amber-500', level === 'medium' && 'bg-pink-500', level === 'low' && 'bg-green-500', level === 'custom' && 'bg-secondary-foreground/40')} />
                          <p className="text-xs font-semibold">{CRITICALITY_LABELS[level]}</p>
                        </div>
                        {bands.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {bands.map((b) => (<span key={b} className="text-xs bg-background/80 border rounded px-1 text-muted-foreground">{b}: {pendingTask?.sfgHours[b] ?? 0}h</span>))}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              {selectedCriticality === 'custom' && (
                <div className="mt-2 space-y-1">
                  <Label className="text-xs">Select active bands:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {pendingAvailBands.map((b) => (
                      <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={customBands.includes(b)} onCheckedChange={(checked) => setCustomBands((prev) => checked ? [...prev, b] : prev.filter((x) => x !== b))} />
                        <span className="text-xs">{BAND_LABELS[b]} ({pendingTask?.sfgHours[b]}h)</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={confirmAdd} size="sm">Add to Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit SFG20 Asset Dialog ── */}
      <Dialog open={editAssetDialogOpen} onOpenChange={setEditAssetDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SFG20 Asset</DialogTitle>
            {editingAsset && <DialogDescription>{editingAsset.sfgCode} – {editingAsset.sfgDescription}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editAssetAvailBands.length > 0 && (
              <div className="p-3 rounded-md bg-secondary/40 space-y-2">
                <p className="font-semibold text-xs text-foreground">Hours per visit:</p>
                <div className="grid grid-cols-2 gap-2">
                  {editAssetAvailBands.map((b) => (
                    <div key={b} className="flex items-center gap-2">
                      <Label className="text-xs w-20 flex-shrink-0">{BAND_LABELS[b]}</Label>
                      <Input type="number" step="0.25" min="0" className="h-7 text-xs w-20"
                        value={editAssetDraft.sfgHours?.[b] ?? 0}
                        onChange={(e) => setEditAssetDraft({ ...editAssetDraft, sfgHours: { ...(editAssetDraft.sfgHours ?? emptyHours()), [b]: Number(e.target.value) } })}
                      />
                      <span className="text-xs text-muted-foreground">h/visit</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sites.length > 1 && (
              <div>
                <Label className="text-xs">Site</Label>
                <Select value={editAssetDraft.siteId || ''} onValueChange={(v) => setEditAssetDraft({ ...editAssetDraft, siteId: v })}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{sites.map((s, i) => (<SelectItem key={s.id} value={s.id}>{s.name || `Site ${i + 1}`}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">Name / Description</Label><Input value={editAssetDraft.sfgDescription || ''} onChange={(e) => setEditAssetDraft({ ...editAssetDraft, sfgDescription: e.target.value })} className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Location</Label><Input value={editAssetDraft.location || ''} onChange={(e) => setEditAssetDraft({ ...editAssetDraft, location: e.target.value })} placeholder="e.g. Plant Room" className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Make/Model</Label><Input value={editAssetDraft.makeModel || ''} onChange={(e) => setEditAssetDraft({ ...editAssetDraft, makeModel: e.target.value })} placeholder="e.g. Schneider" className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Quantity</Label><Input type="number" value={editAssetDraft.quantity || 1} onChange={(e) => setEditAssetDraft({ ...editAssetDraft, quantity: Number(e.target.value) })} min="1" className="mt-1 h-8 text-xs" /></div>
            <Separator />
            <div>
              <Label className="text-xs font-semibold block mb-1">Criticality Level</Label>
              <div className="grid grid-cols-1 gap-2">
                {(['critical', 'high', 'medium', 'low', 'custom'] as CriticalityLevel[]).map((level) => {
                  const bands = level === 'custom' ? editAssetCustomBands : getCriticalityBands(editAssetAvailBands, level)
                  const isSelected = editAssetCriticality === level
                  return (
                    <button key={level} onClick={() => setEditAssetCriticality(level)} className={cn('rounded-lg border-2 p-2.5 text-left transition-all w-full', isSelected ? cn('border-current', CRITICALITY_COLORS[level]) : 'border-border hover:border-primary/30 bg-background')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', level === 'critical' && 'bg-red-500', level === 'high' && 'bg-amber-500', level === 'medium' && 'bg-pink-500', level === 'low' && 'bg-green-500', level === 'custom' && 'bg-secondary-foreground/40')} />
                          <p className="text-xs font-semibold">{CRITICALITY_LABELS[level]}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {bands.map((b) => (<span key={b} className="text-xs bg-background/80 border rounded px-1 text-muted-foreground">{b}: {editAssetDraft.sfgHours?.[b] ?? 0}h</span>))}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {editAssetCriticality === 'custom' && (
                <div className="mt-2 space-y-1">
                  <Label className="text-xs">Select active bands:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {editAssetAvailBands.map((b) => (
                      <label key={b} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={editAssetCustomBands.includes(b)} onCheckedChange={(checked) => setEditAssetCustomBands((prev) => checked ? [...prev, b] : prev.filter((x) => x !== b))} />
                        <span className="text-xs">{BAND_LABELS[b]} ({editAssetDraft.sfgHours?.[b] ?? 0}h)</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAssetDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={saveEditedAsset} size="sm">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manual Task Dialog ── */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Non-SFG20 Task</DialogTitle>
            <DialogDescription>Add a manually-defined task with custom timing and hours.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {sites.length > 1 && (
              <div>
                <Label className="text-xs">Site</Label>
                <Select value={draftManual.siteId || sites[0]?.id} onValueChange={(v) => setDraftManual({ ...draftManual, siteId: v })}>
                  <SelectTrigger className="mt-1 h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{sites.map((s, i) => (<SelectItem key={s.id} value={s.id}>{s.name || `Site ${i + 1}`}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">Description</Label><Input value={draftManual.description || ''} onChange={(e) => setDraftManual({ ...draftManual, description: e.target.value })} placeholder="e.g. Annual window cleaning" className="mt-1 h-8 text-xs" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Discipline</Label>
                <Select value={draftManual.discipline || 'fabric'} onValueChange={(v) => setDraftManual({ ...draftManual, discipline: v as Discipline })}>
                  <SelectTrigger className="mt-1 h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{DISCIPLINES.map((d) => (<SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Location</Label><Input value={draftManual.location || ''} onChange={(e) => setDraftManual({ ...draftManual, location: e.target.value })} placeholder="e.g. External" className="mt-1 h-8 text-xs" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Quantity</Label><Input type="number" value={draftManual.quantity || 1} onChange={(e) => setDraftManual({ ...draftManual, quantity: Number(e.target.value) })} min="1" className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Hrs / Visit</Label><Input type="number" step="0.5" value={draftManual.hoursPerVisit || 2} onChange={(e) => setDraftManual({ ...draftManual, hoursPerVisit: Number(e.target.value) })} min="0.5" className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Visits / Year</Label><Input type="number" value={draftManual.visitsPerYear || 4} onChange={(e) => setDraftManual({ ...draftManual, visitsPerYear: Number(e.target.value) })} min="1" className="mt-1 h-8 text-xs" /></div>
            </div>
            <div className="p-2 bg-secondary/40 rounded text-xs text-muted-foreground">
              Annual hours: <span className="font-semibold text-foreground">{((draftManual.hoursPerVisit ?? 2) * (draftManual.visitsPerYear ?? 4) * (draftManual.quantity ?? 1)).toFixed(1)}h</span>{' '}
              at {formatCurrency(getSalesRate(draftManual.discipline ?? 'fabric'))}/hr = <span className="font-semibold text-foreground ml-1">{formatCurrency((draftManual.hoursPerVisit ?? 2) * (draftManual.visitsPerYear ?? 4) * (draftManual.quantity ?? 1) * getSalesRate(draftManual.discipline ?? 'fabric'))}/yr</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={saveManual} size="sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mobilisation Dialog ── */}
      <Dialog open={mobDialogOpen} onOpenChange={setMobDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mobilisation Cost</DialogTitle>
            <DialogDescription>Add a mobilisation or setup cost item to this quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs">Description</Label><Input value={draftMob.description || ''} onChange={(e) => setDraftMob({ ...draftMob, description: e.target.value })} placeholder="e.g. Asset Loading Days" className="mt-1 h-8 text-xs" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Quantity</Label><Input type="number" value={draftMob.quantity || 0} onChange={(e) => setDraftMob({ ...draftMob, quantity: Number(e.target.value) })} min="1" className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs">Unit</Label><Input value={draftMob.unit || 'Days'} onChange={(e) => setDraftMob({ ...draftMob, unit: e.target.value })} className="mt-1 h-8 text-xs" /></div>
            </div>
            <div><Label className="text-xs">Price per Unit (£)</Label><Input type="number" value={draftMob.pricePerUnit || 0} onChange={(e) => setDraftMob({ ...draftMob, pricePerUnit: Number(e.target.value) })} min="0" className="mt-1 h-8 text-xs" /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={draftMob.applyMarkup ?? true} onCheckedChange={(v) => setDraftMob({ ...draftMob, applyMarkup: !!v })} id="mob-markup" />
              <Label htmlFor="mob-markup" className="text-xs cursor-pointer">Apply markup</Label>
              {draftMob.applyMarkup && (
                <div className="flex items-center gap-1 ml-2">
                  <Input type="number" value={draftMob.profitMarkup || 0} onChange={(e) => setDraftMob({ ...draftMob, profitMarkup: Number(e.target.value) })} className="h-6 w-16 text-xs" min="0" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMobDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={saveMobilisation} size="sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── One-Off Cost Dialog ── */}
      <Dialog open={oneOffDialogOpen} onOpenChange={setOneOffDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>One-Off Cost</DialogTitle>
            <DialogDescription>Add a licence fee, subscription, or other one-off cost.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-xs">Description</Label><Input value={draftOneOff.description || ''} onChange={(e) => setDraftOneOff({ ...draftOneOff, description: e.target.value })} placeholder="e.g. SFG20 Licence" className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Amount (£)</Label><Input type="number" value={draftOneOff.amount || 0} onChange={(e) => setDraftOneOff({ ...draftOneOff, amount: Number(e.target.value) })} min="0" className="mt-1 h-8 text-xs" /></div>
            <div><Label className="text-xs">Notes</Label><Input value={draftOneOff.notes || ''} onChange={(e) => setDraftOneOff({ ...draftOneOff, notes: e.target.value })} placeholder="Optional note..." className="mt-1 h-8 text-xs" /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={draftOneOff.applyMarkup ?? false} onCheckedChange={(v) => setDraftOneOff({ ...draftOneOff, applyMarkup: !!v })} id="oneoff-markup" />
              <Label htmlFor="oneoff-markup" className="text-xs cursor-pointer">Apply markup</Label>
              {draftOneOff.applyMarkup && (
                <div className="flex items-center gap-1 ml-2">
                  <Input type="number" value={draftOneOff.profitMarkup || 0} onChange={(e) => setDraftOneOff({ ...draftOneOff, profitMarkup: Number(e.target.value) })} className="h-6 w-16 text-xs" min="0" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOneOffDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={saveOneOff} size="sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Support Cost Dialog ── */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contract Support Role</DialogTitle>
            <DialogDescription>Add a support role cost to this quote.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <button onClick={() => setSupportMode('pick')} className={cn('flex-1 rounded-lg border-2 p-2 text-xs text-center transition-all', supportMode === 'pick' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>Pick from rate card</button>
              <button onClick={() => setSupportMode('new')} className={cn('flex-1 rounded-lg border-2 p-2 text-xs text-center transition-all', supportMode === 'new' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>Custom role</button>
            </div>
            {supportMode === 'pick' ? (
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="mt-1 h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{roleRates.map((r) => (<SelectItem key={r.id} value={r.id}>{r.position} — {formatCurrency(r.dayRate)}/day</SelectItem>))}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-xs">Position Title</Label><Input value={draftSupport.position || ''} onChange={(e) => setDraftSupport({ ...draftSupport, position: e.target.value })} placeholder="e.g. Contract Manager" className="mt-1 h-8 text-xs" /></div>
                <div><Label className="text-xs">Day Rate (£)</Label><Input type="number" value={draftSupport.estimatedSalary || 0} onChange={(e) => setDraftSupport({ ...draftSupport, estimatedSalary: Number(e.target.value) })} min="0" className="mt-1 h-8 text-xs" /></div>
              </div>
            )}
            <div><Label className="text-xs">Hours per Week</Label><Input type="number" value={supportHoursPerWeek} onChange={(e) => setSupportHoursPerWeek(Number(e.target.value))} min="1" max="40" className="mt-1 h-8 text-xs" /></div>
            <div className="flex justify-between items-center gap-3">
              <div className="flex-1"><Label className="text-xs">Markup %</Label><Input type="number" value={draftSupport.profitMarkup || 0} onChange={(e) => setDraftSupport({ ...draftSupport, profitMarkup: Number(e.target.value) })} min="0" className="mt-1 h-8 text-xs" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupportDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={saveSupport} size="sm">Add Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone. Are you sure you want to remove this item?</AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!deleteConfirm) return
              if (deleteConfirm.type === 'asset') removeAsset(deleteConfirm.id)
              else if (deleteConfirm.type === 'manual') setManualTasks((p) => p.filter((t) => t.id !== deleteConfirm.id))
              else if (deleteConfirm.type === 'mob') setMobilisationCosts((p) => p.filter((m) => m.id !== deleteConfirm.id))
              else if (deleteConfirm.type === 'support') setSupportCosts((p) => p.filter((s) => s.id !== deleteConfirm.id))
              else if (deleteConfirm.type === 'oneoff') setOneOffCosts((p) => p.filter((c) => c.id !== deleteConfirm.id))
              setDeleteConfirm(null)
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md text-sm">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
