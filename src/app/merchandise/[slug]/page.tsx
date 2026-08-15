import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products, productSeo } from "@/data/products";
import { gdriveThumbnail } from "@/data/news";
import ProductDetail from "./ProductDetail";

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};

  // Editable in /admin/seo; falls back to the product's own fields.
  const seo = productSeo(product);

  return {
    // The root layout appends the site name, so opt out of the template —
    // the resolved title is already complete.
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: `/merchandise/${product.slug}` },
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: "website",
      ...(seo.ogImage && {
        images: [{ url: gdriveThumbnail(seo.ogImage, 1200) }],
      }),
    },
    twitter: {
      card: seo.ogImage ? "summary_large_image" : "summary",
      title: seo.title,
      description: seo.description,
      ...(seo.ogImage && { images: [gdriveThumbnail(seo.ogImage, 1200)] }),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
