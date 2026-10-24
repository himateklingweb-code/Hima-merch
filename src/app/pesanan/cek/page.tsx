"use client";

import { useState } from "react";
import { Loader2, Package, Search, ShieldAlert, XCircle } from "lucide-react";
import BuyerOrderCard from "@/components/BuyerOrderCard";
import { fetchOrderByCode, type OrderLookup } from "@/lib/orders-repo";

export default function CekPesananPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<OrderLookup | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (value = code) => {
    if (!value.trim()) return;
    setLoading(true);
    setResult(await fetchOrderByCode(value));
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="mb-6 text-center sm:mb-10">
        <Package className="mx-auto mb-3 h-10 w-10 text-emerald-600 sm:h-12 sm:w-12" />
        <h1 className="text-xl font-bold text-gray-900 sm:text-3xl">Cek Status Pesanan</h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-base">Masukkan kode pesanan untuk melihat status.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="mb-4 flex gap-2 sm:mb-8 sm:gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:h-5 sm:w-5" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ORD-2026-0001-A1B2C3"
            aria-label="Kode pesanan"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 font-mono text-base outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:py-3 sm:pl-10 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors active:bg-emerald-700 disabled:opacity-60 sm:px-6"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cek"}
        </button>
      </form>

      <p className="mb-4 text-center text-xs text-gray-500 sm:mb-6">
        Kode pesanan muncul setelah checkout dan ada di pesan WhatsApp kamu. Masuk ke akun untuk melihat semua riwayat dan
        mengajukan pembatalan.
      </p>

      {result?.status === "not_found" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center sm:p-6">
          <XCircle className="mx-auto mb-1.5 h-6 w-6 text-red-400 sm:h-8 sm:w-8" />
          <p className="text-sm font-medium text-red-800">Pesanan tidak ditemukan</p>
          <p className="mt-0.5 text-xs text-red-700">Periksa kembali kode pesanan.</p>
        </div>
      )}

      {result?.status === "blocked" && (
        <div role="alert" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {result?.status === "found" && (
        <BuyerOrderCard
          order={result.order}
          onChanged={() => search(result.order.order_code)}
          onRemoved={() => setResult(null)}
        />
      )}
    </div>
  );
}
