"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  KeyRound,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import DbStatus from "@/components/admin/DbStatus";
import { getSupabase } from "@/lib/supabase";
import {
  KIND_BADGE,
  KIND_LABEL,
  SECTIONS,
  SECTION_LABEL,
  accountKind,
  type AccountKind,
  type Section,
  type StaffRole,
} from "@/lib/roles";
import {
  fetchAllUsers,
  fetchDepartmentAccess,
  fetchDepartmentOptions,
  setDepartmentAccess,
  setUserAccess,
  type AdminUserRow,
  type DepartmentOption,
} from "@/lib/users-repo";
import {
  NAME_MAX,
  NAME_MIN,
  PROFILE_CHANGED,
  cleanName,
  saveDisplayName,
} from "@/lib/profile-repo";
import { matchesQuery } from "@/lib/search";

type KindFilter = "semua" | "panel" | "anggota" | "pengunjung";

const KIND_FILTERS: { value: KindFilter; label: string; hint: string }[] = [
  { value: "semua", label: "Semua", hint: "Semua akun" },
  { value: "panel", label: "Akses panel", hint: "Admin & pengurus" },
  { value: "anggota", label: "Hanya anggota", hint: "Punya departemen, tanpa akses panel" },
  { value: "pengunjung", label: "Pengunjung", hint: "Tanpa departemen & panel" },
];

function inFilter(kind: AccountKind, f: KindFilter) {
  if (f === "semua") return true;
  if (f === "panel") return kind === "admin" || kind === "pengurus";
  return kind === f;
}

const field =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:text-gray-500";

function shortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function nameOf(u: AdminUserRow) {
  return u.display_name || u.email.split("@")[0];
}

// ------------------------------------------------------------ dialog ubah

type Access = "" | StaffRole;

