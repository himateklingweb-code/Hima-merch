"use client";

import { useState } from "react";
import { orders, OrderStatus } from "@/data/orders";
import { products, formatPrice } from "@/data/products";
import { CheckCircle, Clock, XCircle, AlertCircle, MessageCircle, Filter } from "lucide-react";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending_verifikasi: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  terjual: { label: "Terjual", color: "bg-green-100 text-green-700", icon: CheckCircle },
  dibatalkan: { label: "Batal", color: "bg-red-100 text-red-700", icon: XCircle },
  kadaluarsa: { label: "Expired", color: "bg-gray-100 text-gray-500", icon: AlertCircle },
};

export default function AdminPesananPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const filtered =
    statusFilter === "all" ? orders : orders.filter((o) => o.order_status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesanan</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola dan verifikasi pesanan masuk</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {(["all", "pending_verifikasi", "terjual", "kadaluarsa", "dibatalkan"] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                statusFilter === status
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status === "all"
                ? `Semua (${orders.length})`
                : `${statusConfig[status].label} (${orders.filter((o) => o.order_status === status).length})`}
            </button>
          )
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kode</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Pembeli</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Produk</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Qty</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Total</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Bayar</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => {
                const product = products.find((p) => p.id === order.product_id);
                const total = (product?.price ?? 0) * order.qty;
                const Status = statusConfig[order.order_status];

                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-medium text-gray-900">{order.order_code}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{order.buyer_name}</div>
                      <div className="text-xs text-gray-400">{order.buyer_wa_number}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-gray-700">{order.product_name}</div>
                      {order.variant && (
                        <span className="text-xs text-gray-400">Varian: {order.variant}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{order.qty}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{formatPrice(total)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          order.payment_status === "lunas"
                            ? "bg-green-100 text-green-700"
                            : order.payment_status === "dp"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {order.payment_status === "lunas" ? "Lunas" : order.payment_status === "dp" ? "DP" : "Belum"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${Status.color}`}>
                        {Status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {order.order_status === "pending_verifikasi" && (
                          <button className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verifikasi
                          </button>
                        )}
                        <a
                          href={`https://wa.me/${order.buyer_wa_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-green-600 transition-colors"
                          title="Chat WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
