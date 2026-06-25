'use client'

import { useState } from 'react'
import { SFG20_TASKS, SFG20_SECTIONS, DISCIPLINE_LABELS, DISCIPLINE_COLORS } from '@/lib/data'
import { VISITS_PER_YEAR } from '@/lib/types'
import type { FrequencyBand, SFG20Task } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, RefreshCw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const BAND_ORDER: FrequencyBand[] = ['1W', '1M', '2M', '3M', '4M', '6M', '12M']

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [tasks, setTasks] = useState<SFG20Task[]>(SFG20_TASKS)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const filtered = tasks.filter((t) => {
    const matchSection = !activeSection || t.sectionCode === activeSection
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      t.description.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.section.toLowerCase().includes(q)
    return matchSection && matchSearch
  })

  function handleRefresh() {
    setRefreshing(true)
    // Simulate fetching from SFG20 endpoint
    setTimeout(() => {
      // Demo: slightly jitter some hours values to show "data refreshed"
      setTasks(SFG20_TASKS.map((t) => ({ ...t })))
      setRefreshing(false)
      setRefreshed(true)
      setLastRefreshed(new Date())
      setTimeout(() => setRefreshed(false), 2500)
    }, 1400)
  }

  return (
    <div className="py-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">SFG20 Task Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} scheduled maintenance tasks across {SFG20_SECTIONS.length} disciplines
          </p>
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last synced: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            {refreshed ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Synced</span>
              </>
            ) : (
              <>
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                {refreshing ? 'Syncing…' : 'Refresh from SFG20'}
              </>
            )}
          </Button>
      </div>

      {refreshing && (
        <div className="mb-4 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Fetching latest SFG20 task data from endpoint…
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or description..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection(null)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              activeSection === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            All sections
          </button>
          {SFG20_SECTIONS.map((s) => (
            <button
              key={s.code}
              onClick={() => setActiveSection(activeSection === s.code ? null : s.code)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                activeSection === s.code
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              {s.code} — {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_160px_repeat(7,52px)] text-xs font-medium text-muted-foreground bg-secondary/50 border-b px-4 py-2.5">
          <span>Code</span>
          <span>Description</span>
          <span>Discipline</span>
          {BAND_ORDER.map((b) => (
            <span key={b} className="text-center">{b}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No tasks match your search.
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[90px_1fr_160px_repeat(7,52px)] items-center px-4 py-3 hover:bg-secondary/30 transition-colors text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground min-w-[100px] pr-3">{task.code}</span>
                <div className="min-w-0 pr-4 pl-2">
                  <p className="font-medium truncate">{task.description}</p>
                  {task.notes && <p className="text-xs text-muted-foreground truncate">{task.notes}</p>}
                </div>
                <span>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', DISCIPLINE_COLORS[task.discipline])}
                  >
                    {DISCIPLINE_LABELS[task.discipline]}
                  </Badge>
                </span>
                {BAND_ORDER.map((b) => {
                  const hrs = task.sfgHours[b] ?? 0
                  return (
                    <div key={b} className="text-center text-xs">
                      {hrs > 0
                        ? <span className="font-medium">{hrs}h</span>
                        : <span className="text-muted-foreground/30">—</span>
                      }
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Hours shown are SFG20 standard hours per visit for each frequency band. Hours can be adjusted when adding a task to a quote. Annual cost is calculated using regional labour rates.
      </p>
    </div>
  )
}
