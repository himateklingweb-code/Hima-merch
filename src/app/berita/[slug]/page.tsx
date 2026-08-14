import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/news";
import { ArrowLeft, Calendar, User as UserIcon } from "lucide-react";

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-12 lg:py-16">
      <Link
        href="/berita"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 hover:underline mb-4 sm:mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Semua Berita
      </Link>

      <div className="mb-3 sm:mb-6">
        <span className="text-[10px] sm:text-sm font-medium text-emerald-700 bg-emerald-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded">
          {article.category}
        </span>
      </div>

      <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
        {article.title}
      </h1>

      <div className="flex items-center gap-3 sm:gap-4 mt-2.5 sm:mt-4 text-[11px] sm:text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {new Date(article.published_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
        <div className="flex items-center gap-1">
          <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {article.author}
        </div>
      </div>

      <div className="mt-5 sm:mt-8 border-t border-gray-200 pt-5 sm:pt-8">
        <div
          className="prose prose-emerald prose-sm sm:prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>

      <div className="mt-8 sm:mt-12 pt-5 sm:pt-8 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-3 sm:mb-4">Berita Lainnya</h3>
        <div className="space-y-2 sm:space-y-3">
          {articles
            .filter((a) => a.id !== article.id)
            .slice(0, 3)
            .map((a) => (
              <Link
                key={a.id}
                href={`/berita/${a.slug}`}
                className="block p-2.5 sm:p-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2">{a.title}</div>
                <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                  {new Date(a.published_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </Link>
            ))}
        </div>
      </div>
    </article>
  );
}
