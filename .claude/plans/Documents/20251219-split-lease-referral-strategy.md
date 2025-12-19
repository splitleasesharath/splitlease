# Split Lease Referral Strategy

**Simple. Direct. Cash Rewards.**

---

## Executive Summary

A dead-simple referral program: **Give $50, Get $50**. No badges, no tiers, no gamification friction. Just instant cash rewards that make sharing a no-brainer.

---

## The Program

### For Guests

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   💰 Give $50, Get $50                                          │
│                                                                 │
│   Share your link. When your friend books, you both get $50.    │
│                                                                 │
│   Your link: splitlease.com/r/alex                              │
│                                                                 │
│   [Copy Link]  [Share]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Who | Gets | When |
|-----|------|------|
| **You (referrer)** | $50 credit | Friend's first booking is confirmed |
| **Your friend** | $50 off | Their first booking |

### For Hosts

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   💰 Refer a Host, Get $100                                     │
│                                                                 │
│   Know someone with empty nights? Get $100 when they list.      │
│                                                                 │
│   Your link: splitlease.com/host/r/alex                         │
│                                                                 │
│   [Copy Link]  [Share]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Who | Gets | When |
|-----|------|------|
| **You (referrer)** | $100 cash | Referred host gets first booking |
| **New host** | $0 commission | On their first booking (worth ~$50-150) |

---

## Why This Works

### 1. Zero Friction
- One link to share
- One reward to understand
- No confusing tier systems

### 2. Immediate Value
- $50 is real money, not points
- Applied directly to next booking
- Friend gets instant benefit too

### 3. Both Sides Win
- Referrer gets rewarded
- Referred person gets a discount
- Creates positive first impression

---

## Implementation

### Database Schema

```sql
-- Simple referral tracking
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id),
  referred_id UUID REFERENCES users(id),
  referral_code TEXT UNIQUE,
  type TEXT CHECK (type IN ('guest', 'host')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid')),
  reward_amount INTEGER, -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- User referral codes
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
```

### Referral Code Generation

Simple, memorable codes based on user's first name:
- `alex` → `splitlease.com/r/alex`
- `alex` (duplicate) → `splitlease.com/r/alex-nyc`
- `alex` (another duplicate) → `splitlease.com/r/alex-42`

### Reward Distribution

**Guest Rewards ($50 credit):**
- Applied as credit to user's account
- Auto-applied to next booking
- Expires after 12 months

**Host Rewards ($100 cash):**
- Paid out with next monthly payment
- Or via PayPal/Venmo if no active listings

---

## UI Components

### 1. Dashboard Card (Minimal)

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 Earn $50 for every friend who books                         │
│                                                                 │
│  splitlease.com/r/alex                    [Copy]  [Share]       │
│                                                                 │
│  You've earned: $150  •  3 friends referred                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Share Sheet (One-Tap)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Share your $50 gift                                            │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   💬    │  │   ✉️    │  │   📋    │  │   ⋯    │            │
│  │ Message │  │  Email  │  │  Copy   │  │  More   │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Landing Page (Friend's View)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Alex invited you to Split Lease                                │
│                                                                 │
│  Get $50 off your first booking                                 │
│                                                                 │
│  NYC apartments for repeat stays.                               │
│  45% cheaper than hotels. Same place every trip.                │
│                                                                 │
│              [Claim Your $50]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Share Messages

### Text/iMessage (Guest)

```
Hey! I've been using Split Lease for my NYC trips - way cheaper than hotels and I get the same apartment every time.

Here's $50 off your first booking: splitlease.com/r/alex
```

### Text/iMessage (Host)

```
Hey! You mentioned you have empty nights at your place. I've been using Split Lease to rent mine out - made $X last month.

List with my link and your first booking is commission-free: splitlease.com/host/r/alex
```

---

## Reward Economics

### Guest Referrals

| Metric | Value |
|--------|-------|
| Average booking value | $1,400/month |
| Platform commission (14%) | $196 |
| Referral cost ($50 + $50) | $100 |
| **Net margin on referred booking** | $96 |
| **Payback period** | Immediate |

### Host Referrals

| Metric | Value |
|--------|-------|
| Average host lifetime value | $8,000+ |
| Platform commission (first year) | $1,120 |
| Referral cost ($100 + waived commission) | ~$200 |
| **Net margin (first year)** | $920+ |
| **Payback period** | 2 months |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Referral participation rate | 25% of active users |
| Referral conversion rate | 20% (click → signup) |
| Signup → booking rate | 30% |
| Cost per acquisition (referral) | $100 |
| Cost per acquisition (paid ads) | $250+ |
| **Savings vs paid acquisition** | 60%+ |

---

## Anti-Fraud Rules

1. **One reward per referred user** - Can't refer same person twice
2. **Real bookings only** - Reward triggers on confirmed booking, not signup
3. **No self-referral** - Same email/payment method blocked
4. **Minimum booking value** - Must be $100+ to qualify
5. **90-day attribution window** - Link must be clicked within 90 days of booking

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
- [ ] Referral code generation for all users
- [ ] Basic referral tracking table
- [ ] Copy link button in dashboard
- [ ] Referral landing page with discount
- [ ] Manual reward distribution

### Phase 2: Automation (Week 3-4)
- [ ] Automatic credit application
- [ ] Share sheet with native sharing
- [ ] Email notifications (referral used, reward earned)
- [ ] Referral history in account settings

### Phase 3: Optimization (Month 2)
- [ ] A/B test reward amounts ($50 vs $75)
- [ ] A/B test share messages
- [ ] Add SMS sharing option
- [ ] Referral analytics dashboard

---

## Comparison: Simple vs Complex

| Aspect | Complex (Nubank-style) | Simple (Cash) |
|--------|------------------------|---------------|
| User understanding | Takes explanation | Instant |
| Motivation | Status, belonging | Money |
| Friction | Multiple tiers, badges | One action |
| Development time | 4-6 weeks | 1-2 weeks |
| Ongoing maintenance | High (gamification) | Low |
| Conversion rate | Lower (confusion) | Higher (clarity) |

**Verdict:** Start simple. Add complexity only if data shows it helps.

---

## Summary

**The entire program in one sentence:**

> Share your link, your friend gets $50 off, you get $50 when they book.

That's it. No badges. No tiers. No "rescue your friends from hotel hell." Just cash.

---

**Document Version:** 2.0
**Updated:** 2025-12-19
**Change:** Simplified from gamification model to direct cash rewards
