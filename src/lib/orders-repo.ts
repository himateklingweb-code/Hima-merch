import { getSupabase, isSupabaseConfigured } from "./supabase";
import { orders as demoOrders } from "@/data/orders";
import type { PaymentStatus, OrderStatus } from "@/data/orders";

/** A line in a basket — one product/variant combination. */
export interface OrderItemRecord {
  product_id: string;
  product_name: string;
  product_slug?: string | null;
  variant: string | null;
  stock_type_snapshot: "ready_stock" | "pre_order";
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderRecord {
  id: string;
  order_code: string;
  buyer_name: string;
  buyer_wa: string;
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

export interface NewOrderInput {
  buyer_name: string;
  buyer_wa: string;
  buyer_nim?: string;
  buyer_prodi?: string;
  buyer_address: string;
  notes?: string;
  items: OrderItemRecord[];
}

/**
 * The seeded orders reshaped as baskets, so the dashboard and the order
 * tracker render identically whether or not Supabase is configured.
 */
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
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD-${year}-${rand}`;
}

export interface CreateOrderResult {
  orderCode: string;
  /** False when the order only exists in this browser, not the database. */
  persisted: boolean;
  error?: string;
}

/**
 * Write a basket to the database.
 *
 * A failure here must never cost the student their order: the checkout
 * still hands off to WhatsApp with a locally generated code, and the
 * result says the order was not persisted so the UI can say so plainly.
 */
export async function createOrder(
  input: NewOrderInput
): Promise<CreateOrderResult> {
  const supabase = getSupabase();
  const totalAmount = input.items.reduce((s, i) => s + i.subtotal, 0);
  const itemCount = input.items.reduce((s, i) => s + i.qty, 0);

  if (!supabase) {
    return {
      orderCode: localOrderCode(),
      persisted: false,
      error: "Supabase belum dikonfigurasi.",
    };
  }

  try {
    // Sequential code from the database; fall back if the RPC is missing.
    const { data: codeData, error: codeError } = await supabase.rpc(
      "next_order_code"
    );
    const orderCode =
      !codeError && codeData ? String(codeData) : localOrderCode();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_code: orderCode,
        buyer_name: input.buyer_name,
        buyer_wa: input.buyer_wa,
        buyer_nim: input.buyer_nim || null,
        buyer_prodi: input.buyer_prodi || null,
        buyer_address: input.buyer_address,
        notes: input.notes || null,
        total_amount: totalAmount,
        item_count: itemCount,
      })
      .select("id, order_code")
      .single();

    if (orderError || !order) {
      return {
        orderCode,
        persisted: false,
        error: orderError?.message ?? "Gagal menyimpan pesanan.",
      };
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.product_name,
        product_slug: i.product_slug ?? null,
        variant: i.variant,
        stock_type_snapshot: i.stock_type_snapshot,
        qty: i.qty,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      }))
    );

    if (itemsError) {
      return {
        orderCode: order.order_code,
        persisted: false,
        error: itemsError.message,
      };
    }

    return { orderCode: order.order_code, persisted: true };
  } catch (err) {
    return {
      orderCode: localOrderCode(),
      persisted: false,
      error: err instanceof Error ? err.message : "Kesalahan tak terduga.",
    };
  }
}

/** Every order, newest first. Falls back to the seeded demo rows. */
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

  if (error || !data) return { orders: demoRecords(), live: false };
  return { orders: data as unknown as OrderRecord[], live: true };
}

/** Look up one order by the code printed on the buyer's receipt. */
export async function fetchOrderByCode(
  code: string
): Promise<OrderRecord | null> {
  const trimmed = code.trim().toUpperCase();
  const supabase = getSupabase();

  if (!supabase) {
    return demoRecords().find((o) => o.order_code.toUpperCase() === trimmed) ?? null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("order_code", trimmed)
    .maybeSingle();

  if (error || !data) {
    return demoRecords().find((o) => o.order_code.toUpperCase() === trimmed) ?? null;
  }
  return data as unknown as OrderRecord;
}

export { isSupabaseConfigured };
