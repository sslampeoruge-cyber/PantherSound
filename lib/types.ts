export type Role = "admin" | "vendedor" | "consulta";

export type ContractStatus = "pendiente" | "parcial" | "pagado" | "cancelado";

export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta" | "otro";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
}

export interface SoundPackage {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  active: boolean;
}

export interface FrameType {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

export interface Clause {
  id: string;
  position: number;
  text: string;
  active: boolean;
}

export interface ContractRow {
  id: string;
  folio: string;
  client_id: string | null;
  contractor_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  venue_id: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  honoree_name: string | null;
  sound_package_id: string | null;
  sound_notes: string | null;
  price: number;
  photos: boolean;
  photos_price: number;
  frame_type_id: string | null;
  filming: boolean;
  filming_price: number;
  recording_location: string | null;
  observations: string | null;
  representative_name: string | null;
  signed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  client_name: string | null;
  client_phone: string | null;
  venue_name: string | null;
  sound_name: string | null;
  frame_name: string | null;
  total: number;
  paid_total: number;
  remaining: number;
  status: ContractStatus;
}

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  paid_at: string;
  method: PaymentMethod;
  reference: string | null;
  receipt_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PaymentWithContract extends Payment {
  contracts?: {
    folio: string;
    honoree_name: string | null;
    event_date: string;
    client_id: string | null;
  } | null;
}

export interface Attachment {
  id: string;
  contract_id: string;
  storage_path: string;
  kind: string;
  file_name: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ContractFormValues {
  contractor_name: string;
  address_line1: string;
  address_line2: string;
  venue_id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  honoree_name: string;
  sound_package_id: string;
  sound_notes: string;
  price: number;
  photos: boolean;
  photos_price: number;
  frame_type_id: string;
  filming: boolean;
  filming_price: number;
  recording_location: string;
  observations: string;
  representative_name: string;
  signed_at: string;
}
