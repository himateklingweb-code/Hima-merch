"use client";

import Link from "next/link";
import Carousel from "./Carousel";
import { getProductBadge, formatPrice, type Product } from "@/data/products";
import type { Department } from "@/data/departments";
import type { Article } from "@/data/news";
import { ShoppingBag, Newspaper } from "lucide-react";

interface Props {
  type: "departments" | "products" | "news";
  departments: Department[];
  products: Product[];
  articles: Article[];
}

export default function HomeCarousels({ type, departments, products, articles }: Props) {
  if (type === "departments") {
    return (
      <div className="sm:hidden px-4">
        <Carousel
          options={{ align: "start", dragFree: true }}
          slideClassName="basis-[70%] pr-3"
          showDots={false}
        >
          {departments.map((dept) => (
            <Link
              key={dept.id}
              href={`/departemen/${dept.slug}`}
              className="block bg-white rounded-xl p-4 border border-gray-200 active:border-emerald-300 h-full"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-2xl">{dept.icon}</span>
                <h3 className="font-semibold text-gray-900 text-sm">{dept.name}</h3>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{dept.description}</p>
              <div className="mt-2.5 text-[11px] text-emerald-600 font-medium">
                {dept.periods.find((p) => p.is_active)?.members.length ?? 0} pengurus aktif
              </div>
            </Link>
          ))}
        </Carousel>
      </div>
    );
  }

  if (type === "products") {
    return (
      <div className="sm:hidden px-4">
        <Carousel
          options={{ align: "start", dragFree: true }}
          slideClassName="basis-[75%] pr-3"
        >
          {products.slice(0, 4).map((product) => {
            const badge = getProductBadge(product);
            return (
              <Link
                key={product.id}
                href={`/merchandise/${product.slug}`}
                className="block bg-white rounded-xl border border-gray-200 overflow-hidden h-full"
              >
                <div className="aspect-[3/2] bg-gray-100 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <div className="absolute top-2 left-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
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
                <div className="p-3.5">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                  <div className="mt-2 text-base font-bold text-emerald-700">{formatPrice(product.price)}</div>
                </div>
              </Link>
            );
          })}
        </Carousel>
      </div>
    );
  }

  if (type === "news") {
    return (
      <div className="sm:hidden px-4">
        <Carousel
          options={{ align: "start", dragFree: true }}
          slideClassName="basis-[80%] pr-3"
        >
          {articles.slice(0, 4).map((article) => (
            <Link
              key={article.id}
              href={`/berita/${article.slug}`}
              className="block bg-white rounded-xl border border-gray-200 overflow-hidden h-full"
            >
              <div className="aspect-[2/1] bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <Newspaper className="w-8 h-8" />
                </div>
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {article.category}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(article.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
                  {article.title}
                </h3>
              </div>
            </Link>
          ))}
        </Carousel>
      </div>
    );
  }

  return null;
}
