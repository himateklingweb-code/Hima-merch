"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Search,
  Users,
  X,
} from "lucide-react";
import DbStatus from "@/components/admin/DbStatus";
import { getSupabase } from "@/lib/supabase";
import {
  ROLE_BADGE,
  ROLE_LABEL,
  ROLE_NOTE,
  STAFF_ROLES,
  type StaffRole,
} from "@/lib/roles";
import {
  fetchAllUsers,
  fetchDepartmentOptions,
  setUserAccess,
  type AdminUserRow,
  type DepartmentOption,
} from "@/lib/users-repo";
import { NAME_MAX, saveDisplayName } from "@/lib/profile-repo";
import { matchesQuery } from "@/lib/search";

type RoleFilter = "semua" | StaffRole | "anggota" | "tanpa_dept";

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "admin", label: "Admin" },
  { value: "kwu", label: "KWU" },
  { value: "kominfo", label: "Kominfo" },
  { value: "anggota", label: "Anggota" },
  { value: "tanpa_dept", label: "Belum ada departemen" },
];

const field =
  "rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60";

function shortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UserRow({
  user,
  isMe,
  departments,
  onSaved,
}: {
  user: AdminUserRow;
  isMe: boolean;
  departments: DepartmentOption[];
  onSaved: (msg: string | null, err: string | null) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user.display_name ?? "");
  const [role, setRole] = useState<StaffRole | "">(user.staff_role ?? "");
  const [dept, setDept] = useState(user.department_id ?? "");
  const [busy, setBusy] = useState(false);

  const dirty =
    (role || null) !== user.staff_role || (dept || null) !== user.department_id;

  const saveName = async () => {
    setBusy(true);
    const r = await saveDisplayName(name, user.id);
    setBusy(false);
    if (r.ok) {
      setEditingName(false);
      onSaved("Nama tersimpan.", null);
    } else onSaved(null, r.error ?? "Gagal menyimpan nama.");
  };

  const saveAccess = async () => {
    setBusy(true);
    const r = await setUserAccess(user.id, role || null, dept || null);
    setBusy(false);
    if (r.ok) onSaved("Akses tersimpan.", null);
    else onSaved(null, r.error ?? "Gagal menyimpan akses.");
  };

  const shownName = user.display_name || user.email.split("@")[0];

  return (
    <tr className="align-top hover:bg-gray-50/60">
      <td className="px-4 py-3">
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
              aria-label="Nama tampilan"
              className={`${field} w-full min-w-40`}
            />
            <button
              onClick={saveName}
              disabled={busy}
              className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50"
              aria-label="Simpan nama"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => {
                setName(user.display_name ?? "");
                setEditingName(false);
              }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              aria-label="Batal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900">{shownName}</span>
            {isMe && (
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                kamu
              </span>
            )}
            <button
              onClick={() => setEditingName(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label={`Ubah nama ${shownName}`}
              title="Ubah nama tampilan"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="mt-0.5 text-xs text-gray-500">{user.email}</div>
        {!user.display_name && (
          <div className="mt-0.5 text-[11px] text-amber-700">
            Belum punya nama tampilan
          </div>
        )}
      </td>

      <td className="px-4 py-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole | "")}
          disabled={busy || isMe}
          aria-label="Peran panel"
          title={isMe ? "Peran akun sendiri tidak bisa diubah" : undefined}
          className={`${field} w-full min-w-32`}
        >
          <option value="">Anggota (tanpa panel)</option>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          disabled={busy}
          aria-label="Departemen"
          className={`${field} w-full min-w-44`}
        >
          <option value="">— Belum ada —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
        <div>Daftar {shortDate(user.created_at)}</div>
        <div>Masuk {shortDate(user.last_sign_in_at)}</div>
      </td>

      <td className="px-4 py-3 text-right">
        <button
          onClick={saveAccess}
          disabled={!dirty || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Simpan
        </button>
      </td>
    </tr>
  );
}

export default function AdminPenggunaPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [me, setMe] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("semua");
  const [deptFilter, setDeptFilter] = useState("");
  // Naik tiap kali data dimuat ulang, supaya baris memakai nilai terbaru.
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const [{ data: session }, list, depts] = await Promise.all([
      supabase.auth.getSession(),
      fetchAllUsers(),
      fetchDepartmentOptions(),
    ]);
    setMe(session.session?.user.id ?? "");
    setDepartments(depts);
    if (list.error) {
      setError(list.error);
    } else {
      setUsers(list.users);
      setLive(true);
    }
    setVersion((v) => v + 1);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void reload();
  }, [reload]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const deptName = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  const counts = useMemo(() => {
    const c: Record<RoleFilter, number> = {
      semua: users.length,
      admin: 0,
      kwu: 0,
      kominfo: 0,
      anggota: 0,
      tanpa_dept: 0,
    };
    for (const u of users) {
      if (u.staff_role) c[u.staff_role]++;
      else c.anggota++;
      if (!u.department_id) c.tanpa_dept++;
    }
    return c;
  }, [users]);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (roleFilter === "anggota" && u.staff_role) return false;
        if (roleFilter === "tanpa_dept" && u.department_id) return false;
        if (
          roleFilter !== "semua" &&
          roleFilter !== "anggota" &&
          roleFilter !== "tanpa_dept" &&
          u.staff_role !== roleFilter
        )
          return false;
        if (deptFilter && u.department_id !== deptFilter) return false;
        return matchesQuery(
          query,
          u.display_name,
          u.email,
          u.department_id ? deptName[u.department_id] : "",
          u.staff_role ? ROLE_LABEL[u.staff_role] : "anggota"
        );
      }),
    [users, roleFilter, deptFilter, query, deptName]
  );

  const handleSaved = async (msg: string | null, err: string | null) => {
    setError(err);
    setNotice(msg);
    if (msg) await reload();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
          <p className="mt-1 text-sm text-gray-500">
            Atur nama tampilan, peran panel, dan departemen setiap akun.
          </p>
        </div>
        <DbStatus live={live} loading={loading} error={error} />
      </div>

      {/* Penjelasan peran */}
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STAFF_ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-gray-200 bg-white p-3">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE[r]}`}
            >
              {ROLE_LABEL[r]}
            </span>
            <p className="mt-1.5 text-xs text-gray-500">{ROLE_NOTE[r]}</p>
          </div>
        ))}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
            Anggota
          </span>
          <p className="mt-1.5 text-xs text-gray-500">
            Tanpa panel. Bisa absen bila sudah punya departemen.
          </p>
        </div>
      </div>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <Check className="h-4 w-4" />
          {notice}
        </div>
      )}

      {/* Pencarian & filter */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, departemen…"
            aria-label="Cari pengguna"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label="Filter departemen"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Semua departemen</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter peran">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            aria-pressed={roleFilter === f.value}
            onClick={() => setRoleFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === f.value
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}{" "}
            <span
              className={roleFilter === f.value ? "text-gray-300" : "text-gray-400"}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Nama tampilan</th>
                <th className="px-4 py-3">Peran panel</th>
                <th className="px-4 py-3">Departemen</th>
                <th className="px-4 py-3">Aktivitas</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Memuat…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      {users.length === 0
                        ? "Belum ada akun."
                        : "Tidak ada akun yang cocok dengan filter."}
                    </p>
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((u) => (
                  <UserRow
                    key={`${u.id}-${version}`}
                    user={u}
                    isMe={u.id === me}
                    departments={departments}
                    onSaved={handleSaved}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Akun baru muncul di sini setelah orangnya mendaftar di halaman{" "}
          <strong>/masuk</strong>. Anggota baru wajib diberi departemen agar
          bisa absen. Peran akunmu sendiri dikunci supaya panel tidak kehilangan
          admin.
        </span>
      </div>
    </div>
  );
}
