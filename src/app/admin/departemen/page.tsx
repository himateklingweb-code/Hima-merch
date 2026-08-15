"use client";

import { useState } from "react";
import { departments as initialDepts, Department, DepartmentMember } from "@/data/departments";
import { Pencil, Users, Plus, Trash2, Star, X } from "lucide-react";

export default function AdminDepartemenPage() {
  const [depts, setDepts] = useState<Department[]>(initialDepts);
  const [editingMember, setEditingMember] = useState<{
    deptId: string;
    member: DepartmentMember | null;
  } | null>(null);

  const bph = depts.find((d) => d.slug === "bph");
  const regularDepts = depts.filter((d) => d.slug !== "bph");

  const handleSaveMember = (deptId: string, member: DepartmentMember) => {
    setDepts((prev) =>
      prev.map((d) => {
        if (d.id !== deptId) return d;
        const activePeriod = d.periods.find((p) => p.is_active);
        if (!activePeriod) return d;
        const exists = activePeriod.members.find((m) => m.id === member.id);
        return {
          ...d,
          periods: d.periods.map((p) =>
            p.id === activePeriod.id
              ? {
                  ...p,
                  members: exists
                    ? p.members.map((m) => (m.id === member.id ? member : m))
                    : [...p.members, member],
                }
              : p
          ),
        };
      })
    );
    setEditingMember(null);
  };

  const handleDeleteMember = (deptId: string, memberId: string) => {
    setDepts((prev) =>
      prev.map((d) => {
        if (d.id !== deptId) return d;
        return {
          ...d,
          periods: d.periods.map((p) => ({
            ...p,
            members: p.members.filter((m) => m.id !== memberId),
          })),
        };
      })
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departemen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola pengurus inti &amp; departemen
        </p>
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
          const Icon = dept.icon;
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
                <button
                  onClick={() =>
                    setEditingMember({ deptId: dept.id, member: null })
                  }
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                {dept.description}
              </p>

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
  onSave: (deptId: string, m: DepartmentMember) => void;
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
