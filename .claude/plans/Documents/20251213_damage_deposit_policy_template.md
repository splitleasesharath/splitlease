# Damage Deposit Policy - Template

**Purpose**: Template for creating a Damage Deposit policy document to be added to `zat_policiesdocuments` in Bubble.

**Target Slug**: `damage-deposit`

---

## Damage Deposit Policy

### 1. What is a Damage Deposit?

A Damage Deposit is a refundable payment collected at the start of your reservation to protect against potential property damage during your stay. Split Lease uses the term "Damage Deposit" rather than "Security Deposit" to simplify the process and avoid additional legal requirements such as separate escrow accounts and interest payments.

### 2. Deposit Amount

- The minimum Damage Deposit is **$500**
- The exact amount is set by the Host and displayed in the listing details
- The deposit amount is shown clearly during the proposal/booking process
- Higher-value properties or longer reservations may require larger deposits

### 3. When is the Deposit Collected?

- The Damage Deposit is collected with your **first payment** (first 4 weeks of rent)
- It is charged to your payment method on file at the time of booking confirmation
- The deposit must be paid in full before your check-in date

### 4. Who Holds the Deposit?

- **Split Lease holds the Damage Deposit** during the term of your reservation
- The deposit is held separately from rent payments
- Split Lease also matches the deposit amount as additional protection for Hosts (Enhanced Deposit Security)

### 5. What Does the Deposit Cover?

The Damage Deposit may be used to cover:

- **Property damage** beyond normal wear and tear
- **Missing items** (furniture, appliances, fixtures, linens, etc.)
- **Excessive cleaning costs** if the property is left in unreasonable condition
- **Unpaid rent or fees** at the end of the reservation
- **Key or access device replacement** if lost or not returned
- **Repairs** needed due to lease violations (e.g., unauthorized modifications)

### 6. What is NOT Covered (Normal Wear and Tear)

The following are considered normal wear and tear and will **not** result in deposit deductions:

- Minor scuffs or marks on walls
- Carpet wear in high-traffic areas
- Fading of paint or wallpaper due to sunlight
- Small nail holes from hanging pictures (where permitted)
- Minor appliance wear from regular use
- General cleaning that would be expected between guests

### 7. Deposit Refund Process

**Timeline**: Within **14 days** of your check-out date, Split Lease will:

1. Coordinate with the Host to conduct a property inspection
2. Review any damage claims submitted by the Host with documentation (photos, receipts)
3. Notify you of any proposed deductions
4. Process the refund of the remaining deposit to your original payment method

**Full Refund**: If no damage is reported and the property is left in satisfactory condition, **100% of your deposit will be refunded**.

### 8. Dispute Resolution

If you disagree with any deductions from your Damage Deposit:

1. **Within 7 days** of receiving the deduction notice, submit a written dispute to Split Lease
2. Include any evidence supporting your position (photos, videos, communication records)
3. Split Lease will review both parties' documentation
4. A determination will be made within **10 business days**
5. Split Lease's decision is final and binding per the Terms of Use

### 9. Documentation Recommendations

**For Guests**:
- Take photos/videos of the property upon check-in
- Report any pre-existing damage to the Host immediately
- Take photos/videos upon check-out showing the property's condition

**For Hosts**:
- Document property condition before each guest arrival
- Report any damage within **48 hours** of guest check-out
- Provide itemized claims with supporting documentation and cost estimates

### 10. Important Notes

- The Damage Deposit is **separate from rent payments** and is not applied toward rent
- If damages exceed the deposit amount, you may be liable for additional costs
- Intentional damage or gross negligence may result in account suspension
- Disputes should be resolved through Split Lease, not directly between Guest and Host

---

## Summary Table

| Aspect | Details |
|--------|---------|
| Minimum Amount | $500 |
| When Collected | With first payment |
| Held By | Split Lease |
| Refund Timeline | Within 14 days of check-out |
| Dispute Window | 7 days from deduction notice |

---

## Implementation Notes

**To add this policy to the platform:**

1. Create a PDF version of this document with Split Lease branding
2. Add a new record in Bubble's `policiesdocuments` data type:
   - **Name**: "Damage Deposit Policy"
   - **Slug**: "damage-deposit"
   - **Active**: true
   - **PDF Version**: [Upload the PDF URL]
   - **Type**: "policy"

3. After syncing to Supabase (`zat_policiesdocuments`), the link `/policies#damage-deposit` in ReviewSection.jsx will work correctly.

---

**Template Version**: 1.0
**Created**: 2025-12-13
**Based on**: Split Lease informational texts and standard rental deposit practices
