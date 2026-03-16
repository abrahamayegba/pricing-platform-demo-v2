# SFG20 Pricing Platform - Backend Architecture & API Examples

## Architecture Overview

The backend uses **Prisma ORM** with **Express.js** and **TypeScript**. The database is PostgreSQL.

### Key Design Decisions

#### 1. **SFG20 Tasks: Store vs. Call on Demand**

**Decision: STORE IN DATABASE**

**Rationale:**
- **Performance**: No external API calls per quote → faster quote generation
- **Resilience**: Works offline; doesn't fail if SFG20 API is down
- **Version Control**: Track which SFG20 version was used for each quote
- **Audit Trail**: Historical changes to task hours are queryable
- **Caching**: Eliminates redundant API calls; sync on a scheduled job

**Implementation:**
- `SFG20Task` table stores all ~30 standard tasks
- `SFG20FrequencyHour` junction table stores hours per frequency band (e.g., 1W, 1M, 6M, 12M)
- A scheduled job (e.g., nightly) syncs the table with the official SFG20 API
- If hours differ, create an audit trail for compliance

---

## Prisma Schema Summary

### Core Tables

| Table | Purpose |
|-------|---------|
| `User` | Admin, pricing_manager, viewer roles + auth |
| `Region` | Geographic regions (London, South East, etc.) |
| `RateCard` | Region-specific labour rates + overhead/profit % + SFG efficiency index |
| `DisciplineRate` | Electrical, Mechanical, Gas, A/C, Fabric, M&E, Water Hygiene rates per region |
| `SFG20Task` | Standard SFG20 task library (code J1.10, H1.10, etc.) |
| `SFG20FrequencyHour` | Hours per visit for each frequency band |
| `Quote` | Main quote document; aggregates asset lines + mobilisation + support |
| `AssetLine` | Individual PPM line items (e.g., "Distribution Board inspection @ location X") |
| `AssetLineEfficiency` | Per-band efficiency factors for a specific asset line (e.g., 1.2 = 120%) |
| `MobilisationCost` | One-off costs (e.g., traffic cones, access equipment) |
| `SupportCost` | Contract support staff (e.g., FM supervisor, coordinator) |
| `AuditLog` | Who did what, when, to which quote |

---

## Express API Examples

### Setup

