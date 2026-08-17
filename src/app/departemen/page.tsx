import Link from "next/link";
import { iconFromName } from "@/lib/icons";
import { Metadata } from "next";
import { getDepartments, getSiteMeta } from "@/lib/content-repo";
import { ArrowRight } from "lucide-react";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/departemen");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/departemen" },
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

export default async function DepartemenPage() {
  const departments = await getDepartments();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <div className="max-w-2xl mb-5 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Departemen</h1>
        <p className="text-gray-500 mt-1 sm:mt-3 text-sm sm:text-lg">
          6 departemen yang menjalankan program kerja organisasi.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {departments.map((dept) => {
          const activePeriod = dept.periods.find((p) => p.is_active);
          const Icon = iconFromName(dept.icon);
          return (
            <Link
              key={dept.id}
              href={`/departemen/${dept.slug}`}
              className="group bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:border-emerald-300 active:scale-[0.98] hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    {dept.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 line-clamp-2">{dept.description}</p>
                  <div className="mt-2 sm:mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-400">
                      <span>{activePeriod?.members.length ?? 0} pengurus</span>
                      <span>Periode {activePeriod?.period_label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
