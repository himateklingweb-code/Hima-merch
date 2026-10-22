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
  Handshake,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ShieldAlert,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  ADMIN_SECTIONS,
  ROLE_BADGE,
  ROLE_LABEL,
  canAccess,
  isStaffRole,
  type StaffRole,
} from "@/lib/roles";

const LINK_META: Record<string, { label: string; icon: LucideIcon }> = {
  "/admin": { label: "Dashboard", icon: LayoutDashboard },
  "/admin/produk": { label: "Produk", icon: Package },
  "/admin/pesanan": { label: "Pesanan", icon: ShoppingCart },
  "/admin/departemen": { label: "Departemen", icon: Building2 },
  "/admin/berita": { label: "Berita", icon: FileText },
  "/admin/mitra": { label: "Mitra & Sponsor", icon: Handshake },
  "/admin/iklan": { label: "Iklan Mitra", icon: Megaphone },
  "/admin/seo": { label: "SEO", icon: Settings },
  "/admin/absensi": { label: "Absensi", icon: QrCode },
  "/admin/pengguna": { label: "Pengguna", icon: Users },
};

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
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);

  // The real gate is row level security on the database — this check only
  // decides what to paint. An account without a `staff` row can hold a
  // valid session and still read nothing. Dibaca sekali per sesi panel,
  // bukan setiap pindah halaman.
  const onLogin = pathname === "/admin/login";
  useEffect(() => {
    if (onLogin) return;

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

      const [{ data: staff }, { data: prof }] = await Promise.all([
        supabase
          .from("staff")
          .select("full_name, email, role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (!staff || !isStaffRole(staff.role)) {
        await supabase.auth.signOut();
        setAuthenticated(false);
        router.replace("/admin/login");
        return;
      }

      const emailLocal = (staff.email ?? user.email ?? "").split("@")[0];
      const fullName =
        staff.full_name && !staff.full_name.includes("@") ? staff.full_name : "";
      setStaffName(prof?.display_name || fullName || emailLocal || "Pengurus");
      setStaffRole(staff.role);
      setAuthenticated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [onLogin, router]);

  if (onLogin) {
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

  const links = ADMIN_SECTIONS.filter(
    (s) => staffRole && s.roles.includes(staffRole)
  ).map((s) => ({ href: s.href, ...LINK_META[s.href] }));

  const allowed = canAccess(staffRole, pathname);

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-hmtl-192.png"
                alt="Logo HMTL UNTAN"
                className="w-8 h-8"
              />
              <div>
                <div className="font-bold text-gray-900 text-sm">Admin Panel</div>
                <div className="text-[10px] text-gray-500">HMTL UNTAN</div>
              </div>
              <button
                className="ml-auto lg:hidden p-1 rounded text-gray-400 hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {links.map((link) => {
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
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
              <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                {(staffName || "P").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {staffName || "Pengurus"}
                </div>
                {staffRole && (
                  <span
                    className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${ROLE_BADGE[staffRole]}`}
                  >
                    {ROLE_LABEL[staffRole]}
                  </span>
                )}
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
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-emerald-700 transition-colors"
          >
            Lihat Situs →
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {allowed ? (
            children
          ) : (
            <div className="mx-auto mt-12 max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
              <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <h1 className="text-lg font-bold text-gray-900">
                Menu ini bukan untuk peranmu
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Peran {staffRole ? ROLE_LABEL[staffRole] : "-"} tidak punya
                akses ke halaman ini. Minta Admin bila perlu akses.
              </p>
              <Link
                href="/admin"
                className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
