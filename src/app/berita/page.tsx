import Link from "next/link";
import { Metadata } from "next";
import { articles } from "@/data/news";
import { Newspaper } from "lucide-react";

export const metadata: Metadata = {
  title: "Berita",
  description: "Berita dan kabar terbaru dari HIMA Teknik Lingkungan Universitas Tanjungpura.",
};

export default function BeritaPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <div className="max-w-2xl mb-5 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Berita</h1>
        <p className="text-gray-500 mt-1 sm:mt-3 text-sm sm:text-lg">
          Kabar terbaru dari HIMA TL UNTAN.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
        {articles.map((article, index) => (
          <Link
            key={article.id}
            href={`/berita/${article.slug}`}
            className={`group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg active:scale-[0.99] transition-all ${
              index === 0 ? "sm:col-span-2" : ""
            }`}
          >
            {/* Mobile: horizontal card, Desktop: vertical */}
            <div className={`flex sm:block ${index === 0 ? "sm:flex" : ""}`}>
              <div
                className={`w-28 sm:w-auto flex-shrink-0 ${
                  index === 0 ? "sm:w-1/2" : ""
                } aspect-square sm:aspect-video bg-gray-100 relative`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <Newspaper className="w-8 h-8 sm:w-12 sm:h-12" />
                </div>
              </div>
              <div className={`p-3 sm:p-6 flex-1 min-w-0 ${index === 0 ? "sm:w-1/2 sm:flex sm:flex-col sm:justify-center" : ""}`}>
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-3">
                  <span className="text-[9px] sm:text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 sm:px-2.5 py-0.5 rounded">
                    {article.category}
                  </span>
                  <span className="text-[9px] sm:text-xs text-gray-400">
                    {new Date(article.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <h2
                  className={`font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 ${
                    index === 0 ? "text-sm sm:text-2xl" : "text-sm sm:text-lg"
                  }`}
                >
                  {article.title}
                </h2>
                <p className="text-[11px] sm:text-sm text-gray-500 mt-1 line-clamp-2 hidden sm:block">{article.excerpt}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
