import { Metadata } from "next";
import { getSiteMeta } from "@/lib/content-repo";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/tentang");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/tentang" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
  };
}

export default function TentangPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-8">Tentang HIMA Teknik Lingkungan</h1>

      <div className="prose prose-emerald max-w-none">
        <p className="text-sm sm:text-lg text-gray-600 leading-relaxed">
          Himpunan Mahasiswa Teknik Lingkungan (HIMA TL) adalah organisasi kemahasiswaan tingkat program studi
          di Fakultas Teknik, Universitas Tanjungpura, Pontianak, Kalimantan Barat. HIMA TL berdiri sebagai
          wadah aspirasi, pengembangan diri, dan kontribusi mahasiswa Teknik Lingkungan bagi masyarakat dan lingkungan.
        </p>

        <section id="visi-misi" className="mt-8 sm:mt-12 scroll-mt-24">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 pb-2 border-b border-gray-200">Visi & Misi</h2>

          <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="font-semibold text-emerald-800 text-sm sm:text-lg mb-2 sm:mb-3">Visi</h3>
            <p className="text-gray-700 italic text-sm sm:text-lg leading-relaxed">
              &ldquo;Menjadikan HIMA Teknik Lingkungan sebagai organisasi yang progresif, inovatif, dan berdedikasi
              dalam mengembangkan potensi mahasiswa serta berkontribusi nyata bagi lingkungan.&rdquo;
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-3 sm:mb-4">Misi</h3>
            <ol className="space-y-2.5 sm:space-y-3">
              {[
                "Membangun solidaritas dan rasa kebersamaan antar mahasiswa Teknik Lingkungan.",
                "Meningkatkan kualitas akademik melalui kegiatan ilmiah, seminar, dan workshop.",
                "Mengembangkan jiwa kewirausahaan dan kemandirian mahasiswa.",
                "Menjalin hubungan baik dengan institusi, organisasi, dan masyarakat.",
                "Berkontribusi aktif dalam upaya pelestarian dan pengelolaan lingkungan hidup.",
              ].map((misi, i) => (
                <li key={i} className="flex gap-2.5 sm:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-medium flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 text-xs sm:text-base pt-0.5">{misi}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="sejarah" className="mt-8 sm:mt-12 scroll-mt-24">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 pb-2 border-b border-gray-200">Sejarah</h2>
          <div className="space-y-3 sm:space-y-4 text-xs sm:text-base text-gray-600 leading-relaxed">
            <p>
              HIMA Teknik Lingkungan Universitas Tanjungpura didirikan seiring dengan berdirinya Program Studi
              Teknik Lingkungan di Fakultas Teknik UNTAN. Sejak awal berdiri, HIMA TL telah aktif menjalankan
              berbagai program kerja yang berfokus pada pengembangan mahasiswa dan kepedulian terhadap lingkungan.
            </p>
            <p>
              Dengan enam departemen yang saling melengkapi — Dalam Negeri, Luar Negeri, Kewirausahaan,
              Pendidikan, Rumah Tangga, dan Kominfo — HIMA TL terus berbenah dan berkembang dari periode ke periode.
            </p>
            <p>
              Saat ini, HIMA TL UNTAN memasuki periode kepengurusan 2025/2026 dengan semangat dan komitmen
              baru untuk membawa organisasi menjadi lebih baik.
            </p>
          </div>
        </section>

        <section id="logo-atribut" className="mt-8 sm:mt-12 scroll-mt-24">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 pb-2 border-b border-gray-200">Logo & Atribut</h2>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <div className="text-center">
                <div className="text-2xl sm:text-4xl font-bold text-emerald-700">TL</div>
                <div className="text-[9px] sm:text-xs text-emerald-600 mt-0.5">UNTAN</div>
              </div>
            </div>
            <div className="text-gray-600 text-xs sm:text-base">
              <p>
                Logo HIMA Teknik Lingkungan menggambarkan semangat mahasiswa dalam berkontribusi
                untuk lingkungan yang lebih baik. Warna hijau melambangkan alam dan keberlanjutan.
              </p>
              <p className="mt-2 sm:mt-3 text-[10px] sm:text-sm text-gray-500">
                (Pada implementasi produksi, logo resmi akan ditampilkan di sini)
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
