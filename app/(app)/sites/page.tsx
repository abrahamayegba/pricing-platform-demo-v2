'use client'

import { useState } from 'react'
import { RefreshCw, MapPin, Building2 } from 'lucide-react'
import { DEMO_SITES } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function SitesPage() {
  const [sites, setSites] = useState(DEMO_SITES)
  const [lastRefreshed, setLastRefreshed] = useState('Demo data loaded')

  function refreshFromSfg() {
    setSites([...DEMO_SITES])
    setLastRefreshed(`Refreshed ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  }

  return (
    <div className="min-h-full bg-background">
      <header className="border-b bg-background px-8 py-6">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <h1 className="text-xl font-semibold">Sites</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Sites synced from Simpro via SFG.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshFromSfg}>
            <RefreshCw data-icon="inline-start" />
            Refresh from SFG
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-8 py-7">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{sites.length} sites available for quotes</p>
          <Badge variant="secondary">{lastRefreshed}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <CardTitle className="text-base">{site.name}</CardTitle>
                <Badge variant="outline">Simpro</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>{site.address}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
