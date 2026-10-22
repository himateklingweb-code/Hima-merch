import { getSupabase } from "./supabase";

/** Awalan isi QR absensi. Isi lengkap: HMTL-ABSEN:<id sesi>:<token>. */
export const QR_PREFIX = "HMTL-ABSEN:";

/** Batas radius dari titik absen, sama dengan check constraint di database. */
export const MAX_RADIUS_M = 15;

export interface AttendanceSession {
  id: string;
  title: string;
  description: string;
  department_id: string | null;
  starts_at: string;
  ends_at: string;
  require_location: boolean;
  latitude: number | null;
  longitude: number | null;
  radius_m: number | null;
  rotate_qr: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  user_id: string;
  department_id: string | null;
  display_name: string | null;
  checked_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
}

export interface MyAttendance {
  session_title: string;
  checked_at: string;
  distance_m: number | null;
}

export type SessionStatus = "berlangsung" | "akan_datang" | "selesai" | "ditutup";

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  berlangsung: "Berlangsung",
  akan_datang: "Akan datang",
  selesai: "Selesai",
  ditutup: "Ditutup",
};

export function sessionStatus(s: AttendanceSession, now = Date.now()): SessionStatus {
  if (!s.is_active) return "ditutup";
  if (now < new Date(s.starts_at).getTime()) return "akan_datang";
  if (now > new Date(s.ends_at).getTime()) return "selesai";
  return "berlangsung";
}

// Kolom yang dibaca dashboard. qr_secret sengaja tidak ikut.
const SESSION_COLUMNS =
  "id, title, description, department_id, starts_at, ends_at, require_location, latitude, longitude, radius_m, rotate_qr, is_active, created_at";

/** Jarak dua koordinat dalam meter (haversine), untuk pratinjau di layar. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ------------------------------------------------------------ anggota

export async function checkIn(
  payload: string,
  coords: { latitude: number; longitude: number; accuracy: number } | null
): Promise<{
  ok: boolean;
  error?: string;
  already?: boolean;
  sessionTitle?: string;
  checkedAt?: string;
  distance?: number | null;
}> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };

  const { data, error } = await supabase.rpc("check_in_attendance", {
    p_payload: payload,
    p_latitude: coords?.latitude ?? null,
    p_longitude: coords?.longitude ?? null,
    p_accuracy: coords?.accuracy ?? null,
  });
  if (error) return { ok: false, error: error.message };

  const r = data as {
    already: boolean;
    session_title: string;
    checked_at: string;
    distance_m?: number | null;
  };
  return {
    ok: true,
    already: r.already,
    sessionTitle: r.session_title,
    checkedAt: r.checked_at,
    distance: r.distance_m ?? null,
  };
}

export async function fetchMyAttendance(): Promise<MyAttendance[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("my_attendance");
  if (error || !data) return [];
  return data as MyAttendance[];
}

// ------------------------------------------------------------- admin

export async function listSessions(): Promise<{
  sessions: AttendanceSession[];
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { sessions: [], error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(SESSION_COLUMNS)
    .order("starts_at", { ascending: false });
  if (error) return { sessions: [], error: error.message };
  return { sessions: (data ?? []) as AttendanceSession[] };
}

export type SessionInput = Omit<AttendanceSession, "id" | "created_at"> & {
  id?: string;
};

export async function saveSession(
  input: SessionInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };

  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    department_id: input.department_id,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    require_location: input.require_location,
    latitude: input.require_location ? input.latitude : null,
    longitude: input.require_location ? input.longitude : null,
    radius_m: input.require_location ? input.radius_m : null,
    rotate_qr: input.rotate_qr,
    is_active: input.is_active,
  };

  if (input.id) {
    const { error } = await supabase
      .from("attendance_sessions")
      .update(row)
      .eq("id", input.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("attendance_sessions")
    .insert({ ...row, created_by: auth.user?.id ?? null });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setSessionActive(
  id: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ is_active: active })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSession(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { error } = await supabase.from("attendance_sessions").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function fetchQrPayload(sessionId: string): Promise<{
  payload?: string;
  rotate?: boolean;
  expiresIn?: number | null;
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase.rpc("attendance_qr_payload", {
    p_session: sessionId,
  });
  if (error) return { error: error.message };
  const r = data as { payload: string; rotate: boolean; expires_in: number | null };
  return { payload: r.payload, rotate: r.rotate, expiresIn: r.expires_in };
}

export async function listRecords(sessionId: string): Promise<{
  records: AttendanceRecord[];
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { records: [], error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("session_id", sessionId)
    .order("checked_at", { ascending: true });
  if (error) return { records: [], error: error.message };
  return { records: (data ?? []) as AttendanceRecord[] };
}

export async function deleteRecord(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
