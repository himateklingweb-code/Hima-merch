export type PaymentStatus = "belum_lunas" | "dp" | "lunas";
export type OrderStatus = "pending_verifikasi" | "terjual" | "dibatalkan" | "kadaluarsa";

export interface Order {
  id: string;
  order_code: string;
  product_id: string;
  product_name: string;
  variant: string | null;
  stock_type_snapshot: "ready_stock" | "pre_order";
  qty: number;
  buyer_name: string;
  buyer_wa_number: string;
  buyer_nim?: string;
  buyer_prodi?: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  reserved_until: string;
  payment_proof_url: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export const orders: Order[] = [
  {
    id: "ord-1",
    order_code: "ORD-2026-0001",
    product_id: "prod-1",
    product_name: "Kaos HMTL UNTAN 2025",
    variant: "L",
    stock_type_snapshot: "ready_stock",
    qty: 2,
    buyer_name: "Andi Pratama",
    buyer_wa_number: "6281234567890",
    buyer_nim: "H1051211001",
    buyer_prodi: "Teknik Lingkungan",
    payment_status: "lunas",
    order_status: "terjual",
    reserved_until: "2026-08-14T10:00:00",
    payment_proof_url: "/placeholder-proof.png",
    verified_by: "Kasir Demo",
    verified_at: "2026-08-14T09:30:00",
    created_at: "2026-08-14T09:00:00",
  },
  {
    id: "ord-2",
    order_code: "ORD-2026-0002",
    product_id: "prod-2",
    product_name: "Jaket Almamater TL",
    variant: "M",
    stock_type_snapshot: "pre_order",
    qty: 1,
    buyer_name: "Bella Safira",
    buyer_wa_number: "6289876543210",
    buyer_nim: "H1051211002",
    buyer_prodi: "Teknik Lingkungan",
    payment_status: "dp",
    order_status: "terjual",
    reserved_until: "2026-08-13T15:00:00",
    payment_proof_url: null,
    verified_by: "Kasir Demo",
    verified_at: "2026-08-13T14:45:00",
    created_at: "2026-08-13T14:00:00",
  },
  {
    id: "ord-3",
    order_code: "ORD-2026-0003",
    product_id: "prod-1",
    product_name: "Kaos HMTL UNTAN 2025",
    variant: "XL",
    stock_type_snapshot: "ready_stock",
    qty: 1,
    buyer_name: "Charlie Wijaya",
    buyer_wa_number: "6281122334455",
    payment_status: "belum_lunas",
    order_status: "pending_verifikasi",
    reserved_until: "2026-08-14T21:00:00",
    payment_proof_url: null,
    verified_by: null,
    verified_at: null,
    created_at: "2026-08-14T20:00:00",
  },
  {
    id: "ord-4",
    order_code: "ORD-2026-0004",
    product_id: "prod-4",
    product_name: "Sticker Pack Enviro",
    variant: null,
    stock_type_snapshot: "ready_stock",
    qty: 3,
    buyer_name: "Diana Putri",
    buyer_wa_number: "6285566778899",
    payment_status: "belum_lunas",
    order_status: "kadaluarsa",
    reserved_until: "2026-08-12T10:00:00",
    payment_proof_url: null,
    verified_by: null,
    verified_at: null,
    created_at: "2026-08-12T09:00:00",
  },
  {
    id: "ord-5",
    order_code: "ORD-2026-0005",
    product_id: "prod-5",
    product_name: "Hoodie Green Engineering",
    variant: "L",
    stock_type_snapshot: "pre_order",
    qty: 1,
    buyer_name: "Evan Saputra",
    buyer_wa_number: "6281199887766",
    buyer_nim: "H1051211005",
    buyer_prodi: "Teknik Lingkungan",
    payment_status: "lunas",
    order_status: "terjual",
    reserved_until: "2026-08-10T12:00:00",
    payment_proof_url: "/placeholder-proof.png",
    verified_by: "Kasir Demo",
    verified_at: "2026-08-10T11:30:00",
    created_at: "2026-08-10T11:00:00",
  },
];
