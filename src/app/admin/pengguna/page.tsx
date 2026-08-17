"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Shield,
  ShoppingCart,
  Trash2,
  UserPlus,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import DbStatus from "@/components/admin/DbStatus";

interface StaffRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "kasir";
  created_at: string;
}

interface PendingUser {
  email: string;
  created_at: string;
}

const roleConfig = {
  admin: {
    label: "Admin",
    color: "bg-red-100 text-red-700",
    icon: Shield,
    note: "Semua akses, termasuk mengelola pengurus",
  },
  kasir: {
    label: "Kasir",
    color: "bg-amber-100 text-amber-700",
    icon: ShoppingCart,
    note: "Pesanan, produk, dan konten",
  },
};

export default function AdminPenggunaPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<string>("");

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    setMe(session.session?.user.email ?? "");

    const { data: rows, error: readError } = await supabase
      .from("staff")
      .select("*")
      .order("created_at");

    if (!readError) {
      setStaff((rows ?? []) as StaffRow[]);
      setLive(true);
    }

    // Only admins may list accounts without access; a plain kasir simply
    // gets an error here, which is expected rather than a fault.
    const { data: waiting, error: pendErr } = await supabase.rpc(
      "list_pending_users"
    );
    if (!pendErr) {
      setIsAdmin(true);
      setPending((waiting ?? []) as PendingUser[]);
    } else {
      setIsAdmin(false);
    }

    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void reload();
  }, [reload]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const grant = async (email: string, role: "admin" | "kasir", name?: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(email);
    setError(null);
    const { error: rpcError } = await supabase.rpc("add_staff_by_email", {
      p_email: email,
      p_full_name: name ?? null,
      p_role: role,
    });
    if (rpcError) setError(rpcError.message);
    else await reload();
    setBusy(null);
  };

  const revoke = async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(email);
    setError(null);
    const { error: rpcError } = await supabase.rpc("remove_staff", {
      p_email: email,
    });
    if (rpcError) setError(rpcError.message);
    else await reload();
    setBusy(null);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengurus</h1>
          <p className="text-sm text-gray-500 mt-1">
            Siapa saja yang bisa masuk dashboard
          </p>
        </div>
        <DbStatus live={live} loading={loading} error={error} saving={!!busy} />
      </div>

      {/* Roles */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        {Object.entries(roleConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <cfg.icon className="w-4 h-4 text-gray-500" />
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">{cfg.note}</span>
          </div>
        ))}
      </div>

      {/* Current staff */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">
            Punya akses ({staff.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td className="px-5 py-10 text-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat…
                  </td>
                </tr>
              )}

              {!loading &&
                staff.map((s) => {
                  const cfg = roleConfig[s.role] ?? roleConfig.kasir;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          {s.full_name || s.email}
                          {s.email === me && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-400">
                              kamu
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${cfg.color}`}
                        >
                          <cfg.icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isAdmin && s.email !== me && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() =>
                                grant(
                                  s.email,
                                  s.role === "admin" ? "kasir" : "admin",
                                  s.full_name ?? undefined
                                )
                              }
                              disabled={busy === s.email}
                              className="text-xs text-emerald-600 hover:underline disabled:opacity-60"
                            >
                              Jadikan {s.role === "admin" ? "kasir" : "admin"}
                            </button>
                            <button
                              onClick={() => revoke(s.email)}
                              disabled={busy === s.email}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-60"
                              title="Cabut akses"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accounts waiting for access */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">
              Menunggu akses ({pending.length})
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Akun yang sudah dibuat di Supabase tapi belum jadi pengurus.
              Klik untuk memberi akses — tidak perlu SQL.
            </p>
          </div>

          {pending.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                Tidak ada akun yang menunggu.
              </p>
              <a
                href="https://supabase.com/dashboard/project/_/auth/users"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buat akun baru di Supabase
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pending.map((u) => (
                <div
                  key={u.email}
                  className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {u.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      Dibuat{" "}
                      {new Date(u.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => grant(u.email, "kasir")}
                      disabled={busy === u.email}
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {busy === u.email ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Jadikan kasir
                    </button>
                    <button
                      onClick={() => grant(u.email, "admin")}
                      disabled={busy === u.email}
                      className="text-xs text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-60"
                    >
                      atau admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isAdmin && !loading && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Hanya admin yang bisa menambah atau mencabut akses pengurus.
          </span>
        </div>
      )}
    </div>
  );
}
