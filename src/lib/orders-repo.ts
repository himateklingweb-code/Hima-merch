import { getSupabase, isSupabaseConfigured } from "./supabase";
import { orders as demoOrders } from "@/data/orders";
import type { PaymentStatus, OrderStatus } from "@/data/orders";

/** A line in a basket — one product/variant combination. */
export interface OrderItemRecord {
  product_id?: string;
  product_name: string;
  product_slug?: string | null;
  variant: string | null;
  variant_id?: string | null;
  stock_type_snapshot: "ready_stock" | "pre_order";
  qty: number;
  unit_price: number;
  subtotal: number;
  /** Foto produk/varian saat dipesan (tetap ada walau produk diubah). */
  image?: string | null;
}

/** Full order, as staff see it in the dashboard. */
export interface OrderRecord {
  id: string;
  order_code: string;
  buyer_name: string;
  buyer_wa: string;
  /** Email of the signed-in account that placed the order, if any. */
  buyer_email?: string | null;
  buyer_nim?: string | null;
  buyer_prodi?: string | null;
  buyer_address: string;
  notes?: string | null;
  total_amount: number;
  item_count: number;
  /** Nominal yang sudah masuk (DP atau lunas). */
  amount_paid?: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  payment_proof_url?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  /** Batas bayar; lewat dari ini pesanan dibatalkan otomatis. */
  pay_deadline?: string | null;
  received_at?: string | null;
  received_by?: string | null;
  cancel_requested_at?: string | null;
  cancel_request_reason?: string | null;
  cancel_reject_note?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  admin_note?: string | null;
  hidden_by_buyer?: boolean;
  items: OrderItemRecord[];
}

/**
 * The trimmed receipt a buyer gets from a code lookup or their history.
 *
 * Deliberately not an OrderRecord: `get_order_by_code` masks the name and
 * phone and omits the address entirely, so a leaked code cannot be turned
 * into someone's contact details.
 */
export interface PublicOrderReceipt {
  order_code: string;
  buyer_name: string;
  buyer_wa_masked: string;
  total_amount: number;
  item_count: number;
  amount_paid?: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  /** Boolean only — the tracker never receives the storage path. */
  has_payment_proof?: boolean;
  verified_at?: string | null;
  created_at: string;
  pay_deadline?: string | null;
  received_at?: string | null;
  cancel_requested_at?: string | null;
  cancel_request_reason?: string | null;
  cancel_reject_note?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  /** Server menentukan aksi yang boleh — klien tidak menebak. */
  can_request_cancel?: boolean;
  can_hide?: boolean;
  items: OrderItemRecord[];
}

/** What checkout sends. Note there is no price — the server sets that. */
export interface NewOrderLine {
  product_id: string;
  /** Set only when the product uses the new multi-attribute variant system. */
  variant_id: string | null;
  /** Free-text variant for the legacy single-axis system; ignored by the
   *  server when variant_id is set. */
  variant: string | null;
  qty: number;
}

export interface NewOrderInput {
  buyer_name: string;
  buyer_wa: string;
  buyer_nim?: string;
  buyer_prodi?: string;
  buyer_address: string;
  notes?: string;
  items: NewOrderLine[];
}

export interface CreateOrderResult {
  orderCode: string;
  /** False when the order only exists in this browser, not the database. */
  persisted: boolean;
  /**
   * True when the database actively refused the order — sold out, closed
   * pre-order, bad input, spam guard. The basket must be kept and nothing
   * sent to the cashier.
   */
  rejected: boolean;
  /** True when the refusal came from the anti-spam guard / an active ban. */
  blocked?: boolean;
  totalAmount?: number;
  itemCount?: number;
  error?: string;
}

/** Hasil aksi RPC yang mengembalikan `{ok}` atau `{error}`. */
export interface ActionResult {
  ok: boolean;
  error?: string;
  blocked?: boolean;
}

/** Seeded orders reshaped as baskets, for when Supabase is unconfigured. */
function demoRecords(): OrderRecord[] {
  return demoOrders.map((o) => ({
    id: o.id,
    order_code: o.order_code,
    buyer_name: o.buyer_name,
    buyer_wa: o.buyer_wa_number,
    buyer_nim: o.buyer_nim ?? null,
    buyer_prodi: o.buyer_prodi ?? null,
    buyer_address: "—",
    notes: null,
    total_amount: 0,
    item_count: o.qty,
    amount_paid: 0,
    payment_status: o.payment_status,
    order_status: o.order_status,
    payment_proof_url: o.payment_proof_url,
    verified_by: o.verified_by,
    verified_at: o.verified_at,
    created_at: o.created_at,
    pay_deadline: o.reserved_until,
    items: [
      {
        product_id: o.product_id,
        product_name: o.product_name,
        variant: o.variant,
        stock_type_snapshot: o.stock_type_snapshot,
        qty: o.qty,
        unit_price: 0,
        subtotal: 0,
      },
    ],
  }));
}

