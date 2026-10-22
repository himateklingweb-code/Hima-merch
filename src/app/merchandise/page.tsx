import Link from "next/link";
import { Metadata } from "next";
import { getProductBadge } from "@/data/products";
import { getProducts, getSiteMeta } from "@/lib/content-repo";
import ProductBrowser, { type ProductCard, type BadgeColor } from "./ProductBrowser";

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
  // Badge dan sisa stok dihitung di server (bergantung waktu sekarang), lalu
  // dikirim sebagai data polos ke komponen pencarian di browser.
  const cards: ProductCard[] = products.map((product) => {
    const badge = getProductBadge(product);
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      variants: product.variants?.options ?? [],
      badgeLabel: badge.label,
      badgeColor: badge.color as BadgeColor,
      readyLeft:
        product.stock_type === "ready_stock"
          ? product.stock - product.stock_reserved
          : null,
    };
  });
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <div className="max-w-2xl mb-5 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Merchandise</h1>
        <p className="text-gray-500 mt-1 sm:mt-3 text-sm sm:text-lg">
          Koleksi merchandise resmi HMTL UNTAN. Masukkan ke keranjang,
          checkout dikonfirmasi lewat WhatsApp pengurus KWU.
        </p>
      </div>

      <ProductBrowser products={cards} />

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
