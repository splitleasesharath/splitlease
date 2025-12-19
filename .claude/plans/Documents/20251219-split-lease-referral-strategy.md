# Split Lease Referral Strategy

**Inspired by Nubank's Ambassador Program | Adapted for Two-Sided Marketplace**

---

## Executive Summary

This strategy adapts Nubank's wildly successful referral program to Split Lease's unique marketplace dynamics. Rather than financial incentives, we leverage **emotional rewards**, **status recognition**, and **community belonging** to transform satisfied guests and hosts into growth ambassadors.

The core insight: People who save $18K/year or earn consistent rental income become passionate advocates naturally. Our job is to give them the tools and recognition to share that passion at scale.

---

## 1. Program Names & Core Messages

### Guest Referral Program

**Program Name:**
🏠 **"Free Your Friends From Hotel Hell"**

**Why This Works:**
- Attacks the universal pain point: expensive, inconsistent hotel stays
- Positions the referrer as a hero helping friends escape a bad experience
- Playful tone aligned with Split Lease's direct, modern brand voice
- Creates emotional resonance with the frustration guests already feel

**Alternative Names (A/B Test):**
- "Stop Your Friends From Packing Every Trip"
- "Share Your Second Home Secret"
- "Welcome to the Multi-Local Club"

---

### Host Referral Program

**Program Name:**
🔑 **"Unlock the Empty Nights Network"**

**Why This Works:**
- Speaks directly to host pain point: unused nights = lost revenue
- "Network" implies community and shared knowledge
- "Unlock" suggests hidden opportunity they're sharing
- Appeals to entrepreneurial host mindset

**Alternative Names (A/B Test):**
- "Turn Your Friends' Empty Nights Into Income"
- "The Host Collective"
- "Share the Split Lease Advantage"

---

## 2. Where the Program Lives (Distribution)

### Primary Distribution: In-App Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                     GUEST DASHBOARD                              │
│  /guest-proposals/:userId                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🏠 Free Your Friends From Hotel Hell                    │   │
│  │                                                          │   │
│  │  You've saved $3,400 this year. Share the secret.       │   │
│  │                                                          │   │
│  │  [Share via WhatsApp]  [Copy Link]  [Email]              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Your Proposals                                                  │
│  ├── Accepted (2)                                               │
│  └── Pending (1)                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│                      HOST DASHBOARD                              │
│  /host-overview                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔑 Unlock the Empty Nights Network                      │   │
│  │                                                          │   │
│  │  You've earned $8,200 this year. Know other hosts?       │   │
│  │                                                          │   │
│  │  [Share via WhatsApp]  [Copy Link]  [Email]              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Your Listings                                                   │
│  ├── Active (3)                                                 │
│  └── Pending Proposals (7)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why In-App Only

| Benefit | Explanation |
|---------|-------------|
| **Trust Filter** | Only users who've experienced value can refer |
| **Credibility** | Friends trust recommendations from real users |
| **Timing Control** | Appears after positive interactions (accepted proposal, completed stay, payment received) |
| **Data Access** | Can show personalized savings/earnings to motivate sharing |

### Secondary Distribution Triggers

| Trigger Event | Action | Message |
|---------------|--------|---------|
| First proposal accepted | In-app modal | "Your NYC home is secured! Know someone who needs one too?" |
| After 3rd completed stay | Push notification | "You're officially a multi-local. Invite friends to join the club." |
| Host receives first payment | Email + in-app | "You just earned $X. Know other hosts with empty nights?" |
| Guest saves $1,000 cumulative | Achievement unlock | "You've saved $1,000! Share your secret?" |

---

## 3. Ambassador Tiers

### Guest Ambassadors

```
TIER 1: Multi-Local Member
├── Requirement: Active guest with 1+ booking
├── Benefit: Access to referral program
└── Badge: 🏠 Multi-Local Member

TIER 2: City Connector (5 referrals)
├── Requirement: 5 friends sign up + complete first booking
├── Benefit: "City Connector" badge + priority support
└── Badge: 🌆 City Connector

TIER 3: Housing Hero (10 referrals)
├── Requirement: 10 successful referrals
├── Benefit: Featured in community spotlight + exclusive events invite
└── Badge: 🦸 Housing Hero

TIER 4: Split Lease Pioneer (25 referrals)
├── Requirement: 25 successful referrals
├── Benefit: Advisory board invite + founder meetup
└── Badge: 🚀 Split Lease Pioneer
```

