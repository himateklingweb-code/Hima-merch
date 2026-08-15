export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  image: string;
  image_alt: string;
  published_at: string;
}

export function gdriveThumbnail(url: string, width = 800): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}=w${width}`;
  if (url.includes("lh3.googleusercontent.com")) return url;
  return url;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const articles: Article[] = [
  {
    id: "news-1",
    title: "HIMA TL UNTAN Tanam 1000 Pohon di Kawasan Mangrove Mempawah",
    slug: "hima-tl-untan-tanam-1000-pohon-2025",
    excerpt:
      "Kegiatan penanaman 1000 pohon mangrove berhasil dilaksanakan sebagai bentuk kepedulian terhadap ekosistem pesisir Kalimantan Barat.",
    content: `<p>Pontianak — Himpunan Mahasiswa Teknik Lingkungan Universitas Tanjungpura (HIMA TL UNTAN) berhasil melaksanakan kegiatan penanaman 1000 pohon mangrove di kawasan pesisir Mempawah, Kalimantan Barat.</p>
<p>Kegiatan yang berlangsung pada Sabtu (15/06/2025) ini diikuti oleh lebih dari 100 mahasiswa Teknik Lingkungan beserta dosen pembimbing. Acara ini merupakan bagian dari program kerja Departemen Dalam Negeri periode 2025/2026.</p>
<p>"Sebagai mahasiswa Teknik Lingkungan, sudah menjadi tanggung jawab kami untuk terlibat langsung dalam upaya pelestarian lingkungan," ujar Ketua Pelaksana.</p>`,
    category: "Kegiatan",
    author: "Tim Kominfo",
    image: "/placeholder-news.png",
    image_alt: "Mahasiswa HIMA TL menanam mangrove",
    published_at: "2025-06-16",
  },
  {
    id: "news-2",
    title: "Seminar Nasional: Teknologi Pengolahan Air Limbah Berkelanjutan",
    slug: "seminar-nasional-teknologi-air-limbah-2025",
    excerpt:
      "HIMA TL UNTAN menyelenggarakan seminar nasional dengan pembicara dari Kementerian LHK dan akademisi terkemuka.",
    content: `<p>Departemen Pendidikan HIMA TL UNTAN sukses menyelenggarakan Seminar Nasional bertema "Inovasi Teknologi Pengolahan Air Limbah untuk Pembangunan Berkelanjutan".</p>
<p>Acara ini menghadirkan pembicara dari Kementerian Lingkungan Hidup dan Kehutanan serta professor dari ITB dan UI. Lebih dari 300 peserta dari berbagai universitas di Indonesia turut berpartisipasi secara hybrid.</p>`,
    category: "Seminar",
    author: "Tim Kominfo",
    image: "/placeholder-news.png",
    image_alt: "Seminar Nasional HIMA TL UNTAN",
    published_at: "2025-05-20",
  },
  {
    id: "news-3",
    title: "Pembukaan Pre-Order Hoodie Green Engineering Batch 2",
    slug: "pre-order-hoodie-green-engineering-batch-2",
    excerpt:
      "Kabar gembira! Hoodie Green Engineering batch 2 resmi dibuka. Segera pesan sebelum kuota habis.",
    content: `<p>Departemen Kewirausahaan HIMA TL UNTAN membuka pre-order Hoodie Green Engineering Batch 2. Hoodie ini hadir dengan desain baru yang lebih fresh namun tetap mempertahankan identitas Teknik Lingkungan.</p>
<p>Bahan fleece premium, tersedia dalam ukuran M hingga XXL. Harga Rp195.000 sudah termasuk packaging eksklusif.</p>
<p>Pre-order dibuka hingga 10 Agustus 2026 atau sampai kuota 40 pcs terpenuhi.</p>`,
    category: "Merchandise",
    author: "Dept. KWU",
    image: "/placeholder-news.png",
    image_alt: "Hoodie Green Engineering Batch 2",
    published_at: "2025-07-01",
  },
  {
    id: "news-4",
    title: "HIMA TL UNTAN Raih Juara 1 Kompetisi Paper Lingkungan Se-Kalimantan",
    slug: "juara-1-kompetisi-paper-lingkungan",
    excerpt:
      "Delegasi HIMA TL UNTAN berhasil meraih juara pertama dalam kompetisi paper ilmiah tingkat regional.",
    content: `<p>Tim delegasi dari HIMA TL UNTAN berhasil membawa pulang trophy juara 1 dalam Kompetisi Paper Ilmiah Lingkungan Se-Kalimantan yang diselenggarakan di Universitas Lambung Mangkurat, Banjarmasin.</p>
<p>Paper berjudul "Optimasi Fitoremediasi Menggunakan Tanaman Lokal untuk Pengolahan Grey Water Permukiman" berhasil meyakinkan dewan juri.</p>`,
    category: "Prestasi",
    author: "Tim Kominfo",
    image: "/placeholder-news.png",
    image_alt: "Tim HIMA TL dengan trophy juara",
    published_at: "2025-04-10",
  },
];