function EditUserDialog({
  user,
  isMe,
  departments,
  access,
  onClose,
  onSaved,
}: {
  user: AdminUserRow;
  isMe: boolean;
  departments: DepartmentOption[];
  access: Record<string, Section[]>;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [name, setName] = useState(user.display_name ?? "");
  const [dept, setDept] = useState(user.department_id ?? "");
  const [role, setRole] = useState<Access>(user.staff_role ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const nameChanged = cleanName(name) !== (user.display_name ?? "");
  const accessChanged =
    (role || null) !== user.staff_role || (dept || null) !== user.department_id;
  const dirty = nameChanged || accessChanged;

  // Esc menutup dialog kecuali sedang menyimpan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  const kind = accountKind(role || null, dept || null);
  const deptSections = dept ? access[dept] ?? [] : [];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return onClose();
    setError(null);

    if (nameChanged) {
      const n = cleanName(name);
      if (n.length < NAME_MIN || n.length > NAME_MAX) {
        return setError(`Nama tampilan harus ${NAME_MIN}–${NAME_MAX} karakter.`);
      }
    }
    if (role === "pengurus" && !dept) {
      return setError("Pengurus wajib punya departemen, karena menunya mengikuti izin departemen.");
    }

    setBusy(true);
    try {
      if (nameChanged) {
        const r = await saveDisplayName(name, user.id);
        if (!r.ok) throw new Error(r.error ?? "Gagal menyimpan nama.");
      }
      if (accessChanged) {
        const r = await setUserAccess(user.id, role || null, dept || null);
        if (!r.ok) throw new Error(r.error ?? "Gagal menyimpan akses.");
      }
      onSaved(`Perubahan untuk ${cleanName(name) || nameOf(user)} tersimpan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <form onSubmit={save}>
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id="edit-user-title" className="font-semibold text-gray-900">
                Ubah akun
              </h2>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div>
              <label htmlFor="eu-name" className="mb-1 block text-xs font-medium text-gray-700">
                Nama tampilan
              </label>
              <input
                id="eu-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                placeholder={nameOf(user)}
                disabled={busy}
                className={field}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Nama yang tampil di situs dan daftar hadir. Email tidak ditampilkan.
              </p>
            </div>

            <div>
              <label htmlFor="eu-dept" className="mb-1 block text-xs font-medium text-gray-700">
                Departemen
              </label>
              <select
                id="eu-dept"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                disabled={busy}
                className={field}
              >
                <option value="">Tidak ada (pengunjung)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Punya departemen = anggota, bisa absen.
              </p>
            </div>

            <fieldset>
              <legend className="mb-1.5 block text-xs font-medium text-gray-700">
                Akses admin panel
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    { v: "", t: "Tidak ada", s: "Hanya situs publik" },
                    { v: "pengurus", t: "Pengurus", s: "Menu sesuai departemen" },
                    { v: "admin", t: "Admin", s: "Semua menu" },
                  ] as { v: Access; t: string; s: string }[]
                ).map((o) => {
                  const active = role === o.v;
                  return (
                    <button
                      key={o.v || "none"}
                      type="button"
                      onClick={() => setRole(o.v)}
                      disabled={busy || isMe}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                        active
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:bg-gray-50 disabled:hover:bg-white"
                      } ${isMe && !active ? "opacity-50" : ""}`}
                    >
                      <span className="block text-sm font-medium text-gray-900">{o.t}</span>
                      <span className="block text-[11px] text-gray-500">{o.s}</span>
                    </button>
                  );
                })}
              </div>
              {isMe && (
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Akses akunmu sendiri dikunci supaya panel tidak kehilangan admin.
                </p>
              )}
            </fieldset>

            <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Status setelah disimpan:</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${KIND_BADGE[kind]}`}
                >
                  {KIND_LABEL[kind]}
                </span>
              </div>
              {role === "pengurus" && dept && (
                <p className="mt-1.5">
                  Menu:{" "}
                  {deptSections.length
                    ? deptSections.map((s) => SECTION_LABEL[s]).join(", ")
                    : "belum ada izin — atur di tab Izin departemen"}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy || !dirty}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------ izin departemen

function DepartmentAccessCard({
  department,
  sections,
  members,
  panelCount,
  onSaved,
}: {
  department: DepartmentOption;
  sections: Section[];
  members: number;
  panelCount: number;
  onSaved: (msg: string) => void;
}) {
  const [picked, setPicked] = useState<Section[]>(sections);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const same =
    picked.length === sections.length && picked.every((s) => sections.includes(s));

  const toggle = (s: Section) =>
    setPicked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await setDepartmentAccess(department.id, picked);
      if (!r.ok) throw new Error(r.error ?? "Gagal menyimpan izin.");
      onSaved(`Izin ${department.name} tersimpan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan izin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{department.name}</h3>
          <p className="text-xs text-gray-600">
            {members} anggota · {panelCount} pengurus panel
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-1.5 sm:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <label
            key={s.key}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
              i === SECTIONS.length - 1 && SECTIONS.length % 2 === 1 ? "sm:col-span-2 " : ""
            }${
              picked.includes(s.key)
                ? "border-emerald-300 bg-emerald-50/60"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={picked.includes(s.key)}
              onChange={() => toggle(s.key)}
              disabled={busy}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">{s.label}</span>
              <span className="block text-xs text-gray-600">{s.note}</span>
            </span>
          </label>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-auto flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
        <span className="mr-auto text-xs text-gray-600">
          {same ? `${sections.length} menu diizinkan` : "Ada perubahan belum disimpan"}
        </span>
        {!same && (
          <button
            type="button"
            onClick={() => setPicked(sections)}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy || same}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Simpan izin
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- halaman

export default function AdminPenggunaPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [access, setAccess] = useState<Record<string, Section[]>>({});
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<"akun" | "izin">("akun");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("semua");
  const [deptFilter, setDeptFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Naik setiap muat ulang supaya kartu izin memakai data terbaru.
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const [{ data: session }, list, depts, acc] = await Promise.all([
      supabase.auth.getSession(),
      fetchAllUsers(),
      fetchDepartmentOptions(),
      fetchDepartmentAccess(),
    ]);
    setMe(session.session?.user.id ?? "");
    setDepartments(depts);
    setAccess(acc.access);
    if (list.error) {
      setError(list.error);
    } else {
      setUsers(list.users);
      setLive(true);
      setError(acc.error ?? null);
    }
    setVersion((v) => v + 1);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void reload();
  }, [reload]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Pesan sukses hilang sendiri.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const deptName = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  const withKind = useMemo(
    () => users.map((u) => ({ u, kind: accountKind(u.staff_role, u.department_id) })),
    [users]
  );

  const counts = useMemo(() => {
    const c: Record<KindFilter, number> = { semua: 0, panel: 0, anggota: 0, pengunjung: 0 };
    for (const { kind } of withKind) {
      for (const f of KIND_FILTERS) if (inFilter(kind, f.value)) c[f.value]++;
    }
    return c;
  }, [withKind]);

  const filtered = useMemo(
    () =>
      withKind.filter(
        ({ u, kind }) =>
          inFilter(kind, kindFilter) &&
          (!deptFilter || u.department_id === deptFilter) &&
          matchesQuery(
            query,
            u.display_name,
            u.email,
            u.department_id ? deptName[u.department_id] : "",
            KIND_LABEL[kind]
          )
      ),
    [withKind, kindFilter, deptFilter, query, deptName]
  );

  const deptStats = useMemo(() => {
    const s: Record<string, { members: number; panel: number }> = {};
    for (const u of users) {
      if (!u.department_id) continue;
      s[u.department_id] ??= { members: 0, panel: 0 };
      s[u.department_id].members++;
      if (u.staff_role === "pengurus") s[u.department_id].panel++;
    }
    return s;
  }, [users]);

  const editing = users.find((u) => u.id === editingId) ?? null;
  const closeEditor = useCallback(() => setEditingId(null), []);

  const handleSaved = async (msg: string) => {
    setEditingId(null);
    setError(null);
    setNotice(msg);
    await reload();
    window.dispatchEvent(new Event(PROFILE_CHANGED));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
          <p className="mt-1 text-sm text-gray-500">
            Atur nama, departemen, dan akses panel setiap akun.
          </p>
        </div>
        <DbStatus live={live} loading={loading} error={error} />
      </div>

      <div className="mb-5 inline-flex rounded-lg border border-gray-200 bg-white p-1" role="tablist">
        {(
          [
            { v: "akun", t: "Akun", icon: Users },
            { v: "izin", t: "Izin departemen", icon: KeyRound },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            role="tab"
            aria-selected={tab === o.v}
            onClick={() => setTab(o.v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === o.v ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <o.icon className="h-4 w-4" />
            {o.t}
          </button>
        ))}
      </div>

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          <Check className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      {tab === "akun" ? (
        <>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, email, departemen…"
                aria-label="Cari pengguna"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Filter departemen"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 sm:w-60"
            >
              <option value="">Semua departemen</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter status akun">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.value}
                title={f.hint}
                aria-pressed={kindFilter === f.value}
                onClick={() => setKindFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  kindFilter === f.value
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.label}{" "}
                <span className={kindFilter === f.value ? "text-gray-300" : "text-gray-500"}>
                  {counts[f.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_8rem_5.5rem] gap-4 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 md:grid">
              <span>Nama</span>
              <span>Status</span>
              <span>Departemen</span>
              <span>Aktivitas</span>
              <span className="sr-only">Aksi</span>
            </div>

            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Memuat…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">
                  {users.length === 0 ? "Belum ada akun." : "Tidak ada akun yang cocok dengan filter."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filtered.map(({ u, kind }) => (
                  <li
                    key={u.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_8rem_5.5rem]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-gray-900">{nameOf(u)}</span>
                        {u.id === me && (
                          <span className="shrink-0 rounded bg-gray-900 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                            Kamu
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-gray-500">{u.email}</div>
                      {!u.display_name && (
                        <div className="text-[11px] text-amber-700">Belum punya nama tampilan</div>
                      )}
                    </div>

                    <button
                      onClick={() => setEditingId(u.id)}
                      className="inline-flex items-center gap-1.5 justify-self-end rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 md:order-last"
                      aria-label={`Ubah ${nameOf(u)}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Ubah
                    </button>

                    <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:contents">
                      <span>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${KIND_BADGE[kind]}`}
                        >
                          {(kind === "admin" || kind === "pengurus") && (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          {KIND_LABEL[kind]}
                        </span>
                      </span>
                      <span className="truncate text-gray-700">
                        {u.department_id ? deptName[u.department_id] ?? "—" : (
                          <span className="text-gray-500">Tanpa departemen</span>
                        )}
                      </span>
                      <span className="text-gray-500">
                        <span className="md:block">Daftar {shortDate(u.created_at)}</span>
                        <span className="hidden md:block">Masuk {shortDate(u.last_sign_in_at)}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Akun baru muncul setelah orangnya mendaftar di <strong>/masuk</strong> dan
            berstatus <strong>Pengunjung</strong>. Beri departemen agar jadi anggota
            (bisa absen); beri akses Pengurus agar bisa membuka panel sesuai izin departemennya.
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 flex gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
            <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
            <span>
              Centang menu yang boleh dibuka <strong>pengurus</strong> dari tiap departemen.
              Admin selalu bisa membuka semua menu. Absensi dan Pengguna khusus admin.
            </span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {departments.map((d) => (
                <DepartmentAccessCard
                  key={`${d.id}-${version}`}
                  department={d}
                  sections={access[d.id] ?? []}
                  members={deptStats[d.id]?.members ?? 0}
                  panelCount={deptStats[d.id]?.panel ?? 0}
                  onSaved={(m) => void handleSaved(m)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <EditUserDialog
          key={editing.id}
          user={editing}
          isMe={editing.id === me}
          departments={departments}
          access={access}
          onClose={closeEditor}
          onSaved={(m) => void handleSaved(m)}
        />
      )}
    </div>
  );
}