/** Fallback code for when the database is unreachable or unconfigured. */
function localOrderCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `ORD-${year}-LOCAL-${rand}`;
}

/** RPC yang mengembalikan `{ok:true}` / `{error, blocked?}` atau melempar galat. */
function toAction(data: unknown, error: { message: string } | null): ActionResult {
  if (error) return { ok: false, error: error.message };
  const d = (data ?? {}) as { ok?: boolean; error?: string; blocked?: boolean };
  if (d.error) return { ok: false, error: d.error, blocked: !!d.blocked };
  return { ok: true };
}

/**
 * Place an order.
 *
 * Everything goes through the `create_order` RPC: the browser sends product
 * ids, variants and quantities, and the database looks up the real price,
 * checks stock and the pre-order window, holds the stock, and allocates the
 * code. A tampered payload cannot set its own price or oversell.
 *
 * Refusals come back as `{error}` (not a thrown error) so the anti-spam
 * counter survives — a thrown error would roll it back.
 */
export async function createOrder(
  input: NewOrderInput
): Promise<CreateOrderResult> {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      orderCode: localOrderCode(),
      persisted: false,
      rejected: false,
      error: "Supabase belum dikonfigurasi.",
    };
  }

  try {
    const { data, error } = await supabase.rpc("create_order", {
      p_buyer_name: input.buyer_name,
      p_buyer_wa: input.buyer_wa,
      p_buyer_address: input.buyer_address,
      p_items: input.items.map((i) => ({
        product_id: i.product_id,
        variant: i.variant,
        variant_id: i.variant_id,
        qty: i.qty,
      })),
      p_buyer_nim: input.buyer_nim ?? null,
      p_buyer_prodi: input.buyer_prodi ?? null,
      p_notes: input.notes ?? null,
    });

    if (error) {
      return { orderCode: "", persisted: false, rejected: true, error: error.message };
    }

    const result = (data ?? {}) as {
      order_code?: string;
      total_amount?: number;
      item_count?: number;
      error?: string;
      blocked?: boolean;
    };

    if (result.error || !result.order_code) {
      return {
        orderCode: "",
        persisted: false,
        rejected: true,
        blocked: !!result.blocked,
        error: result.error ?? "Pesanan ditolak.",
      };
    }

    return {
      orderCode: result.order_code,
      persisted: true,
      rejected: false,
      totalAmount: result.total_amount,
      itemCount: result.item_count,
    };
  } catch (err) {
    return {
      orderCode: localOrderCode(),
      persisted: false,
      rejected: false,
      error: err instanceof Error ? err.message : "Kesalahan tak terduga.",
    };
  }
}

/**
 * Every order, newest first — staff only.
 *
 * RLS returns nothing unless the caller is signed in and has a `staff` row.
 * Falls back to demo rows only when Supabase is unconfigured; a failed query
 * returns an error instead of fake rows.
 */
export async function fetchOrders(): Promise<{
  orders: OrderRecord[];
  live: boolean;
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { orders: demoRecords(), live: false };

  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .order("created_at", { ascending: false });

  if (error) return { orders: [], live: false, error: error.message };
  return { orders: (data ?? []) as unknown as OrderRecord[], live: true };
}

/** Semua aksi pengurus atas satu pesanan. Aturan ditegakkan di database. */
export type AdminOrderAction =
  | "confirm_paid"
  | "confirm_dp"
  | "mark_unpaid"
  | "undo_confirm"
  | "received"
  | "unreceived"
  | "extend"
  | "cancel"
  | "approve_cancel"
  | "reject_cancel"
  | "note"
  | "delete";

export async function adminOrderAction(
  orderCode: string,
  action: AdminOrderAction,
  opts: { note?: string | null; amount?: number | null } = {}
): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };

  const { data, error } = await supabase.rpc("admin_order_action", {
    p_code: orderCode,
    p_action: action,
    p_note: opts.note ?? null,
    p_amount: opts.amount ?? null,
  });
  if (error) return { ok: false, error: error.message };

  const proof = (data as { proof?: string | null } | null)?.proof ?? null;
  if (action === "delete" && proof) await removeProof(proof);
  return { ok: true };
}

