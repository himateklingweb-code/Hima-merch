"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, AlertTriangle, Lock } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthContext";
import { formatPrice } from "@/data/products";
import { createOrder } from "@/lib/orders-repo";
import type { PlacedOrder } from "./OrderConfirmation";

/**
 * Cashier's WhatsApp — set NEXT_PUBLIC_WA_KASIR in .env.local. Stripped to
 * digits here so a value written with +, spaces or dashes still yields a
 * valid wa.me link.
 */
const WA_NUMBER = (process.env.NEXT_PUBLIC_WA_KASIR || "6281234567890").replace(
  /\D/g,
  ""
);

/** Inline Google "G" so the sign-in button needs no external asset. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

interface FormState {
  name: string;
  wa: string;
  nim: string;
  prodi: string;
  address: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "",
  wa: "",
  nim: "",
  prodi: "",
  address: "",
  notes: "",
};

/** Indonesian mobile numbers, tolerant of 08…, +62…, spaces and dashes. */
function normaliseWa(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  else if (!n.startsWith("62")) n = `62${n}`;
  return n.length >= 10 && n.length <= 15 ? n : null;
}

export default function CheckoutForm({
  onPlaced,
}: {
  /** Hands the finished order up to the page, which renders the receipt. */
  onPlaced: (order: PlacedOrder) => void;
}) {
  const { lines, itemCount, total, clear } = useCart();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  /** Server-side refusal, e.g. the last one sold while they were typing. */
  const [rejection, setRejection] = useState<string | null>(null);

  // Prefill the name from the signed-in account (never the email — this is a
  // name field), but leave it editable and don't clobber what they've typed.
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    const accountName =
      (meta.full_name as string) || (meta.name as string) || "";
    if (accountName) {
      setForm((p) => (p.name ? p : { ...p, name: accountName }));
    }
  }, [user]);

  const set = (key: keyof FormState, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Nama wajib diisi.";
    if (!form.wa.trim()) next.wa = "Nomor WhatsApp wajib diisi.";
    else if (!normaliseWa(form.wa))
      next.wa = "Nomor WhatsApp tidak valid. Contoh: 081234567890";
    if (!form.address.trim())
      next.address = "Alamat pengiriman wajib diisi.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** The message the cashier receives — mirrors the old per-product one. */
  const buildWaMessage = (orderCode: string) => {
    const itemLines = lines
      .map(
        (l, i) =>
          `${i + 1}. ${l.product_name}` +
          (l.variant ? ` (${l.variant})` : "") +
          `\n   ${l.qty} x ${formatPrice(l.unit_price)} = ${formatPrice(
            l.qty * l.unit_price
          )}` +
          `\n   ${l.stock_type === "pre_order" ? "Pre-Order" : "Ready Stock"}`
      )
      .join("\n");

    return encodeURIComponent(
      `Halo kasir HMTL, saya ingin memesan merchandise.\n\n` +
        `Kode Pesanan: ${orderCode}\n\n` +
        `— PESANAN —\n${itemLines}\n\n` +
        `Total: ${formatPrice(total)} (${itemCount} item)\n\n` +
        `— DATA PEMESAN —\n` +
        `Nama: ${form.name}\n` +
        `WhatsApp: ${form.wa}\n` +
        (form.nim ? `NIM: ${form.nim}\n` : "") +
        (form.prodi ? `Prodi: ${form.prodi}\n` : "") +
        `Alamat: ${form.address}\n` +
        (form.notes ? `Catatan: ${form.notes}\n` : "") +
        `\nMohon konfirmasi pembayarannya. Terima kasih!`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || lines.length === 0) return;

    setRejection(null);
    setSubmitting(true);
    const wa = normaliseWa(form.wa)!;

    const res = await createOrder({
      buyer_name: form.name.trim(),
      buyer_wa: wa,
      buyer_nim: form.nim.trim() || undefined,
      buyer_prodi: form.prodi.trim() || undefined,
      buyer_address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      // Ids and quantities only. The database looks up the real price and
      // checks stock, so nothing here is worth tampering with.
      items: lines.map((l) => ({
        product_id: l.product_id,
        variant: l.variant,
        qty: l.qty,
      })),
    });

    setSubmitting(false);

    // The database refused it — sold out, pre-order closed, bad input.
    // Keep the basket, show why, and send nothing to the cashier.
    if (res.rejected) {
      setRejection(res.error ?? "Pesanan tidak dapat diproses.");
      return;
    }

    const waUrl = `https://wa.me/${WA_NUMBER}?text=${buildWaMessage(
      res.orderCode
    )}`;

    onPlaced({ ...res, waUrl });

    // Hand off to WhatsApp. Popup blockers can stop this, so the receipt
    // the page now shows always keeps a link the user can click.
    window.open(waUrl, "_blank", "noopener,noreferrer");
    clear();
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    const { error } = await signInWithGoogle("/keranjang");
    // On success the browser navigates to Google; only reach here on failure.
    if (error) {
      setRejection(error);
      setGoogleBusy(false);
    }
  };

  // ---------- sign-in gate ----------
  // Ordering requires an account so every receipt binds to a buyer and shows
  // up in their dashboard. The database enforces this too; this is the UI.
  if (authLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-10">
        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-emerald-600" />
          <h2 className="font-bold text-gray-900">Masuk untuk memesan</h2>
        </div>
        <p className="mb-5 text-sm text-gray-500">
          Masuk dulu supaya pesananmu tersimpan di akun dan bisa kamu lacak
          kapan saja. Keranjangmu tetap tersimpan.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleBusy}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          {googleBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleMark />
          )}
          Lanjutkan dengan Google
        </button>

        <Link
          href="/masuk?redirect=/keranjang"
          className="mt-3 flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Masuk / daftar dengan email
        </Link>

        {rejection && (
          <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{rejection}</span>
          </div>
        )}
      </div>
    );
  }

  // ---------- form ----------
  const field =
    "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-200";
  const ok = "border-gray-200 focus:border-emerald-500";
  const bad = "border-red-300 focus:border-red-500 focus:ring-red-100";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
    >
      <h2 className="mb-1 font-bold text-gray-900">Data Pemesan</h2>
      <p className="mb-5 text-xs text-gray-500">
        Dipakai kasir untuk konfirmasi dan pengiriman.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nama sesuai KTM"
            className={`${field} ${errors.name ? bad : ok}`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nomor WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            value={form.wa}
            onChange={(e) => set("wa", e.target.value)}
            inputMode="tel"
            placeholder="081234567890"
            className={`${field} ${errors.wa ? bad : ok}`}
          />
          {errors.wa && (
            <p className="mt-1 text-xs text-red-600">{errors.wa}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              NIM
            </label>
            <input
              value={form.nim}
              onChange={(e) => set("nim", e.target.value)}
              placeholder="Opsional"
              className={`${field} ${ok}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Prodi
            </label>
            <input
              value={form.prodi}
              onChange={(e) => set("prodi", e.target.value)}
              placeholder="Opsional"
              className={`${field} ${ok}`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Alamat Pengiriman <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            rows={3}
            placeholder="Alamat lengkap, atau tulis 'Ambil di sekretariat'"
            className={`${field} resize-none ${errors.address ? bad : ok}`}
          />
          {errors.address && (
            <p className="mt-1 text-xs text-red-600">{errors.address}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Catatan
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Opsional — permintaan khusus, patungan, dll."
            className={`${field} resize-none ${ok}`}
          />
        </div>
      </div>

      {rejection && (
        <div className="mt-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {rejection}
            <br />
            <span className="text-red-600">
              Keranjangmu masih tersimpan — sesuaikan jumlah lalu coba lagi.
            </span>
          </span>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-500">Total</span>
        <span className="text-lg font-bold text-gray-900">
          {formatPrice(total)}
        </span>
      </div>

      <button
        type="submit"
        disabled={submitting || lines.length === 0}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Memproses…
          </>
        ) : (
          <>
            <MessageCircle className="h-4 w-4" />
            Buat pesanan &amp; kirim ke WhatsApp
          </>
        )}
      </button>
    </form>
  );
}
