import { departments } from "@/data/departments";
import { Pencil, Users } from "lucide-react";

export default function AdminDepartemenPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departemen</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola departemen dan kepengurusan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept) => {
          const activePeriod = dept.periods.find((p) => p.is_active);
          return (
            <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{dept.icon}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">/{dept.slug}</p>
                  </div>
                </div>
                <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-3 line-clamp-2">{dept.description}</p>

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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {activePeriod.members.slice(0, 3).map((m) => (
                      <span key={m.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {m.name} — {m.position}
                      </span>
                    ))}
                    {activePeriod.members.length > 3 && (
                      <span className="text-xs text-gray-400">+{activePeriod.members.length - 3} lainnya</span>
                    )}
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
    </div>
  );
}
