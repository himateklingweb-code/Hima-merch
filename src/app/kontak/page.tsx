import { Metadata } from "next";
import { getSiteMeta } from "@/lib/content-repo";
import { MapPin, Mail, Phone } from "lucide-react";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/kontak");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/kontak" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
  };
}

export default function KontakPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-5 sm:mb-8">Hubungi Kami</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        {/* Contact Info */}
        <div>
          <div className="space-y-4 sm:space-y-6">
            {[
              {
                icon: MapPin,
                title: "Alamat",
                content: "Komp. UKM Fakultas Teknik, Universitas Tanjungpura\nJl. Prof. Dr. Hadari Nawawi\nPontianak 78124",
              },
              {
                icon: Mail,
                title: "Email",
                content: "hmtl.ft.untan13@gmail.com",
                href: "mailto:hmtl.ft.untan13@gmail.com",
              },
              {
                icon: Phone,
                title: "WhatsApp",
                content: "+62 812-1854-2747",
                href: "https://wa.me/6281218542747",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                  {item.href ? (
                    <a href={item.href} className="text-xs sm:text-sm text-emerald-700 hover:underline mt-0.5 block">
                      {item.content}
                    </a>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 whitespace-pre-line">{item.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 sm:mt-8">
            <h3 className="font-semibold text-gray-900 text-sm mb-2.5">Media Sosial</h3>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram HMTL UNTAN"
              className="inline-flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 items-center justify-center text-gray-600 hover:bg-emerald-100 hover:text-emerald-700 active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 00-2.13 1.38A5.9 5.9 0 00.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 00-1.38-2.13A5.9 5.9 0 0019.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 105.84 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 118 12a4 4 0 014 4zm6.4-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z" />
              </svg>
            </a>
          </div>
        </div>

        {/* CTA langsung — mengarah ke WhatsApp/email, bukan form yang tidak terkirim kemana-mana */}
        <div className="bg-gray-50 rounded-2xl p-5 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Kirim Pesan</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-5 sm:mb-6">
            Pertanyaan, kerja sama, atau konfirmasi pesanan — hubungi kami langsung lewat WhatsApp atau email, dibalas lebih cepat daripada formulir.
          </p>
          <div className="space-y-3">
            <a
              href="https://wa.me/6281218542747"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-semibold py-2.5 sm:py-3 rounded-lg text-sm active:bg-emerald-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Chat via WhatsApp
            </a>
            <a
              href="mailto:hmtl.ft.untan13@gmail.com"
              className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-700 font-semibold py-2.5 sm:py-3 rounded-lg text-sm hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Kirim Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
