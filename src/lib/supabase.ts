import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Agency = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
};

export type AgencyMember = {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type ContactType = 'landlord' | 'tenant';

export type Contact = {
  id: string;
  agency_id: string;
  type: ContactType;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type PropertyStatus = 'leased' | 'vacant' | 'pending';

export type Property = {
  id: string;
  agency_id: string;
  address: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  property_type: string;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  landlord_id: string | null;
  management_gained_reason: string | null;
  gained_reason_source: string | null;
  property_category: string | null;
  property_aspect: string | null;
  has_aircon: boolean;
  has_garden: boolean;
  has_built_ins: boolean;
  has_internal_laundry: boolean;
  has_balcony: boolean;
  has_gas_cooking: boolean;
  has_electric_cooking: boolean;
  has_dishwasher: boolean;
  has_stairs: boolean;
  has_lift: boolean;
  ownership_type: string | null;
  split_payments: boolean;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_email: string | null;
  owner_mobile: string | null;
  management_fee_percent: number | null;
  letting_fee: number | null;
  lease_renewal_fee: number | null;
  advertising_fee: number | null;
  approved_maintenance_spend: number | null;
  admin_fee: number | null;
  admin_fee_charge_date: string | null;
  do_not_charge_admin_fee_if_vacant: boolean;
  created_at: string;
};

export type LeaseStatus = 'active' | 'expired' | 'pending';

export type Lease = {
  id: string;
  agency_id: string;
  property_id: string;
  tenant_id: string | null;
  start_date: string;
  end_date: string;
  rent_amount: number;
  bond_amount: number;
  status: LeaseStatus;
  payment_frequency: string;
  first_payment_date: string | null;
  paid_until: string | null;
  next_inspection_months: number | null;
  next_rent_review_months: number | null;
  gst_included: boolean;
  tenant_pays_water: boolean;
  is_periodic: boolean;
  internal_notes: string | null;
  created_at: string;
};

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export type Payment = {
  id: string;
  agency_id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  method: string | null;
  reference: string | null;
  created_at: string;
};

export type RentReviewStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export type RentReview = {
  id: string;
  agency_id: string;
  lease_id: string;
  review_date: string;
  current_rent: number;
  proposed_rent: number;
  approved_rent: number | null;
  status: RentReviewStatus;
  notes: string | null;
  created_at: string;
};
