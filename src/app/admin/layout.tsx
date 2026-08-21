"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Building2,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produk", label: "Produk", icon: Package },
  { href: "/admin/pesanan", label: "Pesanan", icon: ShoppingCart },
  { href: "/admin/departemen", label: "Departemen", icon: Building2 },
  { href: "/admin/berita", label: "Berita", icon: FileText },
  { href: "/admin/iklan", label: "Iklan Mitra", icon: Megaphone },
  { href: "/admin/seo", label: "SEO", icon: Settings },
  { href: "/admin/pengguna", label: "Pengguna", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const [staffName, setStaffName] = useState<string>("");
  const [staffEmail, setStaffEmail] = useState<string>("");

  // The real gate is row level security on the database — this check only
  // decides what to paint. An account without a `staff` row can hold a
  // valid session and still read nothing.
  useEffect(() => {
    if (pathname === "/admin/login") {
      setAuthenticated(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = getSupabase();
      if (!supabase) {
        if (!cancelled) setAuthenticated(false);
        router.replace("/admin/login");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        if (!cancelled) setAuthenticated(false);
        router.replace("/admin/login");
        return;
      }

      const { data: staff } = await supabase
        .from("staff")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!staff) {
        await supabase.auth.signOut();
        setAuthenticated(false);
        router.replace("/admin/login");
        return;
      }

      setStaffName(staff.full_name || staff.email || "Pengurus");
      setStaffEmail(staff.email ?? user.email ?? "");
      setAuthenticated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (authenticated === null || authenticated === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-gray-400">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await getSupabase()?.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                TL
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Admin Panel</div>
                <div className="text-[10px] text-gray-400">HMTL UNTAN</div>
              </div>
              <button
                className="ml-auto lg:hidden p-1 rounded text-gray-400 hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {staffName || "Pengurus"}
                </div>
                <div className="text-xs text-gray-400 truncate">{staffEmail}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-3">
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
            >
              Lihat Situs →
            </Link>
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
