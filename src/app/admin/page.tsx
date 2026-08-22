"use client";

import { useEffect, useState } from "react";
import { formatPrice, type Product } from "@/data/products";
import type { Article } from "@/data/news";
import { fetchOrders, type OrderRecord } from "@/lib/orders-repo";
import { getProducts, getArticles } from "@/lib/content-repo";
import {
  ShoppingCart,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  Database,
  Loader2,
} from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Orders are staff-only under RLS, so they can only be read here with the
  // signed-in staff session — hence this reads live from the browser client
  // rather than at build time.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchOrders(), getProducts(), getArticles()]).then(
      ([o, p, a]) => {
        if (cancelled) return;
        setOrders(o.orders);
        setLive(o.live);
        setProducts(p);
        setArticles(a);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingOrders = orders.filter(
    (o) => o.order_status === "pending_verifikasi"
  );
  const verifiedOrders = orders.filter((o) => o.order_status === "terjual");
  const expiredOrders = orders.filter((o) => o.order_status === "kadaluarsa");
  const totalRevenue = verifiedOrders.reduce(
    (sum, o) => sum + (o.total_amount || 0),
    0
  );

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan data terbaru HMTL UNTAN
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
            live ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
          title={
            live
              ? "Terhubung ke Supabase"
              : "Supabase belum dikonfigurasi — menampilkan data contoh"
          }
        >
          <Database className="w-3.5 h-3.5" />
          {loading ? "Memuat…" : live ? "Data live" : "Data contoh"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Total Pesanan</span>
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {orders.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {pendingOrders.length} menunggu verifikasi
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Pendapatan</span>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(totalRevenue)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                dari {verifiedOrders.length} pesanan terjual
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Produk Aktif</span>
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {products.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {products.filter((p) => p.stock_type === "pre_order").length}{" "}
                pre-order aktif
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Kadaluarsa</span>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {expiredOrders.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                pesanan auto-expired
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Pesanan Terbaru</h2>
                <a
                  href="/admin/pesanan"
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Lihat semua
                </a>
              </div>
              <div className="divide-y divide-gray-100">
                {orders.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    Belum ada pesanan.
                  </div>
                )}
                {orders.slice(0, 5).map((order) => {
                  const items = order.items ?? [];
                  const productName =
                    items.map((i) => i.product_name).join(", ") || "—";
                  const qty =
                    order.item_count ||
                    items.reduce((s, i) => s + i.qty, 0);
                  return (
                    <div
                      key={order.id}
                      className="px-5 py-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {order.order_code}
                          </span>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              order.order_status === "terjual"
                                ? "bg-green-100 text-green-700"
                                : order.order_status === "pending_verifikasi"
                                ? "bg-yellow-100 text-yellow-700"
                                : order.order_status === "kadaluarsa"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {order.order_status === "pending_verifikasi"
                              ? "Pending"
                              : order.order_status === "terjual"
                              ? "Terjual"
                              : order.order_status === "kadaluarsa"
                              ? "Expired"
                              : "Batal"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">
                          {order.buyer_name} — {productName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-700">
                          {qty} pcs
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short" }
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pre-Order Recap */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Rekap Pre-Order</h2>
              </div>
              <div className="p-5 space-y-4">
                {products.filter((p) => p.stock_type === "pre_order").length ===
                  0 && (
                  <div className="text-sm text-gray-400">
                    Tidak ada produk pre-order aktif.
                  </div>
                )}
                {products
                  .filter((p) => p.stock_type === "pre_order")
                  .map((product) => {
                    const filled =
                      (product.po_filled ?? 0) + (product.po_reserved ?? 0);
                    const quota = product.po_quota ?? 1;
                    const pct = Math.round((filled / quota) * 100);
                    return (
                      <div key={product.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-900">
                            {product.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {filled}/{quota} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 90
                                ? "bg-red-500"
                                : pct >= 50
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        {product.po_deadline && (
                          <div className="text-xs text-gray-400 mt-1">
                            Deadline:{" "}
                            {new Date(product.po_deadline).toLocaleDateString(
                              "id-ID",
                              { day: "numeric", month: "long", year: "numeric" }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Aksi Cepat</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                <a
                  href="/admin/pesanan"
                  className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors text-sm font-medium"
                >
                  <Clock className="w-4 h-4" />
                  Verifikasi Order ({pendingOrders.length})
                </a>
                <a
                  href="/admin/produk"
                  className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-medium"
                >
                  <Package className="w-4 h-4" />
                  Kelola Produk
                </a>
                <a
                  href="/admin/berita"
                  className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <TrendingUp className="w-4 h-4" />
                  Tulis Berita
                </a>
                <a
                  href="/admin/pengguna"
                  className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Kelola User
                </a>
              </div>
            </div>

            {/* Recent News */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Berita Terbaru</h2>
                <a
                  href="/admin/berita"
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Kelola
                </a>
              </div>
              <div className="divide-y divide-gray-100">
                {articles.slice(0, 4).map((article) => (
                  <div
                    key={article.id}
                    className="px-5 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {article.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {article.category} ·{" "}
                        {new Date(article.published_at).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
