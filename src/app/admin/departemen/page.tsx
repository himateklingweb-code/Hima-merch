"use client";

import { useCallback, useEffect, useState } from "react";
import { iconFromName, ICON_NAMES } from "@/lib/icons";
import DeptIcon from "@/components/DeptIcon";
import {
  departments as seedDepts,
  Department,
  DepartmentMember,
} from "@/data/departments";
import { getSupabase } from "@/lib/supabase";
import DbStatus from "@/components/admin/DbStatus";
import { Pencil, Users, Plus, Trash2, Star, X } from "lucide-react";

/**
 * Members are edited against the department's *active* period. The nested
 * shape (department → periods → members) is why this screen loads its own
 * data instead of using the flat useCollection hook.
 */
export default function AdminDepartemenPage() {
  const [depts, setDepts] = useState<Department[]>(seedDepts);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<{
    deptId: string;
    member: DepartmentMember | null;
  } | null>(null);
  const [editingDept, setEditingDept] = useState<{
    dept: Department;
    creating: boolean;
  } | null>(null);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLive(false);
      setLoading(false);
      return;
    }

    const { data, error: readError } = await supabase
      .from("departments")
      .select("*, periods:department_periods(*, members:department_members(*))")
      .order("order_index", { ascending: true });

    if (readError || !data) {
      setLive(false);
      setLoading(false);
      return;
    }

    setDepts(
      data.map((d) => ({
        id: d.id as string,
        name: d.name as string,
        slug: d.slug as string,
        description: d.description as string,
        icon: d.icon as string,
        periods: ((d.periods ?? []) as Record<string, unknown>[])
          .map((p) => ({
            id: p.id as string,
            department_id: p.department_id as string,
            period_label: p.period_label as string,
            is_active: p.is_active as boolean,
            start_date: (p.start_date as string) ?? "",
            end_date: (p.end_date as string) ?? "",
            members: ((p.members ?? []) as Record<string, unknown>[])
              .map((m) => ({
                id: m.id as string,
                name: m.name as string,
                position: m.position as string,
                photo: (m.photo as string) ?? "",
                contact: (m.contact as string) ?? undefined,
                order_index: m.order_index as number,
              }))
              .sort((a, b) => a.order_index - b.order_index),
          }))
          .sort((a, b) => Number(b.is_active) - Number(a.is_active)),
      }))
    );
    setLive(true);
    setLoading(false);
  }, []);

  // Fetching after mount is the point: the row set lives in Postgres, not
  // in React, and reading it during render is impossible. The loading
  // flag is what keeps this from flickering, not a second render pass.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void reload();
  }, [reload]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const bph = depts.find((d) => d.slug === "bph");
  const regularDepts = depts.filter((d) => d.slug !== "bph");

  const handleSaveMember = async (
    deptId: string,
    member: DepartmentMember
  ) => {
    const supabase = getSupabase();
    const dept = depts.find((d) => d.id === deptId);
    const activePeriod = dept?.periods.find((p) => p.is_active);

    if (!activePeriod) {
      setError("Departemen ini belum punya periode aktif.");
      return;
    }
    if (!supabase) {
      setError("Supabase belum dikonfigurasi — perubahan tidak tersimpan.");
      return;
    }

    setSaving(true);
    setError(null);
    const { error: writeError } = await supabase
      .from("department_members")
      .upsert({
        id: member.id,
        period_id: activePeriod.id,
        name: member.name,
        position: member.position,
        photo: member.photo || null,
        contact: member.contact || null,
        order_index: member.order_index,
      });
    setSaving(false);

    if (writeError) {
      setError(writeError.message);
      return;
    }
    await reload();
    setEditingMember(null);
  };

  /**
   * Departments themselves were read-only — you could edit who is in one but
   * not create, rename or remove one.
   *
   * A new department also gets an active period, because members hang off a
   * period and a department without one silently refuses every member you
   * try to add.
   */
  const handleSaveDept = async (dept: Department, creating: boolean) => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi — perubahan tidak tersimpan.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: writeError } = await supabase.from("departments").upsert({
      id: dept.id,
      name: dept.name,
      slug: dept.slug,
      description: dept.description,
      icon: dept.icon,
      order_index: depts.length,
    });

    if (!writeError && creating) {
      const year = new Date().getFullYear();
      await supabase.from("department_periods").insert({
        id: `period-${dept.id}-${Date.now()}`,
        department_id: dept.id,
        period_label: `${year}/${year + 1}`,
        is_active: true,
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
      });
    }

    setSaving(false);
    if (writeError) {
      setError(writeError.message);
      return;
    }
    await reload();
    setEditingDept(null);
  };

  const handleDeleteDept = async (deptId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    // Periods and members cascade, so this removes the whole branch.
    const { error: delError } = await supabase
      .from("departments")
      .delete()
      .eq("id", deptId);
    setSaving(false);
    if (delError) {
      setError(delError.message);
      return;
    }
    await reload();
    setDeleteDeptId(null);
  };

  const handleDeleteMember = async (deptId: string, memberId: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi — perubahan tidak tersimpan.");
      return;
    }

    setSaving(true);
    setError(null);
    const { error: delError } = await supabase
      .from("department_members")
      .delete()
      .eq("id", memberId);
    setSaving(false);

    if (delError) {
      setError(delError.message);
      return;
    }
    await reload();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departemen</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola pengurus inti &amp; departemen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DbStatus live={live} loading={loading} error={error} saving={saving} />
          <button
            onClick={() =>
              setEditingDept({
                creating: true,
                dept: {
                  id: `dept-${Date.now()}`,
                  name: "",
                  slug: "",
                  description: "",
                  icon: "Users",
                  periods: [],
                },
              })
            }
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Departemen
          </button>
        </div>
      </div>

      {/* ── BPH Section ── */}
      {bph && (() => {
        const activePeriod = bph.periods.find((p) => p.is_active);
        return (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Pengurus Inti
              </span>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {bph.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {bph.description}
                  </p>
                </div>
                {activePeriod && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded">
                    Periode {activePeriod.period_label}
                  </span>
                )}
              </div>
              {activePeriod && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  {activePeriod.members.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white rounded-lg border border-amber-200 p-4 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {m.name}
                        </div>
                        <div className="text-xs text-amber-600 font-medium">
                          {m.position}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setEditingMember({ deptId: bph.id, member: m })
                        }
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditingMember({ deptId: bph.id, member: null })
                    }
                    className="border-2 border-dashed border-amber-300 rounded-lg p-4 flex items-center justify-center gap-2 text-amber-600 hover:bg-amber-50 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Anggota BPH
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Departments Grid ── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Kepala Departemen &amp; Staff
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regularDepts.map((dept) => {
          const activePeriod = dept.periods.find((p) => p.is_active);
          const Icon = iconFromName(dept.icon);
          return (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      /{dept.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setEditingMember({ deptId: dept.id, member: null })
                    }
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Tambah pengurus"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingDept({ dept, creating: false })}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Edit departemen"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteDeptId(dept.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                    title="Hapus departemen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                {dept.description}
              </p>

              {!activePeriod && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                  Belum ada periode aktif — pengurus belum bisa ditambahkan.
                </p>
              )}

              {activePeriod && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Periode {activePeriod.period_label}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {activePeriod.members.length} anggota
                    </span>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {activePeriod.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-sm group"
                      >
                        <span className="text-gray-600">
                          <span className="font-medium text-gray-900">
                            {m.name}
                          </span>{" "}
                          — {m.position}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setEditingMember({
                                deptId: dept.id,
                                member: m,
                              })
                            }
                            className="p-1 rounded text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteMember(dept.id, m.id)
                            }
                            className="p-1 rounded text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs text-gray-400">
                {dept.periods.length} periode tercatat
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Member Edit Modal ── */}
      {editingMember && (
        <MemberModal
          deptId={editingMember.deptId}
          member={editingMember.member}
          onSave={handleSaveMember}
          onClose={() => setEditingMember(null)}
        />
      )}

      {/* ── Department Edit Modal ── */}
      {editingDept && (
        <DeptModal
          dept={editingDept.dept}
          creating={editingDept.creating}
          onSave={(d) => handleSaveDept(d, editingDept.creating)}
          onClose={() => setEditingDept(null)}
        />
      )}

      {deleteDeptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Hapus Departemen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Semua periode dan pengurus di dalamnya ikut terhapus permanen.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteDeptId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteDept(deleteDeptId)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeptModal({
  dept,
  creating,
  onSave,
  onClose,
}: {
  dept: Department;
  creating: boolean;
  onSave: (d: Department) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...dept });
  const field =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm";

  const autoSlug = form.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, slug: form.slug || autoSlug });
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">
            {creating ? "Departemen Baru" : "Edit Departemen"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Departemen
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={field}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL)
            </label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder={autoSlug || "otomatis dari nama"}
              className={`${field} font-mono`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className={`${field} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ikon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm({ ...form, icon: name })}
                  title={name}
                  className={`w-10 h-10 rounded-lg border grid place-items-center transition-colors ${
                    form.icon === name
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <DeptIcon name={name} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {creating && (
            <p className="text-xs text-gray-400">
              Periode aktif tahun ini dibuat otomatis, supaya pengurus bisa
              langsung ditambahkan.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}

function MemberModal({
  deptId,
  member,
  onSave,
  onClose,
}: {
  deptId: string;
  member: DepartmentMember | null;
  onSave: (deptId: string, m: DepartmentMember) => void | Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [position, setPosition] = useState(member?.position ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(deptId, {
      id: member?.id ?? `m-${Date.now()}`,
      name,
      position,
      photo: member?.photo ?? "/placeholder-avatar.png",
      order_index: member?.order_index ?? 99,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">
            {member ? "Edit Anggota" : "Tambah Anggota"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jabatan
            </label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
              placeholder="Ketua, Sekretaris, Staff, ..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Simpan
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Demo — perubahan hanya berlaku di sesi ini.
        </p>
      </form>
    </div>
  );
}
