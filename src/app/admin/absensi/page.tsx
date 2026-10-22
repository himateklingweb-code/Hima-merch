"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Crosshair,
  FileDown,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import DbStatus from "@/components/admin/DbStatus";
import AttendanceQr from "@/components/admin/AttendanceQr";
import {
  MAX_RADIUS_M,
  SESSION_STATUS_LABEL,
  deleteRecord,
  deleteSession,
  listRecords,
  listSessions,
  mapsUrl,
  saveSession,
  sessionStatus,
  setSessionActive,
  type AttendanceRecord,
  type AttendanceSession,
  type SessionInput,
  type SessionStatus,
} from "@/lib/attendance-repo";
import {
  fetchDepartmentOptions,
  type DepartmentOption,
} from "@/lib/users-repo";
import { matchesQuery } from "@/lib/search";

const STATUS_BADGE: Record<SessionStatus, string> = {
  berlangsung: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  akan_datang: "bg-sky-50 text-sky-800 ring-sky-200",
  selesai: "bg-gray-100 text-gray-600 ring-gray-200",
  ditutup: "bg-red-50 text-red-700 ring-red-200",
};

const field =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const label = "mb-1 block text-xs font-medium text-gray-700";

/** ISO → nilai <input type="datetime-local"> di zona waktu perangkat. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fmt(iso: string, withDate = true) {
  return new Date(iso).toLocaleString("id-ID", {
    ...(withDate ? { day: "numeric", month: "short", year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}

function emptyDraft(): SessionInput {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    department_id: null,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    require_location: false,
    latitude: null,
    longitude: null,
    radius_m: MAX_RADIUS_M,
    rotate_qr: true,
    is_active: true,
  };
}

// ------------------------------------------------------------ form sesi

function SessionForm({
  initial,
  departments,
  onCancel,
  onSaved,
}: {
  initial: SessionInput;
  departments: DepartmentOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<SessionInput>(initial);
  const [latText, setLatText] = useState(initial.latitude?.toString() ?? "");
  const [lngText, setLngText] = useState(initial.longitude?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SessionInput>(k: K, v: SessionInput[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  const setCoords = (lat: number, lng: number) => {
    setLatText(String(lat));
    setLngText(String(lng));
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Browser ini tidak mendukung lokasi.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(
          Number(pos.coords.latitude.toFixed(6)),
          Number(pos.coords.longitude.toFixed(6))
        );
        setAccuracy(Math.round(pos.coords.accuracy));
        setLocating(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Izinkan lokasi di browser atau isi koordinat manual."
            : "Lokasi tidak didapat. Nyalakan GPS atau isi koordinat manual."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /** Tempel "-0.0570, 109.3460" (format salin dari Google Maps) sekaligus. */
  const pasteCoords = (text: string) => {
    const m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) return false;
    setCoords(Number(m[1]), Number(m[2]));
    return true;
  };

  const lat = latText.trim() === "" ? null : Number(latText);
  const lng = lngText.trim() === "" ? null : Number(lngText);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (d.title.trim().length < 2) return setError("Judul minimal 2 karakter.");
    if (new Date(d.ends_at) <= new Date(d.starts_at))
      return setError("Waktu selesai harus setelah waktu mulai.");
    if (d.require_location) {
      if (lat == null || lng == null)
        return setError("Tentukan titik lokasi absen dulu.");
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      )
        return setError("Koordinat tidak valid.");
      const r = d.radius_m ?? 0;
      if (r < 1 || r > MAX_RADIUS_M)
        return setError(`Radius harus 1–${MAX_RADIUS_M} meter.`);
    }
    setBusy(true);
    const res = await saveSession({ ...d, latitude: lat, longitude: lng });
    setBusy(false);
    if (res.ok) onSaved();
    else setError(res.error ?? "Gagal menyimpan sesi.");
  };

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {d.id ? "Ubah sesi absensi" : "Sesi absensi baru"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          aria-label="Tutup form"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="att-title">
            Judul kegiatan
          </label>
          <input
            id="att-title"
            value={d.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={120}
            placeholder="Rapat Pleno, Kuliah Umum, dsb."
            className={field}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="att-desc">
            Keterangan (opsional)
          </label>
          <input
            id="att-desc"
            value={d.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={300}
            placeholder="Ruang, catatan untuk peserta"
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="att-start">
            Mulai
          </label>
          <input
            id="att-start"
            type="datetime-local"
            value={toLocalInput(d.starts_at)}
            onChange={(e) =>
              e.target.value && set("starts_at", new Date(e.target.value).toISOString())
            }
            className={field}
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="att-end">
            Selesai
          </label>
          <input
            id="att-end"
            type="datetime-local"
            value={toLocalInput(d.ends_at)}
            onChange={(e) =>
              e.target.value && set("ends_at", new Date(e.target.value).toISOString())
            }
            className={field}
            required
          />
        </div>

        <div>
          <label className={label} htmlFor="att-dept">
            Peserta
          </label>
          <select
            id="att-dept"
            value={d.department_id ?? ""}
            onChange={(e) => set("department_id", e.target.value || null)}
            className={field}
          >
            <option value="">Semua departemen</option>
            {departments.map((dep) => (
              <option key={dep.id} value={dep.id}>
                Hanya {dep.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={label}>Jenis QR</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: true, t: "Berganti", s: "Tiap 30 dtk, anti titip absen" },
              { v: false, t: "Statis", s: "Tetap, bisa dicetak" },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => set("rotate_qr", o.v)}
                aria-pressed={d.rotate_qr === o.v}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  d.rotate_qr === o.v
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="block text-sm font-medium text-gray-900">{o.t}</span>
                <span className="block text-[11px] text-gray-500">{o.s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lokasi */}
        <div className="rounded-lg border border-gray-200 p-3 sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={d.require_location}
              onChange={(e) => set("require_location", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">
                Wajib di lokasi (radius)
              </span>
              <span className="block text-xs text-gray-500">
                Matikan untuk mode QR saja. Bila aktif, peserta harus berada
                maksimal {MAX_RADIUS_M} m dari titik absen.
              </span>
            </span>
          </label>

          {d.require_location && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {locating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Crosshair className="h-3.5 w-3.5" />
                  )}
                  Pakai lokasi saya sekarang
                </button>
                {accuracy != null && (
                  <span
                    className={`text-xs ${
                      accuracy > 20 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    Akurasi ±{accuracy} m
                    {accuracy > 20 && " — kurang akurat, coba di luar ruangan / ulangi"}
                  </span>
                )}
              </div>
              <div>
                <label className={label} htmlFor="att-lat">
                  Latitude
                </label>
                <input
                  id="att-lat"
                  inputMode="decimal"
                  value={latText}
                  onChange={(e) => {
                    if (!pasteCoords(e.target.value)) setLatText(e.target.value);
                  }}
                  placeholder="-0.057000"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="att-lng">
                  Longitude
                </label>
                <input
                  id="att-lng"
                  inputMode="decimal"
                  value={lngText}
                  onChange={(e) => {
                    if (!pasteCoords(e.target.value)) setLngText(e.target.value);
                  }}
                  placeholder="109.346000"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="att-radius">
                  Radius: {d.radius_m ?? MAX_RADIUS_M} m
                </label>
                <input
                  id="att-radius"
                  type="range"
                  min={1}
                  max={MAX_RADIUS_M}
                  value={d.radius_m ?? MAX_RADIUS_M}
                  onChange={(e) => set("radius_m", Number(e.target.value))}
                  className="mt-2 w-full accent-emerald-600"
                />
              </div>
              <p className="text-[11px] text-gray-500 sm:col-span-3">
                Tip: di Google Maps, tekan lama titik lokasi lalu salin
                koordinatnya dan tempel ke kolom Latitude. GPS HP biasanya
                meleset 5–15 m di dalam gedung, jadi radius 15 m paling aman.
                {lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && (
                  <>
                    {" "}
                    <a
                      href={mapsUrl(lat, lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      Cek titik di Google Maps →
                    </a>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan sesi
        </button>
      </div>
    </form>
  );
}

// ----------------------------------------------------- detail satu sesi

function SessionDetail({
  session,
  deptName,
  onBack,
  onEdit,
  onChanged,
}: {
  session: AttendanceSession;
  deptName: Record<string, string>;
  onBack: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const status = sessionStatus(session);

  const load = useCallback(async () => {
    const r = await listRecords(session.id);
    setRecords(r.records);
    setError(r.error ?? null);
    setLoading(false);
  }, [session.id]);

  // Daftar hadir ikut diperbarui otomatis selama sesi berlangsung.
  useEffect(() => {
    void Promise.resolve().then(load);
    if (status !== "berlangsung") return;
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load, status]);

  const filtered = records.filter((r) =>
    matchesQuery(query, r.display_name, r.department_id ? deptName[r.department_id] : "")
  );

  const exportExcel = () => {
    const rows = records.map((r, i) => ({
      No: i + 1,
      Nama: r.display_name ?? "",
      Departemen: r.department_id ? deptName[r.department_id] ?? "" : "",
      Waktu: fmt(r.checked_at),
      "Jarak (m)": r.distance_m != null ? Math.round(r.distance_m) : "",
      "Akurasi GPS (m)": r.accuracy_m != null ? Math.round(r.accuracy_m) : "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Kehadiran");
    const slug = session.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    XLSX.writeFile(book, `absensi-${slug}.xlsx`);
  };

  const toggleActive = async () => {
    const r = await setSessionActive(session.id, !session.is_active);
    if (r.ok) onChanged();
    else setError(r.error ?? "Gagal mengubah status.");
  };

  const removeRecord = async (rec: AttendanceRecord) => {
    if (!confirm(`Hapus kehadiran ${rec.display_name ?? "peserta ini"}?`)) return;
    const r = await deleteRecord(rec.id);
    if (r.ok) void load();
    else setError(r.error ?? "Gagal menghapus.");
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Semua sesi
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_BADGE[status]}`}
            >
              {SESSION_STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {fmt(session.starts_at)} – {fmt(session.ends_at, false)} ·{" "}
            {session.department_id
              ? `Hanya ${deptName[session.department_id] ?? "departemen"}`
              : "Semua departemen"}
          </p>
          {session.description && (
            <p className="mt-1 text-sm text-gray-600">{session.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Ubah
          </button>
          <button
            onClick={toggleActive}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {session.is_active ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
            {session.is_active ? "Tutup absensi" : "Buka lagi"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            {session.is_active ? (
              <AttendanceQr
                sessionId={session.id}
                title={session.title}
                rotate={session.rotate_qr}
              />
            ) : (
              <div className="py-10 text-center text-sm text-gray-500">
                <Lock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                Absensi ditutup. Buka lagi untuk menampilkan QR.
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-gray-900">
              <MapPin className="h-4 w-4 text-gray-500" />
              {session.require_location ? "Wajib di lokasi" : "Tanpa cek lokasi"}
            </div>
            {session.require_location &&
              session.latitude != null &&
              session.longitude != null && (
                <p className="mt-1 text-xs text-gray-500">
                  Radius {session.radius_m} m dari{" "}
                  <a
                    href={mapsUrl(session.latitude, session.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {session.latitude.toFixed(6)}, {session.longitude.toFixed(6)}
                  </a>
                </p>
              )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Users className="h-4 w-4" />
              Hadir ({records.length})
            </h2>
            <label className="relative flex-1 sm:ml-auto sm:max-w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari peserta…"
                aria-label="Cari peserta"
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
              />
            </label>
            <button
              onClick={exportExcel}
              disabled={records.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              Excel
            </button>
          </div>

          {error && (
            <div className="m-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Departemen</th>
                  <th className="px-4 py-2.5">Waktu</th>
                  <th className="px-4 py-2.5">Jarak</th>
                  <th className="px-4 py-2.5">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                      {records.length === 0
                        ? "Belum ada yang absen."
                        : "Tidak ada peserta yang cocok."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {r.display_name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.department_id ? deptName[r.department_id] ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {fmt(r.checked_at, false)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.distance_m != null ? `${Math.round(r.distance_m)} m` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => removeRecord(r)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          aria-label={`Hapus kehadiran ${r.display_name ?? ""}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- halaman

type StatusFilter = "semua" | SessionStatus;

export default function AdminAbsensiPage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionInput | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua");

  const reload = useCallback(async () => {
    const [r, depts] = await Promise.all([listSessions(), fetchDepartmentOptions()]);
    setSessions(r.sessions);
    setDepartments(depts);
    setError(r.error ?? null);
    setLive(!r.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  const deptName = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  const filtered = sessions.filter(
    (s) =>
      (statusFilter === "semua" || sessionStatus(s) === statusFilter) &&
      matchesQuery(
        query,
        s.title,
        s.description,
        s.department_id ? deptName[s.department_id] : "semua"
      )
  );

  const open = sessions.find((s) => s.id === openId) ?? null;

  const editSession = (s: AttendanceSession) => {
    setDraft({
      id: s.id,
      title: s.title,
      description: s.description,
      department_id: s.department_id,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      require_location: s.require_location,
      latitude: s.latitude,
      longitude: s.longitude,
      radius_m: s.radius_m ?? MAX_RADIUS_M,
      rotate_qr: s.rotate_qr,
      is_active: s.is_active,
    });
  };

  const remove = async (s: AttendanceSession) => {
    if (!confirm(`Hapus sesi "${s.title}" beserta seluruh daftar hadirnya?`)) return;
    const r = await deleteSession(s.id);
    if (r.ok) {
      if (openId === s.id) setOpenId(null);
      void reload();
    } else setError(r.error ?? "Gagal menghapus sesi.");
  };

  const form = draft && (
    <SessionForm
      key={draft.id ?? "new"}
      initial={draft}
      departments={departments}
      onCancel={() => setDraft(null)}
      onSaved={() => {
        setDraft(null);
        void reload();
      }}
    />
  );

  if (open) {
    return (
      <div>
        {form}
        <SessionDetail
          key={open.id}
          session={open}
          deptName={deptName}
          onBack={() => setOpenId(null)}
          onEdit={() => editSession(open)}
          onChanged={() => void reload()}
        />
      </div>
    );
  }

  const STATUS_FILTERS: StatusFilter[] = [
    "semua",
    "berlangsung",
    "akan_datang",
    "selesai",
    "ditutup",
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absensi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Buat sesi, tampilkan QR, dan pantau kehadiran anggota.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DbStatus live={live} loading={loading} error={error} />
          <button
            onClick={() => setDraft(emptyDraft())}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Sesi baru
          </button>
        </div>
      </div>

      {form}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari sesi…"
            aria-label="Cari sesi absensi"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              aria-pressed={statusFilter === f}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "semua" ? "Semua" : SESSION_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <QrCode className="mx-auto mb-3 h-9 w-9 text-gray-300" />
          <p className="text-sm text-gray-500">
            {sessions.length === 0
              ? "Belum ada sesi absensi. Klik \u201cSesi baru\u201d untuk mulai."
              : "Tidak ada sesi yang cocok dengan filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const st = sessionStatus(s);
            return (
              <div
                key={s.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_BADGE[st]}`}
                  >
                    {SESSION_STATUS_LABEL[st]}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {fmt(s.starts_at)} – {fmt(s.ends_at, false)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {s.require_location ? `Radius ${s.radius_m} m` : "QR saja"} ·{" "}
                    {s.rotate_qr ? "QR berganti" : "QR statis"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {s.department_id
                      ? deptName[s.department_id] ?? "Departemen"
                      : "Semua departemen"}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setOpenId(s.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Buka QR &amp; daftar hadir
                  </button>
                  <button
                    onClick={() => editSession(s)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                    aria-label={`Ubah ${s.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-red-600"
                    aria-label={`Hapus ${s.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
