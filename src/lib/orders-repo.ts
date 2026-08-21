import { getSupabase, isSupabaseConfigured } from "./supabase";
import { orders as demoOrders } from "@/data/orders";
import type { PaymentStatus, OrderStatus } from "@/data/orders";

/** A line in a basket — one product/variant combination. */
export interface OrderItemRecord {
  product_id?: string;
  product_name: string;
  product_slug?: string | null;
  variant: string | null;
  stock_type_snapshot: "ready_stock" | "pre_order";
  qty: number;
  unit_price: number;
  subtotal: number;
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
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  payment_proof_url?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  items: OrderItemRecord[];
}

/**
 * The trimmed receipt a buyer gets from a code lookup.
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
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  /** Boolean only — the tracker never receives the storage path. */
  has_payment_proof?: boolean;
  verified_at?: string | null;
  created_at: string;
  items: OrderItemRecord[];
}

/** What checkout sends. Note there is no price — the server sets that. */
export interface NewOrderLine {
  product_id: string;
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
   * pre-order, bad input. The basket must be kept and nothing sent to the
   * cashier. Distinct from `persisted: false`, which also covers "no
   * database configured", where carrying on is the right call.
   */
  rejected: boolean;
  totalAmount?: number;
  itemCount?: number;
  error?: string;
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
    payment_status: o.payment_status,
    order_status: o.order_status,
    payment_proof_url: o.payment_proof_url,
    verified_by: o.verified_by,
    verified_at: o.verified_at,
    created_at: o.created_at,
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

/**
 * Place an order.
 *
 * Everything goes through the `create_order` RPC: the browser sends product
 * ids, variants and quantities, and the database looks up the real price,
 * checks stock and the pre-order window, holds the stock, and allocates the
 * code. A tampered payload cannot set its own price or oversell.
 *
 * A failure here must never cost the student their order — checkout still
 * hands off to WhatsApp with a locally generated code, and `persisted`
 * tells the UI to say so plainly.
 */
export async function createOrder(
  input: NewOrderInput
): Promise<CreateOrderResult> {
  const supabase = getSupabase();

  if (!supabase) {
    // No database wired up: let the order through on a local code rather
    // than blocking a student who did nothing wrong.
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
        qty: i.qty,
      })),
      p_buyer_nim: input.buyer_nim ?? null,
      p_buyer_prodi: input.buyer_prodi ?? null,
      p_notes: input.notes ?? null,
    });

    if (error) {
      // The database said no — sold out, closed pre-order, bad input. It
      // raises these with readable Indonesian messages, so they are safe
      // and useful to show the buyer directly.
      return {
        orderCode: "",
        persisted: false,
        rejected: true,
        error: error.message,
      };
    }

    const result = data as {
      order_code: string;
      total_amount: number;
      item_count: number;
    };

    return {
      orderCode: result.order_code,
      persisted: true,
      rejected: false,
      totalAmount: result.total_amount,
      itemCount: result.item_count,
    };
  } catch (err) {
    // Network or transport failure rather than a refusal — treat it like a
    // missing database and let the WhatsApp handoff still happen.
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
 * RLS returns nothing unless the caller is signed in and has a `staff` row,
 * so an unauthenticated visitor simply gets an empty list rather than an
 * error. Falls back to demo rows when Supabase is unconfigured.
 */
export async function fetchOrders(): Promise<{
  orders: OrderRecord[];
  live: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase) return { orders: demoRecords(), live: false };

  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .order("created_at", { ascending: false });

  if (error) return { orders: demoRecords(), live: false };
  return { orders: (data ?? []) as unknown as OrderRecord[], live: true };
}

/**
 * Change an order's status — what the Verifikasi button calls.
 *
 * The database does the stock movement: confirming a sale takes the
 * quantity out of stock, cancelling puts it back. Staff-only, enforced
 * inside the RPC rather than trusted from here.
 */
export async function setOrderStatus(
  orderCode: string,
  next: { orderStatus?: OrderStatus; paymentStatus?: PaymentStatus }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };

  const { error } = await supabase.rpc("set_order_status", {
    p_order_code: orderCode,
    p_order_status: next.orderStatus ?? null,
    p_payment_status: next.paymentStatus ?? null,
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Attach a transfer receipt to an order.
 *
 * Uploads to a private bucket, then records the path through an RPC keyed
 * on the order code. The buyer is not signed in, so the code — which
 * carries a random suffix — is what authorises the write.
 */
export async function uploadPaymentProof(
  orderCode: string,
  file: File
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${orderCode}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (upErr) return { ok: false, error: upErr.message };

  const { error: rpcErr } = await supabase.rpc("attach_payment_proof", {
    p_code: orderCode,
    p_url: `payment-proofs/${path}`,
  });

  return rpcErr ? { ok: false, error: rpcErr.message } : { ok: true };
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
 * the database, so a buyer only ever gets their own rows and the order tables
 * stay closed to them otherwise. Returns an empty list when signed out or
 * when Supabase is unconfigured.
 */
export async function fetchMyOrders(): Promise<PublicOrderReceipt[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("list_my_orders");
  if (error || !data) return [];
  return data as unknown as PublicOrderReceipt[];
}

/** Look up one order by the code on the buyer's receipt. */
export async function fetchOrderByCode(
  code: string
): Promise<PublicOrderReceipt | null> {
  const trimmed = code.trim().toUpperCase();
  const supabase = getSupabase();

  if (!supabase) {
    const demo = demoRecords().find((o) => o.order_code === trimmed);
    return demo
      ? {
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
        }
      : null;
  }

  const { data, error } = await supabase.rpc("get_order_by_code", {
    p_code: trimmed,
  });

  if (error || !data) return null;
  return data as unknown as PublicOrderReceipt;
}

export { isSupabaseConfigured };
