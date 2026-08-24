import { Metadata } from "next";
import { getSiteMeta } from "@/lib/content-repo";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/privasi");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/privasi" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
  };
}

const LAST_UPDATED = "24 Agustus 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-8 sm:mt-12 scroll-mt-24">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="space-y-3 text-sm sm:text-base text-gray-600 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 my-2">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {head.map((h) => (
              <th
                key={h}
                className="text-left px-3 sm:px-4 py-2.5 font-semibold text-gray-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-3 sm:px-4 py-2.5 text-gray-600 align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivasiPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16">
      <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
        Kebijakan Privasi
      </h1>
      <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-8">
        Terakhir diperbarui: {LAST_UPDATED}
      </p>

      <p className="text-sm sm:text-lg text-gray-600 leading-relaxed">
        Halaman ini menjelaskan data apa saja yang dikumpulkan situs resmi
        HIMA Teknik Lingkungan (HMTL) Universitas Tanjungpura ini, untuk apa
        data itu dipakai, siapa saja yang bisa mengaksesnya, dan bagaimana
        Anda bisa menghubungi kami soal data Anda. Ditulis mengikuti data apa
        yang benar-benar diproses situs ini — bukan teks umum yang disalin
        dari situs lain — dan disusun dengan semangat Undang-Undang No. 27
        Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).
      </p>

      <Section id="data-dikumpulkan" title="1. Data yang Kami Kumpulkan">
        <p>
          <strong>Saat memesan merchandise</strong> (checkout memerlukan Anda
          masuk/login terlebih dahulu):
        </p>
        <Table
          head={["Data", "Wajib?"]}
          rows={[
            ["Nama lengkap", "Wajib"],
            ["Nomor WhatsApp", "Wajib"],
            ["Alamat pengiriman", "Wajib"],
            ["NIM", "Opsional"],
            ["Program studi", "Opsional"],
            ["Catatan tambahan pesanan", "Opsional"],
            ["Bukti pembayaran (foto/PDF struk transfer)", "Wajib saat konfirmasi bayar"],
            ["Email (diambil otomatis dari akun Anda saat masuk)", "Otomatis"],
          ]}
        />

        <p>
          <strong>Saat masuk (login) atau mendaftar akun</strong>, melalui
          salah satu dari dua cara:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Masuk dengan Google</strong> — kami menerima nama, alamat
            email, dan foto profil dari akun Google Anda.
          </li>
          <li>
            <strong>Daftar dengan email &amp; kata sandi</strong> — kami
            menerima email, nama (opsional), dan kata sandi. Kata sandi
            dienkripsi oleh sistem autentikasi (Supabase Auth) — kami sendiri
            tidak pernah melihat atau menyimpannya dalam bentuk teks biasa.
          </li>
        </ul>
        <p>
          Untuk mencegah penyalahgunaan formulir (login/daftar otomatis oleh
          bot), halaman masuk memakai verifikasi Cloudflare Turnstile, yang
          memproses sebagian data teknis perangkat/koneksi Anda langsung
          dengan Cloudflare untuk membuktikan Anda bukan robot.
        </p>

        <p>
          <strong>Otomatis, di latar belakang</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Sesi masuk Anda disimpan di penyimpanan lokal (
            <em>local storage</em>) peramban, supaya Anda tidak perlu
            login berulang setiap membuka situs.
          </li>
          <li>
            Alamat IP saat membuat pesanan di-enkripsi/di-hash (diubah jadi
            kode acak satu arah) semata untuk membatasi jumlah pesanan
            berturut-turut dari satu sumber — bukan untuk melacak lokasi
            Anda, dan kami tidak menyimpan alamat IP asli Anda.
          </li>
        </ul>

        <p>
          Kami <strong>tidak</strong> memasang Google Analytics, piksel iklan,
          atau alat pelacak pihak ketiga mana pun di situs ini.
        </p>
      </Section>

      <Section id="penggunaan-data" title="2. Untuk Apa Data Ini Dipakai">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Memproses, mengemas, dan mengirimkan pesanan merchandise Anda.</li>
          <li>
            Memverifikasi pembayaran (mencocokkan bukti transfer dengan
            pesanan) oleh pengurus yang bertugas.
          </li>
          <li>
            Menghubungi Anda lewat WhatsApp terkait status pesanan, apabila
            diperlukan.
          </li>
          <li>
            Menampilkan riwayat pesanan Anda sendiri di halaman akun/cek
            pesanan.
          </li>
          <li>
            Mencegah spam atau penyalahgunaan formulir pemesanan dan
            pendaftaran akun.
          </li>
          <li>
            Mengelola akses panel admin, supaya hanya pengurus yang berwenang
            yang bisa mengubah konten dan data pesanan.
          </li>
        </ul>
        <p>
          Kami tidak menggunakan data Anda untuk iklan bertarget, dan tidak
          menjual atau menyewakan data Anda kepada pihak mana pun.
        </p>
      </Section>

      <Section id="berbagi-data" title="3. Berbagi Data dengan Pihak Ketiga">
        <p>
          Data Anda tersimpan dan diproses lewat beberapa layanan pihak
          ketiga yang mendukung jalannya situs ini:
        </p>
        <Table
          head={["Layanan", "Perannya", "Data yang lewat sana"]}
          rows={[
            [
              "Supabase",
              "Basis data, autentikasi akun, dan penyimpanan berkas",
              "Seluruh data pesanan, akun, dan berkas (foto produk, bukti bayar, dll.) disimpan di sini",
            ],
            [
              "Google",
              "Opsi masuk dengan akun Google",
              "Nama, email, foto profil — hanya jika Anda memilih masuk dengan Google",
            ],
            [
              "Cloudflare (Turnstile)",
              "Verifikasi anti-bot pada formulir masuk/daftar",
              "Data teknis perangkat & tantangan verifikasi",
            ],
            [
              "WhatsApp",
              "Tautan wa.me untuk menghubungi kami atau pembeli",
              "Tidak ada data yang otomatis terkirim — tautan hanya membuka aplikasi WhatsApp Anda",
            ],
          ]}
        />
        <p>
          Kami tidak menggunakan penyedia iklan, analitik pihak ketiga, atau
          layanan pengiriman email pemasaran apa pun.
        </p>
      </Section>

      <Section id="siapa-bisa-lihat" title="4. Siapa Saja yang Bisa Melihat Data Anda">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Anda sendiri</strong> — bisa melihat riwayat dan status
            pesanan Anda sendiri di halaman akun.
          </li>
          <li>
            <strong>Pengurus/panitia (staf &amp; admin)</strong> yang login
            ke panel admin bisa melihat detail pesanan (nama, WhatsApp,
            alamat, isi pesanan) untuk keperluan pengiriman dan verifikasi
            pembayaran.
          </li>
          <li>
            <strong>Bukti pembayaran</strong> disimpan di penyimpanan privat
            yang tidak bisa diakses publik — hanya pengurus yang login yang
            bisa membukanya, itu pun lewat tautan sementara yang kedaluwarsa
            otomatis.
          </li>
        </ul>
        <p>
          Sebaliknya, foto/berkas yang memang ditujukan untuk tampil publik
          — seperti foto produk, foto pengurus organisasi, atau logo mitra —
          memang bisa diakses siapa saja, karena itu memang tujuannya
          ditampilkan di situs.
        </p>
      </Section>

      <Section id="keamanan" title="5. Keamanan Data">
        <p>
          Setiap tabel data di basis data kami dilindungi aturan akses baris
          (<em>row level security</em>) di tingkat basis data itu sendiri —
          bukan cuma di tampilan situs — sehingga permintaan data yang tidak
          berwenang ditolak langsung oleh sistem, bukan hanya disembunyikan
          dari tampilan. Kata sandi akun dikelola sepenuhnya oleh sistem
          autentikasi (Supabase Auth) dengan enkripsi standar industri.
        </p>
        <p>
          Meski begitu, tidak ada sistem yang 100% bebas risiko. Jika Anda
          menemukan celah keamanan pada situs ini, mohon segera hubungi kami
          lewat kontak di bagian bawah halaman ini.
        </p>
      </Section>

      <Section id="cookie" title="6. Cookie & Penyimpanan Lokal">
        <p>
          Situs ini tidak memasang cookie pelacak iklan pihak ketiga. Sesi
          masuk Anda disimpan sebagai token di penyimpanan lokal peramban
          (<em>local storage</em>), bukan cookie, dan hanya dipakai untuk
          menjaga Anda tetap masuk antar kunjungan. Menghapus data situs ini
          dari pengaturan peramban Anda akan membuat Anda perlu masuk
          kembali.
        </p>
      </Section>

      <Section id="hak-anda" title="7. Hak Anda atas Data Pribadi">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Melihat</strong> data pesanan Anda kapan saja lewat
            halaman akun atau Cek Pesanan.
          </li>
          <li>
            <strong>Meminta salinan, koreksi, atau penghapusan</strong> data
            pribadi Anda — saat ini situs belum punya tombol hapus akun
            mandiri, jadi silakan ajukan langsung ke kontak di bawah dan akan
            kami proses secara manual.
          </li>
          <li>
            <strong>Menarik izin</strong> masuk dengan Google kapan saja
            lewat pengaturan akun Google Anda sendiri.
          </li>
        </ul>
      </Section>

      <Section id="target-pengguna" title="8. Untuk Siapa Layanan Ini">
        <p>
          Situs ini ditujukan untuk mahasiswa, dosen, mitra, dan masyarakat
          umum yang berinteraksi dengan HMTL UNTAN — bukan untuk anak-anak di
          bawah umur secara khusus. Kami tidak dengan sengaja mengumpulkan
          data dari anak-anak.
        </p>
      </Section>

      <Section id="perubahan" title="9. Perubahan Kebijakan Ini">
        <p>
          Kebijakan ini bisa kami perbarui sewaktu-waktu mengikuti perubahan
          fitur situs. Tanggal "Terakhir diperbarui" di atas selalu
          mencerminkan versi terbaru. Perubahan signifikan akan kami
          umumkan lewat halaman Berita.
        </p>
      </Section>

      <Section id="kontak" title="10. Hubungi Kami">
        <p>
          Ada pertanyaan soal data Anda, atau ingin mengajukan
          koreksi/penghapusan data? Hubungi kami:
        </p>
        <ul className="space-y-1">
          <li>
            Email:{" "}
            <a
              href="mailto:hmtl.ft.untan13@gmail.com"
              className="text-emerald-700 hover:underline"
            >
              hmtl.ft.untan13@gmail.com
            </a>
          </li>
          <li>
            WhatsApp:{" "}
            <a
              href="https://wa.me/6289693984597"
              className="text-emerald-700 hover:underline"
            >
              +62 896-9398-4597
            </a>
          </li>
          <li>
            Alamat: Komp. UKM Fakultas Teknik, Universitas Tanjungpura, Jl.
            Prof. Dr. Hadari Nawawi, Pontianak 78124
          </li>
        </ul>
      </Section>
    </div>
  );
}
