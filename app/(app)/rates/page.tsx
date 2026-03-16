'use client'

import { useState, useEffect } from 'react'
import { getRateCards, updateRateCard, getRoleRates, saveRoleRates } from '@/lib/store'
import { REGIONS, DISCIPLINE_LABELS, DISCIPLINES } from '@/lib/data'
import type { RateCard, Discipline, DisciplineRates, RoleRate } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Check, Pencil, X, MapPin, Info, Plus, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { pctDiff } from '@/lib/utils-app'

export default function RatesPage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'pricing_manager'
  const [rateCards, setRateCards] = useState<RateCard[]>([])
  const [editingRegion, setEditingRegion] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<Discipline, Partial<DisciplineRates>>>({} as Record<Discipline, Partial<DisciplineRates>>)
  const [editOverhead, setEditOverhead] = useState<string>('17')
  const [editSfgIndex, setEditSfgIndex] = useState<string>('100')
  const [saved, setSaved] = useState<string | null>(null)
  const [activeRegion, setActiveRegion] = useState<string>('london')
  const [activeTab, setActiveTab] = useState<'labour' | 'roles'>('labour')

  // Role rates state
  const [roleRates, setRoleRates] = useState<RoleRate[]>([])
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [draftRole, setDraftRole] = useState<Partial<RoleRate>>({})
  const [roleSaved, setRoleSaved] = useState(false)

  useEffect(() => {
    setRateCards(getRateCards())
    setRoleRates(getRoleRates())
  }, [])

  const currentCard = rateCards.find((r) => r.regionId === activeRegion)

  function startEdit(card: RateCard) {
    setEditingRegion(card.regionId)
    const vals = {} as Record<Discipline, Partial<DisciplineRates>>
    DISCIPLINES.forEach((d) => {
      vals[d] = { ...card.disciplines[d] }
    })
    setEditValues(vals)
    setEditOverhead(String(card.overheadAndProfitLabour))
    setEditSfgIndex(String(Math.round(card.sfgEfficiencyIndex * 100)))
  }

  function cancelEdit() { setEditingRegion(null) }

  function recalcDiscipline(d: Discipline, baseRate: number, overheadPct: number) {
    const salesRate = parseFloat((baseRate * (1 + overheadPct / 100)).toFixed(2))
    const ot15 = parseFloat((salesRate * 1.5 - baseRate * 0.5).toFixed(2))
    const ot2 = parseFloat((salesRate * 2 - baseRate).toFixed(2))
    return { baseRate, salesRate, ot15Rate: ot15, ot2Rate: ot2 }
  }

  function handleBaseRateChange(d: Discipline, value: string) {
    const base = parseFloat(value) || 0
    const overhead = parseFloat(editOverhead) || 0
    setEditValues((v) => ({
      ...v,
      [d]: recalcDiscipline(d, base, overhead),
    }))
  }

  function handleOverheadChange(value: string) {
    setEditOverhead(value)
    const overhead = parseFloat(value) || 0
    setEditValues((current) => {
      const next = { ...current }
      DISCIPLINES.forEach((d) => {
        const base = current[d]?.baseRate ?? 0
        next[d] = recalcDiscipline(d, base, overhead)
      })
      return next
    })
  }

  function saveEdit() {
    if (!editingRegion || !currentCard) return
    const disciplines = {} as RateCard['disciplines']
    DISCIPLINES.forEach((d) => {
      disciplines[d] = {
        baseRate: editValues[d]?.baseRate ?? 0,
        salesRate: editValues[d]?.salesRate ?? 0,
        ot15Rate: editValues[d]?.ot15Rate ?? 0,
        ot2Rate: editValues[d]?.ot2Rate ?? 0,
      }
    })
    const overhead = parseFloat(editOverhead) || currentCard.overheadAndProfitLabour
    const sfgIndex = (parseFloat(editSfgIndex) || 100) / 100
    updateRateCard({
      ...currentCard,
      disciplines,
      overheadAndProfitLabour: overhead,
      sfgEfficiencyIndex: sfgIndex,
    })
    setRateCards(getRateCards())
    setEditingRegion(null)
    setSaved(editingRegion)
    setTimeout(() => setSaved(null), 2000)
  }

  // Role rate actions
  function openAddRole() {
    setDraftRole({
      id: Math.random().toString(36).slice(2),
      position: '',
      dayRate: 300,
      baseRate: 200,
      isCustom: true,
    })
    setRoleDialogOpen(true)
  }

  function openEditRole(role: RoleRate) {
    setDraftRole({ ...role })
    setRoleDialogOpen(true)
  }

  function saveRole() {
    if (!draftRole.position) return
    const role: RoleRate = {
      id: draftRole.id || Math.random().toString(36).slice(2),
      position: draftRole.position,
      dayRate: draftRole.dayRate ?? 0,
      baseRate: draftRole.baseRate ?? 0,
      isCustom: draftRole.isCustom ?? true,
    }
    const updated = roleRates.some((r) => r.id === role.id)
      ? roleRates.map((r) => (r.id === role.id ? role : r))
      : [...roleRates, role]
    saveRoleRates(updated)
    setRoleRates(updated)
    setRoleDialogOpen(false)
    setRoleSaved(true)
    setTimeout(() => setRoleSaved(false), 2000)
  }

  function deleteRole(id: string) {
    const updated = roleRates.filter((r) => r.id !== id)
    saveRoleRates(updated)
    setRoleRates(updated)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Rates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Regional labour rates and role day rates used in pricing calculations
        </p>
      </div>

      {/* Top tab bar */}
      <div className="flex gap-1 mb-5 border-b">
        <button
          onClick={() => setActiveTab('labour')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'labour'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Regional Labour Rates
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'roles'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Role & Day Rates
        </button>
      </div>

      {/* ── Labour rates tab ── */}
      {activeTab === 'labour' && (
        <div className="flex gap-5">
          {/* Region sidebar */}
          <div className="w-44 flex-shrink-0">
            <div className="flex flex-col gap-0.5">
              {REGIONS.map((region) => (
                <button
                  key={region.id}
                  onClick={() => { setActiveRegion(region.id); setEditingRegion(null) }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                    activeRegion === region.id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {region.name}
                </button>
              ))}
            </div>
          </div>

          {/* Rate card */}
          {currentCard && (
            <Card className="flex-1">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">
                    {REGIONS.find((r) => r.id === activeRegion)?.name}
                  </CardTitle>
                  {saved === activeRegion && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Saved</Badge>
                  )}
                </div>
                {canEdit && editingRegion !== activeRegion && (
                  <Button variant="outline" size="sm" onClick={() => startEdit(currentCard)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit Rates
                  </Button>
                )}
                {canEdit && editingRegion === activeRegion && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5 mr-1.5" />Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="w-3.5 h-3.5 mr-1.5" />Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {/* Global settings strip */}
                {editingRegion === activeRegion ? (
                  <div className="flex items-end gap-4 mb-4 p-3 bg-secondary/40 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs">Overhead &amp; Profit on Labour %</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number" step="0.5" min="0" max="100"
                          value={editOverhead}
                          onChange={(e) => handleOverheadChange(e.target.value)}
                          className="w-24 h-7 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Applied to all disciplines — sales rates recalculate automatically</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SFG20 Efficiency Index %</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number" step="1" min="50" max="200"
                          value={editSfgIndex}
                          onChange={(e) => setEditSfgIndex(e.target.value)}
                          className="w-24 h-7 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Regional productivity multiplier (100 = standard)</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 mb-4 px-3 py-2 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
                    <span>
                      Overhead &amp; profit on labour:{' '}
                      <strong className="text-foreground">{currentCard.overheadAndProfitLabour}%</strong>
                    </span>
                    <span>
                      SFG efficiency index:{' '}
                      <strong className="text-foreground">{(currentCard.sfgEfficiencyIndex * 100).toFixed(0)}%</strong>
                    </span>
                    {!canEdit && (
                      <span className="flex items-center gap-1 ml-auto text-muted-foreground/70">
                        <Info className="w-3.5 h-3.5" />
                        Pricing Manager or Admin role required to edit
                      </span>
                    )}
                  </div>
                )}

                {/* Column headers — 6 columns now including % diff */}
                <div className="grid grid-cols-[1fr_90px_90px_70px_90px_90px] text-xs font-medium text-muted-foreground bg-secondary/50 rounded-md px-3 py-2 mb-1">
                  <span>Discipline</span>
                  <span className="text-right">Base Rate</span>
                  <span className="text-right">Sales Rate</span>
                  <span className="text-right">% Diff</span>
                  <span className="text-right">OT 1.5×</span>
                  <span className="text-right">OT 2×</span>
                </div>
                <div className="divide-y">
                  {DISCIPLINES.map((d) => {
                    const rates = currentCard.disciplines[d]
                    const editing = editingRegion === activeRegion
                    const currentBase = editing ? (editValues[d]?.baseRate ?? rates.baseRate) : rates.baseRate
                    const currentSales = editing ? (editValues[d]?.salesRate ?? rates.salesRate) : rates.salesRate
                    return (
                      <div key={d} className="grid grid-cols-[1fr_90px_90px_70px_90px_90px] items-center py-2.5 px-3">
                        <p className="text-sm font-medium">{DISCIPLINE_LABELS[d]}</p>
                        {editing ? (
                          <>
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs text-muted-foreground">£</span>
                              <Input
                                type="number" step="0.50" min="0"
                                value={editValues[d]?.baseRate ?? rates.baseRate}
                                onChange={(e) => handleBaseRateChange(d, e.target.value)}
                                className="w-20 text-right h-7 text-sm"
                              />
                            </div>
                            <span className="text-sm text-right text-muted-foreground">
                              £{(editValues[d]?.salesRate ?? rates.salesRate).toFixed(2)}
                            </span>
                            <span className="text-xs text-right text-emerald-600 font-medium">
                              {pctDiff(editValues[d]?.baseRate ?? rates.baseRate, editValues[d]?.salesRate ?? rates.salesRate)}
                            </span>
                            <span className="text-sm text-right text-muted-foreground">
                              £{(editValues[d]?.ot15Rate ?? rates.ot15Rate).toFixed(2)}
                            </span>
                            <span className="text-sm text-right text-muted-foreground">
                              £{(editValues[d]?.ot2Rate ?? rates.ot2Rate).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-right">£{rates.baseRate.toFixed(2)}/hr</span>
                            <span className="text-sm font-semibold text-right text-primary">£{rates.salesRate.toFixed(2)}/hr</span>
                            <span className="text-xs text-right font-medium text-emerald-600">
                              {pctDiff(rates.baseRate, rates.salesRate)}
                            </span>
                            <span className="text-sm text-right text-muted-foreground">£{rates.ot15Rate.toFixed(2)}</span>
                            <span className="text-sm text-right text-muted-foreground">£{rates.ot2Rate.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Role & Day Rates tab ── */}
      {activeTab === 'roles' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Role & Day Rates</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Day rates for support roles included in quotes. Each role can be used with a specified number of days.
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                {roleSaved && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Saved</Badge>}
                <Button size="sm" variant="outline" onClick={openAddRole}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Add Role
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_110px_110px_80px_80px_44px] text-xs font-medium text-muted-foreground bg-secondary/50 rounded-md px-3 py-2 mb-1">
              <span>Role / Position</span>
              <span className="text-right">Day Rate (Client)</span>
              <span className="text-right">Base Cost (Internal)</span>
              <span className="text-right">% Diff</span>
              <span className="text-center">Type</span>
              <span />
            </div>
            <div className="divide-y">
              {roleRates.map((role) => (
                <div key={role.id} className="grid grid-cols-[1fr_110px_110px_80px_80px_44px] items-center py-2.5 px-3">
                  <p className="text-sm font-medium">{role.position}</p>
                  <p className="text-sm font-semibold text-right text-primary">£{role.dayRate.toFixed(0)}/day</p>
                  <p className="text-sm text-right text-muted-foreground">£{role.baseRate.toFixed(0)}/day</p>
                  <span className="text-xs text-right font-medium text-emerald-600">
                    {pctDiff(role.baseRate, role.dayRate)}
                  </span>
                  <div className="flex justify-center">
                    <Badge variant="outline" className={`text-xs py-0 ${role.isCustom ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-secondary text-muted-foreground'}`}>
                      {role.isCustom ? 'Custom' : 'Default'}
                    </Badge>
                  </div>
                  {canEdit ? (
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => openEditRole(role)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteRole(role.id)} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : <span />}
                </div>
              ))}
              {roleRates.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">No role rates defined.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{draftRole.id && roleRates.some((r) => r.id === draftRole.id) ? 'Edit Role Rate' : 'Add Role Rate'}</DialogTitle>
            <DialogDescription>Set the position name and rates for this role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Position / Role</Label>
              <Input
                value={draftRole.position ?? ''}
                onChange={(e) => setDraftRole((p) => ({ ...p, position: e.target.value }))}
                placeholder="e.g. Contract Manager"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Day Rate (charged to client) £</Label>
                <Input
                  type="number" min="0" step="10"
                  value={draftRole.dayRate ?? ''}
                  onChange={(e) => setDraftRole((p) => ({ ...p, dayRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Base Cost (internal) £</Label>
                <Input
                  type="number" min="0" step="10"
                  value={draftRole.baseRate ?? ''}
                  onChange={(e) => setDraftRole((p) => ({ ...p, baseRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            {(draftRole.dayRate ?? 0) > 0 && (draftRole.baseRate ?? 0) > 0 && (
              <p className="text-xs text-emerald-600 font-medium">
                Margin: {pctDiff(draftRole.baseRate ?? 0, draftRole.dayRate ?? 0)} above base cost
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveRole} disabled={!draftRole.position}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
