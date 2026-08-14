"use client";

import { useState } from "react";
import { orders } from "@/data/orders";
import { Search, Package, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const statusConfig = {
  pending_verifikasi: { label: "Menunggu Verifikasi", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  terjual: { label: "Dikonfirmasi", color: "bg-green-100 text-green-800", icon: CheckCircle },
  dibatalkan: { label: "Dibatalkan", color: "bg-red-100 text-red-800", icon: XCircle },
  kadaluarsa: { label: "Kadaluarsa", color: "bg-gray-100 text-gray-600", icon: AlertCircle },
};

const paymentConfig = {
  belum_lunas: { label: "Belum Lunas", color: "bg-red-100 text-red-800" },
  dp: { label: "DP", color: "bg-amber-100 text-amber-800" },
  lunas: { label: "Lunas", color: "bg-green-100 text-green-800" },
};

export default function CekPesananPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<(typeof orders)[0] | null | "not_found">(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = orders.find(
      (o) => o.order_code.toLowerCase() === code.trim().toLowerCase()
    );
    setResult(found ?? "not_found");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <div className="text-center mb-6 sm:mb-10">
        <Package className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600 mx-auto mb-3" />
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Cek Status Pesanan</h1>
        <p className="text-gray-500 mt-1 text-xs sm:text-base">
          Masukkan kode pesanan untuk melihat status.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3 mb-4 sm:mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ORD-2026-XXXX"
            className="w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-emerald-600 text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm active:bg-emerald-700 transition-colors"
        >
          Cek
        </button>
      </form>

      <div className="text-center text-[10px] sm:text-xs text-gray-400 mb-4 sm:mb-6 flex flex-wrap justify-center gap-1">
        <span>Demo:</span>
        {["ORD-2026-0001", "ORD-2026-0003", "ORD-2026-0004"].map((c) => (
          <button key={c} onClick={() => setCode(c)} className="text-emerald-600 underline">
            {c}
          </button>
        ))}
      </div>

      {result === "not_found" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 text-center">
          <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 mx-auto mb-1.5" />
          <p className="font-medium text-red-800 text-sm">Pesanan tidak ditemukan</p>
          <p className="text-xs text-red-600 mt-0.5">Periksa kembali kode pesanan.</p>
        </div>
      )}

      {result && result !== "not_found" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] sm:text-xs text-gray-400">Kode Pesanan</div>
                <div className="font-bold text-gray-900 text-sm sm:text-lg font-mono">{result.order_code}</div>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full ${statusConfig[result.order_status].color}`}>
                {(() => {
                  const Icon = statusConfig[result.order_status].icon;
                  return <Icon className="w-3 h-3 sm:w-4 sm:h-4" />;
                })()}
                {statusConfig[result.order_status].label}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { label: "Produk", value: result.product_name },
                { label: "Tipe", value: result.stock_type_snapshot === "ready_stock" ? "Ready Stock" : "Pre-Order" },
                ...(result.variant ? [{ label: "Varian", value: result.variant }] : []),
                { label: "Jumlah", value: `${result.qty} pcs` },
                {
                  label: "Status Bayar",
                  value: paymentConfig[result.payment_status].label,
                  badge: paymentConfig[result.payment_status].color,
                },
                {
                  label: "Tanggal",
                  value: new Date(result.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[10px] sm:text-xs text-gray-400">{item.label}</div>
                  {"badge" in item && item.badge ? (
                    <span className={`inline-flex text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 ${item.badge}`}>
                      {item.value}
                    </span>
                  ) : (
                    <div className="font-medium text-gray-900 text-xs sm:text-sm mt-0.5">{item.value}</div>
                  )}
                </div>
              ))}
            </div>

            {result.verified_at && (
              <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
                Diverifikasi oleh {result.verified_by} pada{" "}
                {new Date(result.verified_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            )}

            {result.order_status === "pending_verifikasi" && (
              <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-800">
                <p className="font-medium">Menunggu verifikasi kasir.</p>
                <p className="mt-0.5 text-yellow-600">
                  Reservasi hingga{" "}
                  {new Date(result.reserved_until).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}

            {result.order_status === "kadaluarsa" && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                Pesanan kadaluarsa — tidak diverifikasi dalam 60 menit. Silakan pesan ulang.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
