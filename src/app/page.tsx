import Link from "next/link";
import { departments } from "@/data/departments";
import { articles } from "@/data/news";
import { products, getProductBadge, formatPrice } from "@/data/products";
import { ArrowRight, Users, Newspaper, ShoppingBag, Handshake } from "lucide-react";
import HomeCarousels from "@/components/HomeCarousels";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs sm:text-sm mb-4 sm:mb-6">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
              Periode 2025/2026
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-3 sm:mb-6">
              HIMA Teknik<br />Lingkungan UNTAN
            </h1>
            <p className="text-sm sm:text-lg text-emerald-100 mb-5 sm:mb-8 max-w-2xl leading-relaxed">
              Mewadahi aspirasi, pengembangan, dan kontribusi nyata mahasiswa bagi lingkungan.
            </p>
            <div className="flex gap-2 sm:gap-3">
              <Link
                href="/tentang"
                className="inline-flex items-center gap-1.5 bg-white text-emerald-800 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-emerald-50 transition-colors"
              >
                Tentang Kami
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/merchandise"
                className="inline-flex items-center gap-1.5 border border-white/40 text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-white/10 transition-colors"
              >
                Merchandise
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats - compact horizontal scroll on mobile */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="flex sm:grid sm:grid-cols-4 gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { icon: Users, label: "Departemen", value: "6" },
              { icon: Newspaper, label: "Berita", value: "24+" },
              { icon: ShoppingBag, label: "Merchandise", value: `${products.length}` },
              { icon: Handshake, label: "Mitra", value: "4+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center flex-shrink-0 snap-center min-w-[72px] sm:min-w-0">
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 mx-auto mb-1" />
                <div className="text-xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-[11px] sm:text-sm text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments - carousel on mobile, grid on desktop */}
      <section className="bg-gray-50 py-8 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-5 sm:mb-10 px-4 sm:px-0">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900">Departemen</h2>
              <p className="text-gray-500 mt-1 text-xs sm:text-base">6 departemen menjalankan program kerja</p>
            </div>
            <Link href="/departemen" className="flex items-center gap-1 text-emerald-700 font-medium text-xs sm:text-sm hover:underline">
              Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <HomeCarousels
            type="departments"
            departments={departments}
            products={products}
            articles={articles}
          />

          {/* Desktop grid fallback */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4 px-0">
            {departments.map((dept) => (
              <Link
                key={dept.id}
                href={`/departemen/${dept.slug}`}
                className="group bg-white rounded-xl p-5 border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-2">{dept.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors text-sm">
                  {dept.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{dept.description}</p>
                <div className="mt-3 text-[11px] text-emerald-600 font-medium">
                  {dept.periods.find((p) => p.is_active)?.members.length ?? 0} pengurus aktif
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products - carousel on mobile */}
      <section className="py-8 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-5 sm:mb-10 px-4 sm:px-0">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900">Merchandise</h2>
              <p className="text-gray-500 mt-1 text-xs sm:text-base">Produk resmi HIMA TL UNTAN</p>
            </div>
            <Link href="/merchandise" className="flex items-center gap-1 text-emerald-700 font-medium text-xs sm:text-sm hover:underline">
              Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <HomeCarousels
            type="products"
            departments={departments}
            products={products}
            articles={articles}
          />

          {/* Desktop grid */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-6 px-0">
            {products.slice(0, 3).map((product) => {
              const badge = getProductBadge(product);
              return (
                <Link
                  key={product.id}
                  href={`/merchandise/${product.slug}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="aspect-[4/3] bg-gray-100 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                      <ShoppingBag className="w-16 h-16" />
                    </div>
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          badge.color === "green"
                            ? "bg-green-100 text-green-800"
                            : badge.color === "yellow"
                            ? "bg-yellow-100 text-yellow-800"
                            : badge.color === "red"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {badge.emoji} {badge.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    <div className="mt-3 text-lg font-bold text-emerald-700">{formatPrice(product.price)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Latest News - carousel on mobile */}
      <section className="bg-gray-50 py-8 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-5 sm:mb-10 px-4 sm:px-0">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900">Berita Terbaru</h2>
              <p className="text-gray-500 mt-1 text-xs sm:text-base">Kabar terkini HIMA TL UNTAN</p>
            </div>
            <Link href="/berita" className="flex items-center gap-1 text-emerald-700 font-medium text-xs sm:text-sm hover:underline">
              Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <HomeCarousels
            type="news"
            departments={departments}
            products={products}
            articles={articles}
          />

          {/* Desktop grid */}
          <div className="hidden sm:grid grid-cols-3 gap-6 px-0">
            {articles.slice(0, 3).map((article) => (
              <Link
                key={article.id}
                href={`/berita/${article.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="aspect-video bg-gray-100 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <Newspaper className="w-12 h-12" />
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(article.published_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{article.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-700 text-white py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">Tertarik Berkolaborasi?</h2>
          <p className="text-emerald-100 mb-6 sm:mb-8 text-sm sm:text-base max-w-2xl mx-auto">
            Kami terbuka untuk kerja sama. Mari berkolaborasi untuk lingkungan yang lebih baik.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <Link
              href="/kemitraan"
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-800 font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg text-sm hover:bg-emerald-50 transition-colors"
            >
              Ajukan Kemitraan
            </Link>
            <Link
              href="/kontak"
              className="inline-flex items-center justify-center gap-2 border border-white/40 text-white font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg text-sm hover:bg-white/10 transition-colors"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
