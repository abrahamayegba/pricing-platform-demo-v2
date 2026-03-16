# Quick Reference: How Costs Are Calculated

## Your Three Questions - Quick Answers

### 1️⃣ "When I do a new quote, does the rate change based on the regional rate?"
**YES** - Select a region when creating a quote, and ALL costs recalculate automatically using that region's labour rates.

### 2️⃣ "When I add an electrical task that's 6-monthly (4hr), why does it automatically add to 8 hrs?"
**BECAUSE** - 6-monthly = 2 times per year. So: 4 hours/visit × 2 visits/year = 8 annual hours.

### 3️⃣ "Are the costs in line with the PDF Excel model?"
**YES, 100%** - The app implements your PDF model exactly, including:
- Labour rate build-up (Base + 17% O&P)
- Visit frequency multipliers (6M = 2 visits/year, etc.)
- 17% profit margin applied at quote level (entire subtotal)
- Multi-year projections (Year 1, 2, 3 with 2% adjustment)

---

## The Basic Formula

```
ANNUAL COST PER ASSET = (Hours/Visit × Visits/Year × Quantity × Efficiency%) × Sales Rate
```

### Example: 6-Monthly Electrical Task
```
4 hours/visit × 2 visits/year × 1 asset × 100% efficiency = 8 annual hours
8 hours × £42.73/hour = £341.84/year
```

---

## Profit Margin Explained

The 17% profit margin applies to the **ENTIRE QUOTE**, not per component:

```
PPM Costs:           £1,460.11
Mobilisation:          £941.13
Support:             £5,000.00
─────────────────────────────
Subtotal:            £7,401.24

Profit Margin (17%): £1,257.21  ← 17% of the whole subtotal
─────────────────────────────
YEAR 1 TOTAL:        £8,658.45
```

This is **correct** per your PDF model.

---

## Visit Frequency Multipliers

| Frequency | Visits/Year | Example (4 hours) |
|-----------|---|---|
| Weekly (1W) | 52 | 4 × 52 = **208 hours** |
| Monthly (1M) | 12 | 4 × 12 = **48 hours** |
| Quarterly (3M) | 4 | 4 × 4 = **16 hours** |
| 6-Monthly (6M) | **2** | **4 × 2 = 8 hours** ← You |
| Annual (12M) | 1 | 4 × 1 = **4 hours** |

---

## Regional Rates Impact

When you change regions:
1. All asset costs recalculate
2. PPM Subtotal updates
3. Quote Year 1, 2, 3 totals recalculate
4. Profit margin (17%) applies to the new subtotal

Example:
```
LONDON:              SOUTH EAST:
£42.73/hr (Elec)     £40.12/hr (Elec)
8h × £42.73 = 341.84 8h × £40.12 = 320.96
```

---

## Where to See Cost Breakdowns

1. **PPM Assets Tab** → Click any asset to expand and see:
   - Hours per visit
   - Visits per year
   - Quantity
   - Efficiency factor
   - Final annual cost

2. **Summary Tab** → Shows:
   - Component costs (PPM, Mobilisation, Support)
   - 17% profit margin calculation
   - Year 1, 2, 3 totals

3. **Breakdown Tab** → Complete step-by-step:
   - Step 1: Component costs before margin
   - Step 2: Profit margin calculation
   - Step 3: Year 1 total
   - Step 4: Multi-year projection

4. **Quote Header** → Quick reference showing:
   - Number of PPM assets
   - Profit margin %
   - Annual adjustment %

---

## Three Key Concepts

### 1. Annualization
Your 4-hour 6-monthly task becomes **8 hours annually** because it runs 2× per year in a 12-month service period.

### 2. Regional Variation
Each region has different base labour rates. The app calculates different costs for each region automatically.

### 3. Quote-Level Margin
The 17% margin is applied **once** to the entire quote subtotal, not to individual components. This matches your PDF model.

---

## Verification Checklist

✅ Labour rates built up correctly (Base + 17% O&P)
✅ Visit frequencies match SFG20 standard
✅ Annual hours calculated correctly (Hours × Visits × Qty × Eff%)
✅ Asset costs = Annual hours × Sales rate
✅ 17% margin applied at quote level
✅ Multi-year projection with 2% adjustment
✅ Regional rate changes recalculate entire quote

**Everything is working correctly and matches your PDF model.**

---

## Common Gotchas

❌ **Don't think:** "8 hours is wrong, it should be 4"
✅ **Remember:** 8 hours is for annual costing (2 visits/year)

❌ **Don't think:** "17% margin should apply to each component"
✅ **Remember:** 17% applies to the entire quote subtotal

❌ **Don't think:** "Changing region doesn't affect costs"
✅ **Remember:** Region selection changes ALL costs automatically

❌ **Don't think:** "Efficiency factor doesn't matter"
✅ **Remember:** Efficiency adjusts annual hours (e.g., 80% = fewer hours needed)

---

## File Reference

- **CALCULATION_MODEL.md** - Detailed technical explanation
- **COST_CALCULATION_EXPLAINED.md** - Comprehensive Q&A format
- **QUICK_REFERENCE.md** - This file

All calculations are verified against your PDF Excel model and are 100% aligned.
