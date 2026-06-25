'use client'

import { useEffect, useState } from 'react'
import { getQuotes } from '@/lib/store'
import type { Quote } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, TrendingUp, Clock, CheckCircle2, Plus, ArrowRight } from 'lucide-react'
import { formatCurrency, statusConfig } from '@/lib/utils-app'

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])

  useEffect(() => {
    setQuotes(getQuotes())
  }, [])

  const totalValue = quotes.reduce((s, q) => s + q.totalYear1, 0)
  const accepted = quotes.filter((q) => q.status === 'accepted')
  const draft = quotes.filter((q) => q.status === 'draft')
  const sent = quotes.filter((q) => q.status === 'sent')
  const acceptedValue = accepted.reduce((s, q) => s + q.totalYear1, 0)
  const recent = [...quotes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)

  return (
    <div className=" py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Good {getTimeOfDay()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here is your pricing overview</p>
        </div>
        <Button asChild>
          <Link href="/calculator">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Quotes" value={String(quotes.length)} icon={FileText} />
        <StatCard label="Pipeline Value" value={formatCurrency(totalValue)} sub="all quotes" icon={TrendingUp} accent />
        <StatCard label="Accepted" value={formatCurrency(acceptedValue)} sub={`${accepted.length} quote${accepted.length !== 1 ? 's' : ''}`} icon={CheckCircle2} />
        <StatCard label="Pending / Draft" value={String(sent.length + draft.length)} sub={`${sent.length} sent, ${draft.length} draft`} icon={Clock} />
      </div>

      {/* Recent quotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Quotes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/quotes">
              View all
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className=" -mt-3">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 pb-5">No quotes yet. Create your first quote to get started.</p>
          ) : (
            <div className="divide-y">
              {recent.map((q) => {
                const sc = statusConfig(q.status)
                return (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="flex items-center gap-4 px-2 py-3.5 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{q.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{q.siteName} · {q.reference}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${sc.badge}`}>
                      {sc.label}
                    </Badge>
                    <p className="text-sm font-semibold text-right shrink-0 w-24">{formatCurrency(q.totalYear1)}</p>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
