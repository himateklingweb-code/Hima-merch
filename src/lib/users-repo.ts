import { getSupabase } from "./supabase";
import { isSection, isStaffRole, type Section, type StaffRole } from "./roles";

/** Satu akun untuk halaman Pengguna (RPC `admin_list_users`, admin saja). */
export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  department_id: string | null;
  staff_role: StaffRole | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface DepartmentOption {
  id: string;
  name: string;
  slug: string;
}

export async function fetchDepartmentOptions(): Promise<DepartmentOption[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, slug")
    .order("order_index", { ascending: true });
  if (error || !data) return [];
  return data as DepartmentOption[];
}

export async function fetchAllUsers(): Promise<{
  users: AdminUserRow[];
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { users: [], error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) return { users: [], error: error.message };
  return {
    users: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      email: String(r.email ?? ""),
      display_name: (r.display_name as string | null) ?? null,
      department_id: (r.department_id as string | null) ?? null,
      staff_role: isStaffRole(r.staff_role) ? r.staff_role : null,
      created_at: String(r.created_at),
      last_sign_in_at: (r.last_sign_in_at as string | null) ?? null,
    })),
  };
}

/** Izin menu setiap departemen: { [departmentId]: Section[] }. */
export async function fetchDepartmentAccess(): Promise<{
  access: Record<string, Section[]>;
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) return { access: {}, error: "Supabase belum dikonfigurasi." };
  const { data, error } = await supabase
    .from("department_access")
    .select("department_id, section");
  if (error) return { access: {}, error: error.message };
  const access: Record<string, Section[]> = {};
  for (const r of (data ?? []) as { department_id: string; section: string }[]) {
    if (!isSection(r.section)) continue;
    (access[r.department_id] ??= []).push(r.section);
  }
  return { access };
}

/** Ganti seluruh izin menu satu departemen. */
export async function setDepartmentAccess(
  departmentId: string,
  sections: Section[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { error } = await supabase.rpc("admin_set_department_access", {
    p_department_id: departmentId,
    p_sections: sections,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Atur peran panel (null = tanpa akses) dan departemen sekaligus. */
export async function setUserAccess(
  userId: string,
  role: StaffRole | null,
  departmentId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase belum dikonfigurasi." };
  const { error } = await supabase.rpc("admin_set_user_access", {
    p_user_id: userId,
    p_role: role,
    p_department_id: departmentId,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
