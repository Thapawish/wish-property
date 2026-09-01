/*
# Add detailed lease management fields

1. New columns on `leases`
- `payment_frequency` stores how often rent is payable, such as weekly, fortnightly, or monthly.
- `first_payment_date` stores the date the first rent payment is due.
- `paid_until` stores the date rent has been paid through.
- `next_inspection_months` stores the inspection interval in months.
- `next_rent_review_months` stores the rent review interval in months.
- `gst_included` records whether GST is included in the rent amount.
- `tenant_pays_water` records whether the tenant pays water charges.
- `is_periodic` records whether the agreement is periodic rather than fixed-term.
- `internal_notes` stores private agency notes about the lease.

2. Modified tables
- `leases` gains only additive, nullable or safely defaulted fields; existing lease records remain valid.

3. Security
- The existing row-level security policies on `leases` continue to protect the new fields using the existing agency access rules.

4. Important notes
- Existing `rent_amount` remains the stored payable amount so current rent and payment records are not altered.
- Existing `start_date` and `end_date` continue to define the lease term.
*/

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS payment_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS first_payment_date date,
  ADD COLUMN IF NOT EXISTS paid_until date,
  ADD COLUMN IF NOT EXISTS next_inspection_months integer,
  ADD COLUMN IF NOT EXISTS next_rent_review_months integer,
  ADD COLUMN IF NOT EXISTS gst_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_pays_water boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_periodic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes text;