/** Hapus semua pesanan batal/kedaluwarsa. Mengembalikan jumlah yang dihapus. */
export async function purgeCancelledOrders(): Promise<ActionResult & { count?: number }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };

  const { data, error } = await supabase.rpc("admin_purge_cancelled_orders");
  if (error) return { ok: false, error: error.message };
  const d = (data ?? {}) as { count?: number; proofs?: string[] };
  for (const p of d.proofs ?? []) await removeProof(p);
  return { ok: true, count: d.count ?? 0 };
}

/** Best-effort: bukti bayar milik pesanan yang dihapus ikut dibersihkan. */
async function removeProof(storedPath: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  const path = storedPath.replace(/^payment-proofs\//, "");
  try {
    await supabase.storage.from("payment-proofs").remove([path]);
  } catch {
    // Biarkan: file yatim tidak merusak apa pun.
  }
}

/** Short-lived link so staff can view a receipt from the private bucket. */
export async function signedProofUrl(
  storedPath: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const path = storedPath.replace(/^payment-proofs\//, "");
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 300);

  return error ? null : (data?.signedUrl ?? null);
}

/**
 * The signed-in customer's own orders, newest first.
 *
 * Goes through the `list_my_orders` RPC, which filters by `auth.uid()` inside
 * the database, so a buyer only ever gets their own rows. Orders the buyer
 * removed from their history are left out.
 */
export async function fetchMyOrders(): Promise<PublicOrderReceipt[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("list_my_orders");
  if (error || !data) return [];
  return data as unknown as PublicOrderReceipt[];
}

/** Pembeli mengajukan pembatalan (pengurus yang memutuskan). */
export async function requestOrderCancel(code: string, reason: string): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase.rpc("request_order_cancel", {
    p_code: code,
    p_reason: reason || null,
    p_withdraw: false,
  });
  return toAction(data, error);
}

/** Pembeli menarik kembali pengajuan pembatalannya. */
export async function withdrawOrderCancel(code: string): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase.rpc("request_order_cancel", {
    p_code: code,
    p_reason: null,
    p_withdraw: true,
  });
  return toAction(data, error);
}

/** Pembeli menghapus pesanan batal dari riwayatnya (data pengurus tetap ada). */
export async function hideMyOrder(code: string): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase.rpc("hide_my_order", { p_code: code });
  return toAction(data, error);
}

export type OrderLookup =
  | { status: "found"; order: PublicOrderReceipt }
  | { status: "not_found" }
  | { status: "blocked"; error: string };

/** Look up one order by the code on the buyer's receipt. */
export async function fetchOrderByCode(code: string): Promise<OrderLookup> {
  const trimmed = code.trim().toUpperCase();
  const supabase = getSupabase();

  if (!supabase) {
    const demo = demoRecords().find((o) => o.order_code === trimmed);
    return demo
      ? {
          status: "found",
          order: {
            order_code: demo.order_code,
            buyer_name: demo.buyer_name,
            buyer_wa_masked: `•••• ${demo.buyer_wa.slice(-4)}`,
            total_amount: demo.total_amount,
            item_count: demo.item_count,
            payment_status: demo.payment_status,
            order_status: demo.order_status,
            verified_at: demo.verified_at,
            created_at: demo.created_at,
            items: demo.items,
          },
        }
      : { status: "not_found" };
  }

  const { data, error } = await supabase.rpc("get_order_by_code", { p_code: trimmed });
  if (error) return { status: "blocked", error: error.message };
  if (!data) return { status: "not_found" };
  const d = data as PublicOrderReceipt & { error?: string };
  if (d.error) return { status: "blocked", error: d.error };
  return { status: "found", order: d };
}

// ------------------------------------------------------------------ blokir

export interface BanRecord {
  id: string;
  label: string | null;
  kind: "akun" | "jaringan";
  email: string | null;
  reason: string;
  banned_until: string;
  created_at: string;
  created_by: string;
  lifted_at: string | null;
  lifted_by: string | null;
  active: boolean;
}

/** Daftar blokir anti-spam (admin saja). */
export async function fetchBans(): Promise<{ bans: BanRecord[]; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { bans: [], error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase.rpc("admin_list_bans");
  if (error) return { bans: [], error: error.message };
  return { bans: (data ?? []) as BanRecord[] };
}

export async function unban(id: string): Promise<ActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { error } = await supabase.rpc("admin_unban", { p_id: id });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ------------------------------------------------------------ format waktu

/** "24 Okt 2026, 14.05 WIB" — dipakai di riwayat & panel pesanan. */
export function formatOrderTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  );
}

/** Sisa waktu bayar, mis. "23 jam 10 menit". Null bila sudah lewat. */
export function payTimeLeft(deadline: string | null | undefined, now = Date.now()): string | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} menit`;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

export { isSupabaseConfigured };
