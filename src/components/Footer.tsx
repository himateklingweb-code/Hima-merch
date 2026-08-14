import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                TL
              </div>
              <div>
                <div className="font-bold text-white text-xs sm:text-sm">HIMA Teknik Lingkungan</div>
                <div className="text-[10px] sm:text-xs text-gray-400">Universitas Tanjungpura</div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Organisasi kemahasiswaan yang mewadahi aspirasi mahasiswa Teknik Lingkungan UNTAN.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2.5 text-xs sm:text-sm">Navigasi</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {[
                { href: "/tentang", label: "Tentang" },
                { href: "/departemen", label: "Departemen" },
                { href: "/kemitraan", label: "Kemitraan" },
                { href: "/merchandise", label: "Merchandise" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs sm:text-sm hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2.5 text-xs sm:text-sm">Lainnya</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {[
                { href: "/berita", label: "Berita" },
                { href: "/kontak", label: "Kontak" },
                { href: "/pesanan/cek", label: "Cek Pesanan" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs sm:text-sm hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center text-[10px] sm:text-sm text-gray-500">
          &copy; {new Date().getFullYear()} HIMA Teknik Lingkungan UNTAN
        </div>
      </div>
    </footer>
  );
}