### Host Ambassadors

```
TIER 1: Host Member
├── Requirement: Active host with 1+ listing
├── Benefit: Access to host referral program
└── Badge: 🔑 Host Member

TIER 2: Neighborhood Networker (3 host referrals)
├── Requirement: 3 friends list properties
├── Benefit: "Neighborhood Networker" badge + priority listing support
└── Badge: 🏘️ Neighborhood Networker

TIER 3: Building Ambassador (7 host referrals)
├── Requirement: 7 successful host referrals
├── Benefit: Featured host spotlight + early feature access
└── Badge: 🏢 Building Ambassador

TIER 4: Split Lease Founding Host (15 host referrals)
├── Requirement: 15 successful host referrals
├── Benefit: Advisory board + revenue share on referred host bookings (1%)
└── Badge: 👑 Founding Host
```

---

## 4. Referral Flow

### Guest Referral Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         GUEST REFERRAL FLOW                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  STEP 1: DISCOVER                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Guest sees referral card in dashboard after positive event       │     │
│  │ Card shows: Personal savings, friends rescued count, next tier   │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 2: SHARE                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Guest clicks "Free Your Friends" button                          │     │
│  │ Options: WhatsApp (primary), iMessage, Email, Copy Link          │     │
│  │ Pre-filled message with personal referral link                   │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 3: FRIEND LANDS                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Friend clicks link → Personalized landing page                   │     │
│  │ Shows: "[Name] thinks you'd love Split Lease"                    │     │
│  │ + Friend's savings so far + Value proposition                    │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 4: FRIEND CONVERTS                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Friend browses → Creates account → Submits first proposal        │     │
│  │ Referral counted when: Proposal ACCEPTED by host                 │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 5: AMBASSADOR REWARDED                                               │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Original guest receives notification                             │     │
│  │ "🎉 [Friend] just secured their NYC home! You're a Housing Hero" │     │
│  │ Progress bar updates toward next tier                            │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Host Referral Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          HOST REFERRAL FLOW                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  STEP 1: DISCOVER                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Host sees referral card after receiving payment                  │     │
│  │ Card shows: Total earned, hosts referred, next tier              │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 2: SHARE                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Host clicks "Invite a Host" button                               │     │
│  │ Options: WhatsApp, Email, Copy Link                              │     │
│  │ Pre-filled: "I've been earning $X/month on Split Lease..."       │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 3: FRIEND LANDS                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Friend clicks → /list-with-us with referral attribution          │     │
│  │ Shows: "[Name] invited you to turn empty nights into income"     │     │
│  │ + Referrer's earnings badge (if permitted)                       │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 4: FRIEND LISTS                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Friend creates listing → Listing goes live                       │     │
│  │ Referral counted when: First proposal ACCEPTED by new host       │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                              │                                             │
│                              ▼                                             │
│  STEP 5: AMBASSADOR REWARDED                                               │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ Original host receives notification                              │     │
│  │ "🎉 [Friend] just got their first booking!"                      │     │
│  │ Progress bar updates toward next tier                            │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Reward Structure

### Core Philosophy: Emotional Over Financial

Following Nubank's playbook, Split Lease rewards focus on **status**, **belonging**, and **recognition** rather than cash incentives.

**Why This Works for Split Lease:**

| Financial Rewards Problem | Emotional Rewards Solution |
|---------------------------|---------------------------|
| Attracts low-quality referrals | Attracts genuine advocates |
| Expensive at scale | Costs nearly nothing |
| Feels transactional | Feels like community |
| Ends when reward ends | Creates lasting loyalty |
| Invites gaming/fraud | Self-selects authentic users |

### Guest Rewards

