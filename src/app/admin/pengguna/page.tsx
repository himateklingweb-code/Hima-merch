import { Plus, Shield, ShoppingCart, FileText, MoreVertical } from "lucide-react";

const users = [
  { id: "u1", name: "Admin Demo", email: "admin@himatl.com", role: "admin", status: "active" },
  { id: "u2", name: "Kasir Demo", email: "kasir@himatl.com", role: "kasir", status: "active" },
  { id: "u3", name: "Editor Kominfo", email: "kominfo@himatl.com", role: "editor", status: "active" },
  { id: "u4", name: "Kasir Backup", email: "kasir2@himatl.com", role: "kasir", status: "inactive" },
];

const roleConfig = {
  admin: { label: "Admin", color: "bg-red-100 text-red-700", icon: Shield },
  kasir: { label: "Kasir", color: "bg-amber-100 text-amber-700", icon: ShoppingCart },
  editor: { label: "Editor Konten", color: "bg-blue-100 text-blue-700", icon: FileText },
};

export default function AdminPenggunaPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola admin, kasir, dan editor konten</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        {Object.entries(roleConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <config.icon className="w-4 h-4 text-gray-500" />
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-400">
              {key === "admin"
                ? "Full akses"
                : key === "kasir"
                ? "Merchandise saja"
                : "Konten saja"}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Nama</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const role = roleConfig[user.role as keyof typeof roleConfig];
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${role.color}`}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          user.status === "active" ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-gray-300"}`} />
                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
