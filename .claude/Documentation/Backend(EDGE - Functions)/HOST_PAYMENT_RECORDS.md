# Host Payment Records Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/host-payment-records/index.ts`
**ENDPOINT**: `POST /functions/v1/host-payment-records`

---

## Overview

Creates host payment records for leases based on calculated payment schedules. This function replaces Bubble's `CORE-create-host-payment-records-recursive-javascript` workflow.

**Key Difference**: First payment is **2 days AFTER move-in** (vs 3 days BEFORE for guest payments).

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
        "dueDate": "2026-01-17",       // 2 days after move-in
        "amount": 1800,                 // Net after service fee
        "type": "first_payment",
        "status": "pending"
      },
      {
        "id": "uuid",
        "dueDate": "2026-02-15",
        "amount": 1800,
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

The first payment is due **2 days after move-in**:

```javascript
const firstPaymentDate = addDays(moveInDate, 2);
```

### Host Compensation

Host receives rent minus platform service fee:

```javascript
const hostPayment = rentAmount - serviceFee;
```

### Payment Types

| Type | Description |
|------|-------------|
| `first_payment` | First rent disbursement |
| `rent` | Regular rent payment |
| `security_deposit_return` | Deposit return (end of lease) |

---

## Week Patterns

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

## Differences from Guest Payment Records

| Aspect | Host | Guest |
|--------|------|-------|
| First Payment Due | 2 days AFTER move-in | 3 days BEFORE move-in |
| Service Fee | Deducted | Added to total |
| Damage Deposit | N/A | Included in first payment |
| Payment Direction | Platform → Host | Guest → Platform |

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
| `payment_record_host` | Host payment records |
| `lease` | Lease information |

---

## Related Files

- Handler: `host-payment-records/handlers/generate.ts`
- Types: `host-payment-records/lib/types.ts`

---

**LAST_UPDATED**: 2026-01-20
