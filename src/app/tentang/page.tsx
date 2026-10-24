import { Metadata } from "next";
import { getSiteMeta } from "@/lib/content-repo";
import { SITE } from "@/lib/site";

/** Unsur yang tampak pada logo resmi HMTL UNTAN (public/logo-hmtl.png). */
const LOGO_PARTS: [string, string][] = [
  ["Capung", "hewan yang hanya hidup di perairan bersih, menjadi penanda lingkungan yang sehat."],
  ["Huruf U hijau–merah", "identitas Universitas Tanjungpura sebagai rumah HMTL."],
  ["Roda gigi", "ilmu keteknikan dan teknologi yang dipakai untuk mengelola lingkungan."],
  ["Daun hijau", "alam, vegetasi, dan semangat keberlanjutan."],
  ["Lengkung biru", "air, salah satu bidang utama Teknik Lingkungan."],
];

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
          Himpunan Mahasiswa Teknik Lingkungan (HMTL) adalah organisasi kemahasiswaan tingkat program studi
          di Fakultas Teknik, Universitas Tanjungpura, Pontianak, Kalimantan Barat. HMTL berdiri sebagai
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
              Teknik Lingkungan di Fakultas Teknik UNTAN. Sejak awal berdiri, HMTL telah aktif menjalankan
              berbagai program kerja yang berfokus pada pengembangan mahasiswa dan kepedulian terhadap lingkungan.
            </p>
            <p>
              Dengan enam departemen yang saling melengkapi — Dalam Negeri, Luar Negeri, Kewirausahaan,
              Pendidikan, Rumah Tangga, dan Kominfo — HMTL terus berbenah dan berkembang dari periode ke periode.
            </p>
            <p>
              Saat ini, HMTL UNTAN memasuki periode kepengurusan 2025/2026 dengan semangat dan komitmen
              baru untuk membawa organisasi menjadi lebih baik.
            </p>
          </div>
        </section>

        <section id="logo-atribut" className="mt-8 sm:mt-12 scroll-mt-24">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 pb-2 border-b border-gray-200">Logo & Atribut</h2>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SITE.logo}
              alt="Logo Himpunan Mahasiswa Teknik Lingkungan Universitas Tanjungpura"
              width={512}
              height={512}
              loading="lazy"
              className="h-44 w-44 shrink-0 object-contain sm:h-48 sm:w-48"
            />
            <div className="min-w-0 max-w-prose flex-1 text-gray-600 text-sm sm:text-base leading-relaxed">
              <p>
                Logo HMTL berbentuk lingkaran dengan tulisan <strong>Himpunan Mahasiswa Teknik Lingkungan</strong> di
                bagian atas dan <strong>Universitas Tanjungpura</strong> di bagian bawah. Di dalamnya tersusun unsur
                yang mewakili bidang Teknik Lingkungan:
              </p>
              <ul className="mt-3 space-y-2">
                {LOGO_PARTS.map(([name, desc]) => (
                  <li key={name} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span>
                      <strong className="font-semibold text-gray-800">{name}</strong> — {desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