| Milestone | Reward | Description |
|-----------|--------|-------------|
| 1 referral | 🏠 **Welcome Badge** | "You brought a friend home" - shareable graphic |
| 5 referrals | 🌆 **City Connector Badge** | + Featured in monthly newsletter |
| 10 referrals | 🦸 **Housing Hero Badge** | + Invite to exclusive multi-local community Slack |
| 25 referrals | 🚀 **Pioneer Badge** | + Advisory board seat + founder dinner invite |

### Host Rewards

| Milestone | Reward | Description |
|-----------|--------|-------------|
| 1 referral | 🔑 **First Host Badge** | "You grew the network" - shareable graphic |
| 3 referrals | 🏘️ **Neighborhood Networker** | + Priority listing support |
| 7 referrals | 🏢 **Building Ambassador** | + Early access to new features + spotlight interview |
| 15 referrals | 👑 **Founding Host** | + 1% revenue share on referred hosts' bookings (perpetual) |

### The "Founding Host" Exception

The 1% revenue share for top-tier host ambassadors is the only financial reward. This works because:

1. **Hard to reach** (15 successful host referrals is significant)
2. **Aligned incentives** (ambassador wants referred hosts to succeed)
3. **Perpetual** (creates long-term advocacy, not one-time behavior)
4. **Low cost** (1% of referred host revenue, not platform revenue)

---

## 6. Incentives for Referred Users

### Guest Side: Zero Direct Incentive

**Referred guests receive:**
- ❌ No discount
- ❌ No credits
- ✅ Same great product

**Why This Works:**
- The product IS the incentive ($18K average yearly savings)
- Trust from friend's recommendation drives conversion
- Avoids attracting discount-seekers who churn
- Maintains pricing integrity

### Host Side: Zero Direct Incentive

**Referred hosts receive:**
- ❌ No reduced commission
- ❌ No bonus
- ✅ Same platform access

**Why This Works:**
- Consistent income from empty nights is the incentive
- Friend's success story is the social proof
- Avoids creating expectation of special treatment

---

## 7. Gamification Elements

### Progress Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 Your Referral Journey                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Friends Rescued: 7/10                                          │
│  ████████████████████░░░░░░░░ 70%                              │
│                                                                 │
│  Current Badge: 🌆 City Connector                               │
│  Next Badge: 🦸 Housing Hero (3 more referrals)                 │
│                                                                 │
│  Your Impact:                                                   │
│  ├── Friends saved: $24,500 combined                            │
│  ├── Hotel nights avoided: 142                                  │
│  └── Suitcases not packed: 284                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Shareable Achievements

When users hit milestones, generate shareable graphics:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│         🦸 HOUSING HERO 🦸                                       │
│                                                                 │
│         [User Name]                                             │
│                                                                 │
│    Rescued 10 friends from hotel hell                           │
│    Combined savings: $45,000                                    │
│                                                                 │
│    ─────────────────────────                                    │
│    splitlease.com                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Leaderboards (Optional - Test Carefully)

Monthly leaderboard for top referrers:
- **Guest Board**: "Top Multi-Local Connectors"
- **Host Board**: "Top Network Builders"

⚠️ **Caution**: Leaderboards can feel competitive. A/B test to ensure they motivate rather than discourage.

---

## 8. Messaging Templates

### WhatsApp Share (Guest)

```
Hey! I've been using Split Lease for my NYC trips and it's a game-changer.

Instead of $300/night hotels, I pay ~$100/night for the SAME apartment every time. I leave my stuff there, no packing/unpacking circus.

I've saved $X so far this year 🤯

Check it out: [referral_link]
```

### Email Share (Guest)

**Subject:** How I stopped wasting money on NYC hotels

```
Hey [Name],

Remember how I used to complain about NYC hotel prices?

I found something way better - Split Lease. It's like having a part-time apartment in the city.

Here's the deal:
- I pay 45% less than Airbnb
- SAME apartment every trip (no room roulette)
- I leave my clothes and work stuff there
- No packing, no unpacking, no "will the wifi work?" anxiety

I've saved $X this year alone.

You mentioned you're going to NYC a lot for [reason] - this would be perfect for you.

Check it out: [referral_link]

[Your name]
```

