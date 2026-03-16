# Backend Architecture Guide - SFG20 Pricing Platform

## Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt

## Prisma Schema Overview

The schema consists of 12 main tables. Here's what each one does:

### Authentication & Users (3 tables)

#### `User`
Stores login credentials and metadata for all users.

```prisma
model User {
  id    String   @id @default(cuid())
  name  String
  email String   @unique
  password String // hashed with bcrypt
  role  Role     @default(VIEWER)
  // ADMIN - full control
  // PRICING_MANAGER - can edit rates, approves quotes
  // VIEWER - read-only
}
```

**Who can edit:**
- Admins only: can reset passwords, change user roles
- Users self-serve: can update own name/password

---

### Regions & Rate Cards (5 tables)

#### `Region`
Lookup table for geographic areas (London, South East, Scotland, etc.).
Immutable—add new regions via migration.

```prisma
model Region {
  id   String @id // "london", "scotland"
  name String @unique // "London", "Scotland"
}
```

#### `RateCard`
Regional labour cost structure. **One per region.**

```prisma
model RateCard {
  id                        String @id @default(cuid())
  regionId                  String @unique
  overheadAndProfitLabour   Float @default(17) // % markup on labour
  overheadAndProfitMaterials Float @default(17) // % markup on materials
  sfgEfficiencyIndex        Float @default(1.0) // multiplier for flex hours
  // Relationships
  disciplineRates DisciplineRate[] // electrical, mechanical, gas, etc.
}
```

**Who can edit:**
- Admin: all fields
- Pricing_manager: overhead/profit %, efficiency index
- Viewer: read-only

**Usage in quote calculation:**
```
Sales Rate = (Base Rate + Prime Cost Overhead) * (1 + Overhead&Profit / 100)
Total Hours = SFG Hours * Visits/Year * Quantity * Efficiency[band]
```

#### `DisciplineRate`
Labour rate for a specific discipline in a region. **Belongs to RateCard.**

```prisma
model DisciplineRate {
  id           String @id
  rateCardId   String
  discipline   String // "electrical", "mechanical", "gas", "ac_refrigeration", "fabric", "me", "water_hygiene"
  baseRate     Float  // Prime cost per hour
  salesRate    Float  // Rate charged to client
  ot15Rate     Float  // 1.5x overtime
  ot2Rate      Float  // 2x overtime
  
  @@unique([rateCardId, discipline]) // Only one rate per discipline per region
}
```

**Example (London):**
- Discipline: "electrical"
- Base Rate: £20.68/hr
- Sales Rate: £24.19/hr (with 17% overhead)
- OT15: £36.29/hr
- OT2: £48.38/hr

---

### SFG20 Task Library (2 tables)

