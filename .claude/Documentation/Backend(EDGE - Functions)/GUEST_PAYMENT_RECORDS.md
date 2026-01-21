# Guest Payment Records Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/guest-payment-records/index.ts`
**ENDPOINT**: `POST /functions/v1/guest-payment-records`

---

## Overview

Generates guest payment records for leases based on calculated payment schedules. This function replaces Bubble's `CORE-create-guest-payment-records-recursive-javascript` workflow.

**Key Difference**: First payment is **3 days BEFORE move-in** (vs 2 days AFTER for host payments).

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `generate` | Create payment records for a lease | Public |

---

## Request Format

```json
{
  "action": "generate",
  "payload": {
    "leaseId": "uuid",
    "rentalType": "Monthly" | "Weekly" | "Nightly",
    "moveInDate": "2026-01-15",
    "reservationSpanWeeks": 12,        // for Weekly/Nightly
    "reservationSpanMonths": 3,        // for Monthly
    "weekPattern": "Every week",
    "fourWeekRent": 2000,              // for Weekly/Nightly
    "rentPerMonth": 2000,              // for Monthly
    "maintenanceFee": 100,
    "damageDeposit": 500               // optional
  }
}
```

---

## Response Format

```json
{
  "success": true,
  "data": {
    "leaseId": "uuid",
    "paymentRecordsCreated": 6,
    "payments": [
      {
        "id": "uuid",
        "dueDate": "2026-01-12",       // 3 days before move-in
        "amount": 2500,
        "type": "first_payment",
        "status": "pending"
      },
      {
        "id": "uuid",
        "dueDate": "2026-02-15",
        "amount": 2000,
        "type": "rent",
        "status": "pending"
      }
    ]
  }
}
```

---

## Payment Calculation Logic

### First Payment

The first payment is due **3 days before move-in** and includes:

- First period's rent
- Damage deposit (if applicable)
- Pro-rated amount (if mid-period start)

```javascript
const firstPaymentDate = subtractDays(moveInDate, 3);
```

### Subsequent Payments

Based on rental type:

| Rental Type | Payment Frequency | Due Date |
|-------------|------------------|----------|
| Monthly | Monthly | 1st of each month |
| Weekly | Every 4 weeks | Start of 4-week period |
| Nightly | Single payment | Pre-stay |

### Week Patterns

For Weekly rentals, the `weekPattern` determines which weeks are included:

| Pattern | Description |
|---------|-------------|
| `Every week` | All 4 weeks of month |
| `Every other week` | Weeks 1 & 3 or 2 & 4 |
| `First and third week` | Weeks 1 & 3 only |
| `Second and fourth week` | Weeks 2 & 4 only |
| `First week only` | Week 1 only |
| `Second week only` | Week 2 only |
| `Third week only` | Week 3 only |
| `Fourth week only` | Week 4 only |

---

## Differences from Host Payment Records

| Aspect | Guest | Host |
|--------|-------|------|
| First Payment Due | 3 days BEFORE move-in | 2 days AFTER move-in |
| Damage Deposit | Included in first payment | N/A (host doesn't pay) |
| Service Fee | Included | N/A |
| Maintenance Fee | Included | N/A |

---

## Architecture

Standard action-based Edge Function pattern:

```typescript
const ALLOWED_ACTIONS = ['generate'] as const;
const PUBLIC_ACTIONS = new Set<Action>(['generate']);

const handlers: Readonly<Record<Action, typeof handleGenerate>> = {
  generate: handleGenerate,
};
```

---

## Error Handling

```json
// Missing required field
{
  "success": false,
  "error": "leaseId is required"
}

// Invalid rental type
{
  "success": false,
  "error": "Invalid rentalType: must be Monthly, Weekly, or Nightly"
}
```

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `payment_record_guest` | Guest payment records |
| `lease` | Lease information |

---

## Related Files

- Handler: `guest-payment-records/handlers/generate.ts`
- Types: `guest-payment-records/lib/types.ts`

---

**LAST_UPDATED**: 2026-01-20