### WhatsApp Share (Host)

```
Hey! You mentioned you have that spare room/empty nights at your place.

I've been hosting on Split Lease and it's been great - made $X this month just from nights I wasn't using anyway.

It's not like Airbnb - guests are professionals who come the same nights every week, way less turnover.

Worth checking out: [referral_link]
```

---

## 9. Timing Strategy

### When to Ask (Critical)

| User State | Ask? | Reasoning |
|------------|------|-----------|
| Just signed up | ❌ No | Haven't experienced value yet |
| Submitted proposal | ❌ No | Outcome uncertain |
| Proposal accepted | ✅ Yes | Excitement peak, value confirmed |
| After 1st stay | ✅ Yes | Experience validated |
| After 3rd stay | ✅ Yes | Habit formed, strongest advocates |
| After payment (host) | ✅ Yes | Value literally deposited |
| After 5th booking (host) | ✅ Yes | Proven, committed host |

### Trigger Events

**Guest Triggers:**
1. Proposal accepted → Soft prompt (card in dashboard)
2. After first stay → Push notification
3. After third stay → Email + in-app modal
4. Savings milestone ($1K, $5K, $10K) → Achievement + share prompt

**Host Triggers:**
1. First payment received → Card in dashboard
2. First review received → Soft prompt
3. Third booking confirmed → Push notification
4. Earnings milestone ($1K, $5K, $10K) → Achievement + share prompt

---

## 10. Personalized Landing Pages

### Guest Referral Landing Page

URL: `splitlease.com/r/[referrer_code]`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Referrer Name] thinks you'd love Split Lease                  │
│                                                                 │
│  They've saved $12,400 this year on NYC stays.                  │
│  Now they want you to stop wasting money on hotels too.         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  What is Split Lease?                                           │
│  The smarter way to have a second home in NYC.                  │
│                                                                 │
│  ✓ 45% cheaper than Airbnb                                      │
│  ✓ Same apartment every trip                                    │
│  ✓ Leave your stuff - no packing/unpacking                      │
│  ✓ Pay only for nights you need                                 │
│                                                                 │
│           [Explore Rentals]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Host Referral Landing Page

URL: `splitlease.com/host/r/[referrer_code]`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Referrer Name] invited you to join the network                │
│                                                                 │
│  They've earned $8,200 this year from empty nights.             │
│  You have empty nights too, right?                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Turn Unused Nights Into Income                                 │
│                                                                 │
│  ✓ Keep your schedule - rent only nights you don't use          │
│  ✓ Consistent guests (same person weekly, not tourists)         │
│  ✓ 8-14% commission (covers everything)                         │
│  ✓ No long-term tenant commitment                               │
│                                                                 │
│           [List Your Space]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Success Metrics

### Primary KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Referral Participation Rate** | 30% of active users share | Users who share / Active users |
| **Referral Conversion Rate** | 15% | Referred signups / Referral clicks |
| **Referral-to-Booking Rate** | 40% | Referred users who book / Referred signups |
| **K-Factor** | >1.0 | Viral coefficient (referrals × conversion) |
| **CAC Reduction** | 50% lower | Referral CAC vs paid CAC |

### Secondary KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Ambassador Tier Progression | 20% reach Tier 2+ | Users at Tier 2+ / All ambassadors |
| Share Channel Distribution | WhatsApp 60%+ | Shares by channel |
| Time to First Share | <7 days post-booking | Avg days from booking to first share |
| Referred User LTV | 20% higher | LTV of referred vs organic users |

### Tracking Infrastructure

```
referral_events table:
├── referrer_id (user who shared)
├── referred_id (user who signed up)
├── referral_code
├── channel (whatsapp, email, copy_link)
├── landing_page_views
├── signup_completed_at
├── first_proposal_at
├── first_booking_at
├── attributed_revenue (running total)
└── created_at
```

---

## 12. Anti-Gaming Measures

### Referral Quality Gates