**Key Decision: STORE IN DATABASE (don't call API every time)**

#### `SFG20Task`
The standard SFG20 maintenance task library (~30 tasks).

```prisma
model SFG20Task {
  id           String @id // "j-db-inspect"
  code         String @unique // "J1.10"
  section      String // "Electrical"
  sectionCode  String // "J"
  discipline   String // "electrical"
  description  String // "Distribution Board – Inspection & Thermographic Survey"
  notes        String? // Optional context
  
  // Relationships
  frequencyHours SFG20FrequencyHour[] // Hours for each frequency band
  assetLines     AssetLine[] // Which asset lines use this task
}
```

#### `SFG20FrequencyHour`
Hours per visit for a task at each frequency. **Many per task.**

```prisma
model SFG20FrequencyHour {
  id            String @id
  sfg20TaskId   String
  frequencyBand String // "1W" (weekly), "1M" (monthly), "6M", "12M", etc.
  hoursPerVisit Float  // e.g., 4.0 hours
  
  @@unique([sfg20TaskId, frequencyBand]) // Only one rate per band per task
}
```

**Example (J1.10 - Distribution Board Inspection):**
- `frequencyBand: "12M"` → `hoursPerVisit: 4.0`
- Meaning: Annually (12M), 4 hours per visit

**Sync Strategy:**
1. **Nightly cron job** calls external SFG20 API
2. Updates hours if they change (with audit log)
3. Enables offline operation

---

### Quotes (6 tables)

#### `Quote`
The main pricing document.

```prisma
model Quote {
  id                   String @id @default(cuid())
  reference            String @unique // "Q-20250309-001"
  clientName           String
  siteName             String
  siteAddress          String
  regionId             String // Links to Region for rate cards
  rateCardId           String // Snapshot of rates used
  status               QuoteStatus // draft, sent, accepted, declined
  
  // Calculated summary figures (updated whenever lines change)
  ppmSubtotal          Float // Labour cost of all PPM lines
  mobilisationTotal    Float // One-off setup costs
  supportTotal         Float // Contract support staff costs
  subtotalBeforeMargin Float // Sum of above three
  profitMarginPct      Float // Markup percentage
  marginAmount         Float // Calculated: subtotalBeforeMargin * profitMarginPct / 100
  markupPct            Float // Derived percentage
  annualAdjustmentPct  Float // Year-on-year price increase
  totalYear1           Float // Total cost Year 1
  totalYear2           Float // Year 2 with adjustment
  totalYear3           Float // Year 3 with adjustment
  
  createdBy            String // User ID
  createdAt            DateTime
  updatedAt            DateTime
  
  // Relationships
  assetLines           AssetLine[]
  mobilisationCosts    MobilisationCost[]
  supportCosts         SupportCost[]
}
```

**Workflow:**
1. Admin creates draft quote
2. Adds asset lines (PPM tasks), mobilisation, support costs
3. System calculates totals
4. Admin reviews, sends to customer
5. Customer accepts → status changes to "accepted"

#### `AssetLine`
A single PPM maintenance line (e.g., "DB Inspection × 2 in London site").

```prisma
model AssetLine {
  id          String @id
  quoteId     String
  
  discipline  String // "electrical", "mechanical", etc.
  location    String // "Building A - 2nd Floor"
  service     String // "DB Inspection"
  makeModel   String // "Schneider Electric 63A"
  quantity    Int // How many of this asset
  sfg20TaskId String // Links to SFG20Task
  
  // Relationships
  efficiencyFactors AssetLineEfficiency[] // Can be different per frequency band
}
```

#### `AssetLineEfficiency`
Efficiency multiplier for a specific asset line at each frequency band.

```prisma
model AssetLineEfficiency {
  id              String
  assetLineId     String
  frequencyBand   String // "1W", "1M", "6M", "12M"
  efficiencyFactor Float // 1.0 = 100%, 1.2 = 120%, 0.8 = 80%
  
  @@unique([assetLineId, frequencyBand])
}
```

**Example:**
- Asset: "Distribution Board 2x in London"
- Task: J1.10 (4 hours/year, annual only)
- Efficiency for "12M": 1.0 (normal)
- Calculation: `4 hrs × 1 visit × 2 qty × 1.0 = 4 hours`
- Cost: `4 hours × £42.73/hr (electrical sales rate) = £170.92/year`

#### `MobilisationCost`
One-off costs for site access/setup (traffic cones, scaffolding, etc.).

```prisma
model MobilisationCost {
  id           String
  quoteId      String
  
  description  String // "Access scaffolding"
  quantity     Int // 2
  unit         String // "weeks"
  pricePerUnit Float // 150.00
  applyMarkup  Boolean // Whether to add profit margin
  profitMarkup Float // 13.64%
}
```

#### `SupportCost`
Contract support staff (e.g., FM supervisor, health & safety officer).

```prisma
model SupportCost {
  id              String
  quoteId         String
  
  position        String // "FM Supervisor"
  daysRequiredPA  Int // 250 (days per annum)
  fte             Float // 1.0 (full-time equivalent)
  estimatedSalary Float // 45000
  car             Float // 2500 (car allowance)
  fuelEstimate    Float // 1500
  niRate          Float // 15%
  pensionRate     Float // 3%
  
  // Calculated fields
  employmentCost  Float // salary + NI + pension
  shareOfTotal    Float // What % of total support is this role
  profitMarkup    Float // 0% (usually no markup on staff)
  costFactoredIn  Float // employmentCost * profitMarkup
}
```

**Calculation:**
```
Annual Salary = estimatedSalary * (daysRequiredPA / 365) * fte
NI = Annual Salary * (niRate / 100)
Pension = Annual Salary * (pensionRate / 100)
Total Cost = Annual Salary + NI + Pension
```

---

### Audit & Compliance (1 table)

#### `AuditLog`
Immutable record of all changes (required for FM contracts).

```prisma
model AuditLog {
  id        String @id
  userId    String // Who made the change
  quoteId   String? // What quote (if applicable)
  action    String // "CREATE", "UPDATE", "DELETE", "SEND", "ACCEPT"
  entity    String // "Quote", "AssetLine", "RateCard"
  details   String? // JSON of what changed
  createdAt DateTime
}
```

**Example:**
```json
{
  "userId": "user-123",
  "quoteId": "q-456",
  "action": "UPDATE",
  "entity": "AssetLine",
  "details": {
    "field": "quantity",
    "oldValue": 1,
    "newValue": 2
  },
  "createdAt": "2025-03-09T10:30:00Z"
}
```

---

## Key Calculations

### Quote Total Calculation

```typescript
async function calculateQuoteTotals(quote: Quote, rateCard: RateCard) {
  let ppmSubtotal = 0

  // 1. Labour for all PPM lines
  for (const line of quote.assetLines) {
    const disciplineRate = rateCard.disciplines.find(d => d.discipline === line.discipline)
    let totalHours = 0

    for (const freq of line.sfg20Task.frequencyHours) {
      const visitsPerYear = VISITS_PER_YEAR[freq.frequencyBand]
      const efficiency = line.efficiencyFactors.find(e => e.frequencyBand === freq.frequencyBand)?.efficiencyFactor || 1.0
      const hoursForBand = freq.hoursPerVisit * visitsPerYear * line.quantity * efficiency
      totalHours += hoursForBand
    }

    const lineCost = totalHours * disciplineRate.salesRate
    ppmSubtotal += lineCost
  }

  // 2. Mobilisation (with optional markup)
  const mobilisationTotal = quote.mobilisationCosts.reduce((sum, m) => {
    let cost = m.quantity * m.pricePerUnit
    if (m.applyMarkup) cost *= (1 + m.profitMarkup / 100)
    return sum + cost
  }, 0)

  // 3. Support staff
  const supportTotal = quote.supportCosts.reduce((sum, s) => {
    const salary = s.estimatedSalary * (s.daysRequiredPA / 365) * s.fte
    const ni = salary * (s.niRate / 100)
    const pension = salary * (s.pensionRate / 100)
    let cost = salary + ni + pension
    if (s.profitMarkup > 0) cost *= (1 + s.profitMarkup / 100)
    return sum + cost
  }, 0)

  // 4. Totals
  const subtotalBeforeMargin = ppmSubtotal + mobilisationTotal + supportTotal
  const marginAmount = subtotalBeforeMargin * (quote.profitMarginPct / 100)
  const totalYear1 = subtotalBeforeMargin + marginAmount
  const totalYear2 = totalYear1 * (1 + quote.annualAdjustmentPct / 100)
  const totalYear3 = totalYear2 * (1 + quote.annualAdjustmentPct / 100)

  return {
    ppmSubtotal,
    mobilisationTotal,
    supportTotal,
    subtotalBeforeMargin,
    marginAmount,
    totalYear1,
    totalYear2,
    totalYear3,
  }
}

const VISITS_PER_YEAR = {
  '1W': 52,
  '1M': 12,
  '2M': 6,
  '3M': 4,
  '4M': 3,
  '6M': 2,
  '12M': 1,
}
```

---

## Permission Model

| Action | Admin | Pricing_Manager | Viewer |
|--------|-------|-----------------|--------|
| View quotes | ✅ All | ✅ All | ✅ All |
| Create quote | ✅ | ✅ | ❌ |
| Edit draft quote | ✅ | ✅ | ❌ |
| Change quote status | ✅ | ✅ (send) | ❌ |
| View rate cards | ✅ | ✅ | ✅ |
| Edit rate cards (overhead/profit) | ✅ | ✅ | ❌ |
| Edit discipline rates | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ✅ (own quotes) |

---

## Database Setup

```bash
# Install dependencies
npm install @prisma/client prisma typescript ts-node

# Create .env
DATABASE_URL="postgresql://user:password@localhost:5432/sfg20_db"
JWT_SECRET="your-secret-key"

# Initialize Prisma
npx prisma init

# Run migrations
npx prisma migrate dev --name init

# Seed demo data
npx ts-node scripts/seed.ts

# View database (GUI)
npx prisma studio
```

---

## Deployment Checklist

- [ ] PostgreSQL database provisioned (AWS RDS, Azure Database, Railway, etc.)
- [ ] Environment variables set (DATABASE_URL, JWT_SECRET)
- [ ] Run `prisma migrate deploy` in CI/CD
- [ ] Seed initial regions and rate cards
- [ ] Enable automated SFG20 task sync job
- [ ] Configure audit log retention policy
- [ ] Set up database backups
- [ ] Enable row-level security (RLS) if using multi-tenant setup

---

## Summary

The Prisma schema is **normalized** and **audit-able**, with clear separation of concerns:
- **Users**: Authentication & roles
- **Rates**: Region-specific labour costs + efficiency
- **Tasks**: SFG20 library (synced from external API)
- **Quotes**: Customer proposals with full calculation history
- **Audit**: Compliance trail

All calculations are server-side, ensuring consistency across clients.
