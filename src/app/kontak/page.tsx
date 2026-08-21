import { Metadata } from "next";
import { getSiteMeta } from "@/lib/content-repo";
import { MapPin, Mail, Phone, Globe, MessageCircle } from "lucide-react";

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
                content: "+62 896-9398-4597",
                href: "https://wa.me/6289693984597",
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
            <div className="flex gap-2">
              {[Globe, MessageCircle].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-emerald-100 hover:text-emerald-700 active:scale-95 transition-all"
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-5 sm:mt-8 aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1" />
              <p className="text-xs sm:text-sm">Peta Lokasi</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-gray-50 rounded-2xl p-5 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Kirim Pesan</h2>
          <form className="space-y-3 sm:space-y-4" action="#">
            {[
              { label: "Nama Lengkap", type: "text", placeholder: "Nama lengkap" },
              { label: "Email", type: "email", placeholder: "email@example.com" },
              { label: "Subjek", type: "text", placeholder: "Topik pesan" },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Pesan</label>
              <textarea
                rows={4}
                placeholder="Tulis pesan..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-semibold py-2.5 sm:py-3 rounded-lg text-sm active:bg-emerald-700 transition-colors"
            >
              Kirim Pesan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