| Gate | Rule | Reasoning |
|------|------|-----------|
| **Signup ≠ Success** | Referral only counts on first accepted proposal | Prevents fake signups |
| **No Self-Referral** | Same email domain / payment method blocked | Obvious fraud prevention |
| **Velocity Limits** | Max 5 referrals per day per user | Prevents bot abuse |
| **Account Age** | Referrer must have 30+ day old account | Ensures real users |
| **Booking Completion** | For top-tier rewards, require referred user to complete stay | Ensures quality |

### Monitoring Alerts

- Unusual referral velocity from single user
- High referral-to-signup, low signup-to-booking ratio
- Multiple referred users with similar data patterns
- Referral codes shared on coupon/deal sites (monitor, may be fine)

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1-4)

**Database:**
- [ ] Create `referral_codes` table (user_id, code, created_at)
- [ ] Create `referral_events` table (see schema above)
- [ ] Create `ambassador_tiers` table (user_id, tier, achieved_at)

**Backend:**
- [ ] Generate unique referral codes per user
- [ ] Referral attribution on signup
- [ ] Event tracking (share, click, signup, booking)
- [ ] Tier calculation logic

**Frontend:**
- [ ] Referral card component in guest dashboard
- [ ] Referral card component in host dashboard
- [ ] Share sheet (WhatsApp, Email, Copy Link)
- [ ] Personalized landing pages (guest + host)

### Phase 2: Gamification (Week 5-8)

- [ ] Progress bar component
- [ ] Badge display in user profile
- [ ] Achievement notifications
- [ ] Shareable milestone graphics
- [ ] "Your Impact" stats component

### Phase 3: Optimization (Week 9-12)

- [ ] A/B test program names
- [ ] A/B test share messaging
- [ ] A/B test timing triggers
- [ ] Implement leaderboards (if A/B positive)
- [ ] Email drip campaign for dormant ambassadors

### Phase 4: Scale (Month 4+)

- [ ] Push notification integration
- [ ] In-app messaging for referral prompts
- [ ] Ambassador community (Slack/Discord)
- [ ] Founding Host revenue share implementation
- [ ] Annual "Top Ambassador" recognition event

---

## 14. Sample UI Components

### Referral Card (Dashboard)

```jsx
// ReferralCard.jsx - Conceptual structure
<Card>
  <Header>
    <Icon>🏠</Icon>
    <Title>Free Your Friends From Hotel Hell</Title>
  </Header>

  <Stats>
    <Stat label="Friends Rescued" value={referralCount} />
    <Stat label="Their Savings" value={formatCurrency(totalSavings)} />
  </Stats>

  <ProgressBar
    current={referralCount}
    target={nextTierThreshold}
    label={`${nextTierThreshold - referralCount} more to ${nextTierName}`}
  />

  <ShareButtons>
    <ShareButton channel="whatsapp" primary />
    <ShareButton channel="email" />
    <ShareButton channel="copy" />
  </ShareButtons>
</Card>
```

### Badge Display (Profile)

```jsx
// AmbassadorBadge.jsx
<BadgeContainer>
  <BadgeIcon tier={currentTier} />
  <BadgeLabel>{tierName}</BadgeLabel>
  <ReferralCount>{count} friends rescued</ReferralCount>
</BadgeContainer>
```

---

## 15. Why This Strategy Will Work for Split Lease

### Nubank Parallels

| Nubank Factor | Split Lease Equivalent |
|---------------|------------------------|
| Pain point: Bank queues | Pain point: Hotel prices + inconsistency |
| Emotional reward: "Good Friend Badge" | Emotional reward: "Housing Hero Badge" |
| Product IS the incentive | Product IS the incentive ($18K savings) |
| Ask after value delivered | Ask after booking confirmed / payment received |
| Young, tech-savvy audience | Multi-local professionals, digitally native |

### Split Lease Advantages

1. **Two-sided network effects**: Both guests AND hosts can refer, doubling viral potential
2. **High savings = high motivation**: $18K annual savings creates passionate advocates
3. **Specific persona**: Multi-locals know other multi-locals (consultants know consultants)
4. **Repeat relationship**: Ongoing bookings = ongoing reminder to refer
5. **Status appeal**: "I have a second home in NYC" is inherently shareable

