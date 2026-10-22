import { getSupabase } from "./supabase";
import { isStaffRole, type StaffRole } from "./roles";

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
