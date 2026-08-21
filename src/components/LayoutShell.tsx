"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import PageTransition from "./PageTransition";
import { CartProvider } from "./CartContext";
import { AuthProvider } from "./AuthContext";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  // Auth wraps everything so useAuth() is available in both the storefront and
  // the admin area. The admin pages still manage their own session reads.
  return (
    <AuthProvider>
      {isAdmin ? (
        children
      ) : (
        <CartProvider>
          <PageTransition />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      )}
    </AuthProvider>
  );
}
