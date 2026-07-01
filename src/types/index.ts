export type UserRole = 'taxpayer' | 'approver' | 'collector';

export type RequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'AWAITING_VERIFICATION' | 'COMPLETED';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  location_id: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  ward: string;
  region: string;
  collector_user_id: string | null;
  created_at: string;
}

export interface BusinessType {
  id: string;
  name: string;
  base_tax_rate: number;
  zone_multiplier: number;
  created_at: string;
}

export interface TaxpayerFinance {
  id: string;
  user_id: string;
  location_id: string;
  outstanding_debt: number;
  last_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelocationRequest {
  id: string;
  tracking_id: string;
  taxpayer_id: string;
  current_location_id: string;
  new_location_id: string;
  business_type_id: string;
  reason: string;
  status: RequestStatus;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  assigned_collector_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  taxpayer?: Profile;
  current_location?: Location;
  new_location?: Location;
  business_type?: BusinessType;
  verifier?: Profile;
  assigned_collector?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  relocation_request_id: string | null;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
}