```typescript
// server.ts
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, roleMiddleware } from './middleware/auth'

const app = express()
const prisma = new PrismaClient()

app.use(express.json())
app.use(authMiddleware) // Verify JWT on all routes

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/quotes - Create a new quote
app.post('/api/quotes', async (req, res) => {
  try {
    const { clientName, siteName, siteAddress, regionId, assetLines, mobilisationCosts, supportCosts } = req.body
    const userId = req.user.id // from JWT middleware

    // 1. Get rate card for region
    const rateCard = await prisma.rateCard.findUnique({
      where: { regionId },
      include: { disciplines: true },
    })
    if (!rateCard) return res.status(404).json({ error: 'Region not found' })

    // 2. Create quote
    const quote = await prisma.quote.create({
      data: {
        reference: `Q-${Date.now()}`, // Generate unique reference
        clientName,
        siteName,
        siteAddress,
        regionId,
        rateCardId: rateCard.id,
        status: 'draft',
        createdBy: userId,
        // Asset lines
        assetLines: {
          create: assetLines.map((line: any) => ({
            discipline: line.discipline,
            location: line.location,
            service: line.service,
            makeModel: line.makeModel,
            quantity: line.quantity,
            sfg20TaskId: line.sfg20TaskId,
            efficiencyFactors: {
              create: line.efficiencyFactors || [],
            },
          })),
        },
        mobilisationCosts: { create: mobilisationCosts || [] },
        supportCosts: { create: supportCosts || [] },
      },
      include: {
        assetLines: { include: { efficiencyFactors: true, sfg20Task: true } },
        mobilisationCosts: true,
        supportCosts: true,
        rateCard: { include: { disciplines: true } },
      },
    })

    // 3. Calculate totals
    const calculated = await calculateQuoteTotals(quote, rateCard)

    // 4. Update quote with calculated totals
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        ppmSubtotal: calculated.ppmSubtotal,
        mobilisationTotal: calculated.mobilisationTotal,
        supportTotal: calculated.supportTotal,
        subtotalBeforeMargin: calculated.subtotalBeforeMargin,
        marginAmount: calculated.marginAmount,
        markupPct: calculated.markupPct,
        totalYear1: calculated.totalYear1,
        totalYear2: calculated.totalYear2,
        totalYear3: calculated.totalYear3,
      },
    })

    // 5. Audit log
    await prisma.auditLog.create({
      data: { userId, quoteId: quote.id, action: 'CREATE', entity: 'Quote' },
    })

    res.status(201).json({ success: true, data: quote })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create quote' })
  }
})

// GET /api/quotes/:id - Fetch a specific quote
app.get('/api/quotes/:id', async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: {
        assetLines: { include: { efficiencyFactors: true, sfg20Task: true } },
        mobilisationCosts: true,
        supportCosts: true,
        rateCard: { include: { disciplines: true } },
        region: true,
        user: true,
      },
    })
    if (!quote) return res.status(404).json({ error: 'Quote not found' })
    res.json({ success: true, data: quote })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch quote' })
  }
})

// PUT /api/quotes/:id - Update a quote
app.put('/api/quotes/:id', async (req, res) => {
  try {
    const { clientName, siteName, status, assetLines } = req.body
    const userId = req.user.id

    // Only allow updates if draft or user is admin
    const quote = await prisma.quote.findUnique({ where: { id: req.params.id } })
    if (!quote) return res.status(404).json({ error: 'Quote not found' })
    if (quote.status !== 'draft' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Can only edit draft quotes' })
    }

    const updated = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        clientName,
        siteName,
        status,
        assetLines: assetLines ? { deleteMany: {}, create: assetLines } : undefined,
      },
      include: {
        assetLines: { include: { efficiencyFactors: true } },
        mobilisationCosts: true,
        supportCosts: true,
      },
    })

    // Recalculate & audit
    const rateCard = await prisma.rateCard.findUnique({
      where: { id: updated.rateCardId },
      include: { disciplines: true },
    })
    const calculated = await calculateQuoteTotals(updated, rateCard!)

    await prisma.quote.update({
      where: { id: req.params.id },
      data: calculated,
    })

    await prisma.auditLog.create({
      data: { userId, quoteId: quote.id, action: 'UPDATE', entity: 'Quote' },
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update quote' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// RATE CARDS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/rate-cards/:regionId - Fetch rate card for a region
app.get('/api/rate-cards/:regionId', async (req, res) => {
  try {
    const rateCard = await prisma.rateCard.findUnique({
      where: { regionId: req.params.regionId },
      include: { disciplines: true, region: true },
    })
    if (!rateCard) return res.status(404).json({ error: 'Rate card not found' })
    res.json({ success: true, data: rateCard })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch rate card' })
  }
})

// PUT /api/rate-cards/:regionId - Update rate card (admin/pricing_manager only)
app.put(
  '/api/rate-cards/:regionId',
  roleMiddleware(['admin', 'pricing_manager']),
  async (req, res) => {
    try {
      const { overheadAndProfitLabour, overheadAndProfitMaterials, sfgEfficiencyIndex, disciplines } = req.body

      const rateCard = await prisma.rateCard.update({
        where: { regionId: req.params.regionId },
        data: {
          overheadAndProfitLabour,
          overheadAndProfitMaterials,
          sfgEfficiencyIndex,
          // Update discipline rates if provided
          disciplineRates: disciplines
            ? {
                upsert: disciplines.map((d: any) => ({
                  where: { rateCardId_discipline: { rateCardId: req.params.regionId, discipline: d.discipline } },
                  create: d,
                  update: d,
                })),
              }
            : undefined,
        },
        include: { disciplines: true },
      })

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE',
          entity: 'RateCard',
          details: JSON.stringify({ regionId: req.params.regionId, changes: req.body }),
        },
      })

      res.json({ success: true, data: rateCard })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Failed to update rate card' })
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// SFG20 TASKS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/sfg20-tasks - List all tasks, optionally filter by discipline
app.get('/api/sfg20-tasks', async (req, res) => {
  try {
    const { discipline } = req.query
    const tasks = await prisma.sfg20Task.findMany({
      where: discipline ? { discipline: discipline as string } : {},
      include: { frequencyHours: true },
    })
    res.json({ success: true, data: tasks })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// POST /api/sfg20-tasks/sync (admin only) - Sync with SFG20 API
app.post('/api/sfg20-tasks/sync', roleMiddleware(['admin']), async (req, res) => {
  try {
    // Call external SFG20 API
    const externalTasks = await fetch('https://api.sfg20.co.uk/tasks').then(r => r.json())

    // Sync to database
    for (const task of externalTasks) {
      await prisma.sfg20Task.upsert({
        where: { code: task.code },
        create: {
          id: task.id,
          code: task.code,
          section: task.section,
          sectionCode: task.sectionCode,
          discipline: task.discipline,
          description: task.description,
          notes: task.notes,
          frequencyHours: {
            create: Object.entries(task.sfgHours).map(([band, hours]) => ({
              frequencyBand: band,
              hoursPerVisit: hours,
            })),
          },
        },
        update: {
          description: task.description,
          notes: task.notes,
          frequencyHours: {
            deleteMany: {},
            create: Object.entries(task.sfgHours).map(([band, hours]) => ({
              frequencyBand: band,
              hoursPerVisit: hours,
            })),
          },
        },
      })
    }

    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'SYNC', entity: 'SFG20Task' },
    })

    res.json({ success: true, message: `Synced ${externalTasks.length} tasks` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to sync SFG20 tasks' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function calculateQuoteTotals(quote: any, rateCard: any) {
  let ppmSubtotal = 0

  // 1. Calculate labour for all asset lines
  for (const line of quote.assetLines) {
    const task = line.sfg20Task
    const discipline = line.discipline
    const rate = rateCard.disciplines.find((d: any) => d.discipline === discipline)?.salesRate || 0

    // Sum hours across all frequency bands
    let totalHours = 0
    for (const freq of task.frequencyHours || []) {
      const visits = VISITS_PER_YEAR[freq.frequencyBand] || 0
      const efficiency = line.efficiencyFactors?.find((e: any) => e.frequencyBand === freq.frequencyBand)?.efficiencyFactor || 1.0
      const hoursForBand = freq.hoursPerVisit * visits * line.quantity * efficiency
      totalHours += hoursForBand
    }

    ppmSubtotal += totalHours * rate
  }

  // 2. Mobilisation costs
  let mobilisationTotal = 0
  for (const mob of quote.mobilisationCosts || []) {
    mobilisationTotal += mob.quantity * mob.pricePerUnit
    if (mob.applyMarkup) {
      mobilisationTotal *= 1 + mob.profitMarkup / 100
    }
  }

  // 3. Support costs
  let supportTotal = 0
  const totalDaysRequiredPA = (quote.supportCosts || []).reduce((sum: number, s: any) => sum + s.daysRequiredPA, 0)
  for (const sup of quote.supportCosts || []) {
    const salary = sup.estimatedSalary * (sup.daysRequiredPA / 365) * sup.fte
    const ni = salary * (sup.niRate / 100)
    const pension = salary * (sup.pensionRate / 100)
    const cost = salary + ni + pension
    supportTotal += cost * (1 + sup.profitMarkup / 100)
  }

  const subtotalBeforeMargin = ppmSubtotal + mobilisationTotal + supportTotal
  const marginAmount = subtotalBeforeMargin * (quote.profitMarginPct / 100)
  const totalYear1 = subtotalBeforeMargin + marginAmount
  const totalYear2 = totalYear1 * (1 + quote.annualAdjustmentPct / 100)
  const totalYear3 = totalYear2 * (1 + quote.annualAdjustmentPct / 100)
  const markupPct = (quote.profitMarginPct / (100 - quote.profitMarginPct)) * 100

  return {
    ppmSubtotal,
    mobilisationTotal,
    supportTotal,
    subtotalBeforeMargin,
    marginAmount,
    markupPct,
    totalYear1,
    totalYear2,
    totalYear3,
  }
}

const VISITS_PER_YEAR: Record<string, number> = {
  '1W': 52,
  '1M': 12,
  '2M': 6,
  '3M': 4,
  '4M': 3,
  '6M': 2,
  '12M': 1,
}

app.listen(3001, () => console.log('Server running on :3001'))
```

---

## Middleware Examples

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types/backend'

declare global {
  namespace Express {
    interface Request {
      user: JWTPayload
    }
  }
}

export function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function roleMiddleware(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
```

---

## Database Sync Strategy

**Option 1: Scheduled Job (Recommended)**
```typescript
// jobs/syncSFG20Tasks.ts
import cron from 'node-cron'

cron.schedule('0 0 * * *', async () => {
  // Run every night at midnight
  // Call POST /api/sfg20-tasks/sync
})
```

**Option 2: On-Demand**
- Admins can manually trigger sync via API or dashboard

---

## Summary

| Component | Type | Storage |
|-----------|------|---------|
| User authentication | Postgres | Stored (hashed passwords) |
| Rate cards | Postgres | Stored (editable by admin/pricing_manager) |
| SFG20 tasks | Postgres | Stored (synced from external API) |
| Quotes | Postgres | Stored (full audit trail) |
| Asset lines | Postgres | Stored (children of quotes) |
| Audit logs | Postgres | Stored (immutable) |

All calculations happen server-side in the API layer, ensuring consistency across all clients.
