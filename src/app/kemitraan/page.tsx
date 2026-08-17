import { Metadata } from "next";
import { getPartners, getSiteMeta } from "@/lib/content-repo";
import { Building2, Mail } from "lucide-react";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/kemitraan");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/kemitraan" },
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

export default async function KemitraanPage() {
  const partners = await getPartners();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <div className="max-w-2xl mb-5 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Kemitraan</h1>
        <p className="text-gray-500 mt-1 sm:mt-3 text-sm sm:text-lg">
          Kerja sama dengan berbagai instansi dan organisasi untuk mendukung kegiatan mahasiswa.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 mb-8 sm:mb-16">
        {partners.map((partner) => (
          <div
            key={partner.id}
            className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{partner.name}</h3>
                  <span
                    className={`text-[9px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0 ${
                      partner.type === "sponsor"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {partner.type === "sponsor" ? "Sponsor" : "Mitra"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 line-clamp-2">{partner.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 rounded-xl sm:rounded-2xl p-5 sm:p-8 lg:p-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Tertarik Bermitra?</h2>
          <p className="text-xs sm:text-base text-gray-600 mb-4 sm:mb-8">
            Kami terbuka untuk sponsorship, kolaborasi program, atau dukungan lainnya.
          </p>
          <a
            href="mailto:himatl@teknik.untan.ac.id"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm active:bg-emerald-700 transition-colors"
          >
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            Ajukan Kerja Sama
          </a>
        </div>
      </div>
    </div>
  );
}
