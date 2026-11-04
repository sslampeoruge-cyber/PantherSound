import { getSupabase } from "./supabase/client";
import type {
  Attachment,
  Clause,
  Client,
  ContractRow,
  FrameType,
  Payment,
  PaymentWithContract,
  Profile,
  SoundPackage,
  Venue,
} from "./types";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listContracts(): Promise<ContractRow[]> {
  const { data, error } = await getSupabase()
    .from("contracts_with_totals")
    .select("*")
    .order("event_date", { ascending: false });
  check(error);
  return (data ?? []) as ContractRow[];
}

export async function getContract(id: string): Promise<ContractRow | null> {
  const { data, error } = await getSupabase()
    .from("contracts_with_totals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  check(error);
  return (data as ContractRow | null) ?? null;
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await getSupabase()
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  check(error);
  return (data ?? []) as Client[];
}

export async function listVenues(activeOnly = true): Promise<Venue[]> {
  let query = getSupabase().from("venues").select("*").order("name");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  check(error);
  return (data ?? []) as Venue[];
}

export async function listSoundPackages(activeOnly = true): Promise<SoundPackage[]> {
  let query = getSupabase().from("sound_packages").select("*").order("name");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  check(error);
  return (data ?? []) as SoundPackage[];
}

export async function listFrameTypes(activeOnly = true): Promise<FrameType[]> {
  let query = getSupabase().from("frame_types").select("*").order("name");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  check(error);
  return (data ?? []) as FrameType[];
}

export async function listClauses(activeOnly = true): Promise<Clause[]> {
  let query = getSupabase().from("clauses").select("*").order("position");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  check(error);
  return (data ?? []) as Clause[];
}

export async function listPayments(contractId: string): Promise<Payment[]> {
  const { data, error } = await getSupabase()
    .from("payments")
    .select("*")
    .eq("contract_id", contractId)
    .order("paid_at", { ascending: true });
  check(error);
  return (data ?? []) as Payment[];
}

export async function listPaymentsWithContracts(
  start: string,
  end: string,
): Promise<PaymentWithContract[]> {
  const { data, error } = await getSupabase()
    .from("payments")
    .select("*, contracts(folio, honoree_name, event_date, client_id)")
    .gte("paid_at", start)
    .lte("paid_at", end)
    .order("paid_at", { ascending: false });
  check(error);
  return (data ?? []) as PaymentWithContract[];
}

export async function listAttachments(contractId: string): Promise<Attachment[]> {
  const { data, error } = await getSupabase()
    .from("attachments")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });
  check(error);
  return (data ?? []) as Attachment[];
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  check(error);
  return (data ?? []) as Profile[];
}

export async function createSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .storage.from("contracts")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function uploadContractFile(
  contractId: string,
  file: File,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${contractId}/${Date.now()}-${safeName}`;
  const { error } = await getSupabase()
    .storage.from("contracts")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  check(error);
  return path;
}
