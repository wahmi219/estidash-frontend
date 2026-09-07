# Economic Dashboard Guide

Complete reference for the `/dashboard/economic` page data sources, calculations, and customization.

---

## Data Sources

### FRED (Federal Reserve Economic Data)
**API**: https://api.stlouisfed.org/fred  
**Config**: `estihub/app/services/economic/fred_service.py`

| Series ID | Metric | Description |
|-----------|--------|-------------|
| `MORTGAGE30US` | 30-Year Mortgage | Weekly average fixed rate |
| `MORTGAGE15US` | 15-Year Mortgage | Weekly average fixed rate |
| `DFF` | Fed Funds Rate | Daily effective federal funds rate |
| `DPRIME` | Prime Rate | Bank prime loan rate |

### BLS (Bureau of Labor Statistics)
**API**: https://api.bls.gov/publicAPI/v2  
**Config**: `estihub/app/services/economic/bls_service.py`

| Series ID | Metric | Description |
|-----------|--------|-------------|
| `CES2000000001` | Total Construction Employment | In thousands |
| `CES2000000007` | Avg Weekly Hours | Construction sector |
| `CES2000000003` | Avg Hourly Earnings | Construction sector |
| `JTU2300000000000000JOL` | Job Openings (JOLTS) | Construction openings |
| `JTU2300000000000000HIR` | Hires | Monthly hires |
| `JTU2300000000000000QUL` | Quits | Voluntary separations |
| `JTU2300000000000000LDL` | Layoffs | Involuntary separations |

---

## Dashboard Cards & Calculations

### 1. Interest Rates Card
**File**: `web/src/components/dashboard/economic/InterestRatesCard.tsx`

**Status Logic** (thresholds):
```javascript
// Favorable = green, Unfavorable = red
mortgage_30y: { low: 5%, high: 7% }
mortgage_15y: { low: 4%, high: 6% }
fed_funds:    { low: 3%, high: 5% }
prime_rate:   { low: 6%, high: 8% }
```

**To Modify Thresholds**: Edit `RATE_INFO` object (lines 13-34)

---

### 2. Employment Card
**File**: `web/src/components/dashboard/economic/EmploymentCard.tsx`

**Weekly Hours Status**:
```javascript
hours >= 42  → "high" (red)   // Overworked, tight labor
hours >= 38  → "normal" (green)
hours < 38   → "low" (amber)  // Slowdown indicator
```

**To Modify**: Edit `getHoursStatus()` function (lines 34-40)

---

### 3. Labor Market Card
**File**: `web/src/components/dashboard/economic/LaborMarketCard.tsx`

**Tightness Ratio** = Job Openings ÷ Hires

| Ratio | Status | Meaning |
|-------|--------|---------|
| ≥ 1.5 | Very Tight | 5-10% higher labor costs expected |
| ≥ 1.2 | Tight | Labor shortage risk |
| ≥ 0.8 | Balanced | Normal supply/demand |
| < 0.8 | Loose | Workers readily available |

**To Modify Thresholds**: Edit `getTightnessLevel()` function (lines 19-26)

---

### 4. Economic Health Score
**File**: `web/src/components/dashboard/economic/EconomicHealthCard.tsx`

**Calculation** (lines 15-80):
```
Base Score: 50 points

Interest Rates Factor:
  mortgage_30y ≤ 5.5% → +15 points (favorable)
  mortgage_30y ≤ 7.0% →  0 points (neutral)
  mortgage_30y > 7.0% → -15 points (unfavorable)

Employment Factor:
  avg_weekly_hours ≥ 40 → +10 points (strong demand)
  avg_weekly_hours ≥ 38 →  0 points (stable)
  avg_weekly_hours < 38 → -10 points (slowdown)

Labor Market Factor:
  tightness_ratio ≥ 1.5 → -10 points (too tight)
  tightness_ratio ≥ 1.0 →  0 points (balanced)
  tightness_ratio < 1.0 → +10 points (available workers)

Final Score: Clamped to 0-100
```

**Health Levels**:
- Score ≥ 65 → **Strong** (green)
- Score ≥ 45 → **Moderate** (amber)
- Score < 45 → **Cautious** (red)

**To Modify**: Edit `calculateHealthScore()` function

---

## Adding New FRED Series

1. **Backend** - Add to `fred_service.py`:
```python
# In SERIES_IDS dict
"NEW_METRIC": "FRED_SERIES_ID"
```

2. **Database** - Add migration for new column if needed

3. **API Schema** - Update `schemas/economic.py`

4. **Frontend** - Add to `economicSlice.ts` types and display in card

---

## Adding New BLS Series

1. **Backend** - Add to `bls_service.py`:
```python
# In _get_employment_series() or _get_jolts_series()
series_ids.append("CEU_OR_JTU_SERIES_ID")
```

2. **Parsing** - Update `_parse_employment_data()` to extract new field

3. **Database** - Add migration if new column needed

4. **Frontend** - Update types and components

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/economic/summary` | GET | All latest data |
| `/api/v1/economic/rates/latest` | GET | Just interest rates |
| `/api/v1/economic/employment/latest` | GET | Just employment |
| `/api/v1/economic/labor/latest` | GET | Just JOLTS |
| `/api/v1/economic/sync/fred` | POST | Sync FRED data |
| `/api/v1/economic/sync/bls` | POST | Sync BLS data |

---

## Quick Customization Examples

### Change "Strong" threshold to 70:
```typescript
// EconomicHealthCard.tsx line 75
if (score >= 70) level = 'strong';  // was 65
```

### Add new interest rate alert at 8%:
```typescript
// InterestRatesCard.tsx, RATE_INFO object
mortgage_30y: { threshold: { low: 5, high: 8 } }  // was 7
```

### Display tightness as percentage:
```typescript
// LaborMarketCard.tsx line 132
{(toNumber(data?.tightness_ratio) * 100)?.toFixed(0)}%
```
