import Link from "next/link";
import { Metadata } from "next";
import { getProductBadge, formatPrice } from "@/data/products";
import { getProducts, getSiteMeta } from "@/lib/content-repo";
import { ShoppingBag } from "lucide-react";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/merchandise");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/merchandise" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
  };
}


// Read fresh at most once a minute so stock and new content appear
// without a redeploy.
export const revalidate = 60;

export default async function MerchandisePage() {
  const products = await getProducts();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <div className="max-w-2xl mb-5 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Merchandise</h1>
        <p className="text-gray-500 mt-1 sm:mt-3 text-sm sm:text-lg">
          Koleksi merchandise resmi HMTL UNTAN. Masukkan ke keranjang,
          checkout dikonfirmasi lewat WhatsApp kasir.
        </p>
      </div>

      {/* Mobile: compact 2-col grid, Desktop: 3-col */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {products.map((product) => {
          const badge = getProductBadge(product);
          const BadgeIcon = badge.icon;
          const available =
            product.stock_type === "ready_stock"
              ? product.stock - product.stock_reserved
              : product.po_deadline && new Date(product.po_deadline) > new Date()
              ? (product.po_quota ?? 0) - (product.po_filled ?? 0) - (product.po_reserved ?? 0)
              : 0;

          return (
            <Link
              key={product.id}
              href={`/merchandise/${product.slug}`}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all"
            >
              <div className="aspect-square sm:aspect-[4/3] bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <ShoppingBag className="w-10 sm:w-16 h-10 sm:h-16" />
                </div>
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
                      badge.color === "green"
                        ? "bg-green-100 text-green-800"
                        : badge.color === "yellow"
                        ? "bg-yellow-100 text-yellow-800"
                        : badge.color === "red"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <BadgeIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" strokeWidth={2} />
                    <span className="hidden sm:inline">{badge.label}</span>
                    <span className="sm:hidden">
                      {badge.color === "green" ? "Tersedia" : badge.color === "yellow" ? "Pre-Order" : badge.color === "red" ? "Ditutup" : "Habis"}
                    </span>
                  </span>
                </div>
              </div>
              <div className="p-3 sm:p-5">
                <h3 className="font-semibold text-gray-900 text-xs sm:text-base group-hover:text-emerald-700 transition-colors line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2 hidden sm:block">{product.description}</p>

                <div className="mt-1.5 sm:mt-3 flex items-center justify-between">
                  <div className="text-sm sm:text-lg font-bold text-emerald-700">{formatPrice(product.price)}</div>
                  {product.stock_type === "ready_stock" && available > 0 && (
                    <span className="text-[10px] sm:text-xs text-gray-400 hidden sm:inline">Sisa {available}</span>
                  )}
                </div>

                {product.variants && (
                  <div className="mt-1.5 sm:mt-2 flex gap-1 flex-wrap">
                    {product.variants.options.map((opt) => (
                      <span key={opt} className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 sm:mt-10 text-center">
        <Link
          href="/pesanan/cek"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-emerald-700 hover:underline font-medium"
        >
          Sudah pesan? Cek status pesanan di sini →
        </Link>
      </div>
    </div>
  );
}