### Expected Outcomes

| Outcome | Conservative | Optimistic |
|---------|--------------|------------|
| % of users who share | 15% | 35% |
| Referral conversion rate | 10% | 20% |
| CAC reduction | 30% | 60% |
| % of new users from referral | 20% | 45% |

---

## Appendix A: Pre-filled Share Messages

### WhatsApp - Guest (Short)

```
I found a way to stay in NYC for 45% less. Same apartment every trip, leave my stuff there. Saved $X so far: [link]
```

### WhatsApp - Guest (Long)

```
Okay I have to share this. I've been using Split Lease for my NYC trips.

Instead of hotels ($300/night 💀) or random Airbnbs, I have the SAME apartment every time. $100/night, I leave my clothes there, my laptop charger, everything.

No more packing. No more "will this place actually look like the photos?"

I've saved $X this year.

You travel to NYC right? Check it out: [link]
```

### WhatsApp - Host (Short)

```
Been earning $X/month from my empty nights on Split Lease. Way less hassle than Airbnb. Worth checking out: [link]
```

### Email - Guest (Subject Line Options)

- "How I stopped wasting money on NYC hotels"
- "My $18K NYC secret"
- "Stop packing for NYC"
- "I have a part-time apartment now"

### Email - Host (Subject Line Options)

- "Turning empty nights into money"
- "Better than Airbnb for NYC hosts"
- "Made $X from nights I wasn't using"

---

## Appendix B: Badge Designs (Conceptual)

### Guest Badges

```
Tier 1: 🏠 Multi-Local Member
- Simple house icon
- Neutral/welcoming colors
- "Part of the family"

Tier 2: 🌆 City Connector
- City skyline silhouette
- Blue/purple gradient
- "Building bridges"

Tier 3: 🦸 Housing Hero
- Cape/hero iconography
- Gold accents
- "Saving friends from hotel hell"

Tier 4: 🚀 Split Lease Pioneer
- Rocket/pioneer imagery
- Premium metallic finish
- "Founding the movement"
```

### Host Badges

```
Tier 1: 🔑 Host Member
- Key icon
- Clean, professional
- "Unlocking income"

Tier 2: 🏘️ Neighborhood Networker
- Connected houses icon
- Community feel
- "Growing the network"

Tier 3: 🏢 Building Ambassador
- Building icon with connection nodes
- Premium design
- "Pillar of the community"

Tier 4: 👑 Founding Host
- Crown with key integration
- Gold/premium finish
- "Royalty status"
```

---

## Appendix C: Technical Implementation Notes

### Referral Code Generation

```javascript
// Generate unique, readable referral codes
function generateReferralCode(userId) {
  const adjectives = ['happy', 'sunny', 'cozy', 'urban', 'swift'];
  const nouns = ['nest', 'haven', 'spot', 'pad', 'loft'];
  const adj = adjectives[userId % adjectives.length];
  const noun = nouns[Math.floor(userId / adjectives.length) % nouns.length];
  const num = String(userId).slice(-3).padStart(3, '0');
  return `${adj}-${noun}-${num}`; // e.g., "happy-nest-042"
}
```

### Attribution Window

- **Click-to-signup**: 30 days (cookie/localStorage)
- **Signup-to-booking**: 90 days (database)
- **Last-touch attribution**: Most recent referral code wins

### Share Tracking

```javascript
// Track share events
const trackShare = async (channel, referralCode) => {
  await supabase.from('referral_events').insert({
    referrer_id: currentUser.id,
    referral_code: referralCode,
    channel: channel, // 'whatsapp', 'email', 'copy'
    event_type: 'share',
    created_at: new Date().toISOString()
  });
};
```

---

**Document Version:** 1.0
**Created:** 2025-12-19
**Based On:** Nubank Referral Program Analysis
**Author:** Claude Code

---

*"Good service + customer referrals" — The simplest growth formula, executed with precision.*
