import { getSupabase } from "./supabase";
import { isStaffRole, type StaffRole } from "./roles";

/** Profil akun yang sedang masuk (RPC `get_my_profile`). */
export interface MyProfile {
  id: string;
  display_name: string | null;
  department_id: string | null;
  department_name: string | null;
  department_slug: string | null;
  staff_role: StaffRole | null;
  /** Menu panel yang boleh dibuka (admin: semua). */
  sections: string[];
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    display_name: (row.display_name as string | null) ?? null,
    department_id: (row.department_id as string | null) ?? null,
    department_name: (row.department_name as string | null) ?? null,
    department_slug: (row.department_slug as string | null) ?? null,
    staff_role: isStaffRole(row.staff_role) ? row.staff_role : null,
    sections: Array.isArray(row.sections)
      ? (row.sections as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
  };
}

export const NAME_MIN = 2;
export const NAME_MAX = 60;

/** Rapikan spasi; validasi akhir tetap di database. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Ganti nama tampilan. Tanpa `userId` = akun sendiri; dengan `userId` hanya
 * berhasil bila pemanggil admin (dicek di RPC `set_display_name`).
 */
export async function saveDisplayName(
  name: string,
  userId?: string
): Promise<{ ok: boolean; error?: string; displayName?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };

  const clean = cleanName(name);
  if (clean.length < NAME_MIN || clean.length > NAME_MAX) {
    return { ok: false, error: `Nama harus ${NAME_MIN}–${NAME_MAX} karakter.` };
  }

  const { data, error } = await supabase.rpc("set_display_name", {
    p_name: clean,
    p_user_id: userId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    displayName: (data as { display_name?: string })?.display_name ?? clean,
  };
}
