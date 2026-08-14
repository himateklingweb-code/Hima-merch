export interface Partner {
  id: string;
  name: string;
  logo: string;
  description: string;
  website: string | null;
  type: "sponsor" | "mitra";
}

export const partners: Partner[] = [
  {
    id: "p1",
    name: "Dinas Lingkungan Hidup Kota Pontianak",
    logo: "/placeholder-partner.png",
    description: "Mitra kerja sama dalam kegiatan pengelolaan lingkungan dan edukasi masyarakat.",
    website: null,
    type: "mitra",
  },
  {
    id: "p2",
    name: "PT Aqua Golden Mississippi",
    logo: "/placeholder-partner.png",
    description: "Sponsor utama kegiatan seminar dan workshop pengelolaan sumber daya air.",
    website: null,
    type: "sponsor",
  },
  {
    id: "p3",
    name: "Wahana Lingkungan Hidup Indonesia (WALHI) Kalbar",
    logo: "/placeholder-partner.png",
    description: "Mitra strategis dalam advokasi dan kampanye pelestarian lingkungan di Kalimantan Barat.",
    website: null,
    type: "mitra",
  },
  {
    id: "p4",
    name: "Bank Sampah Kalbar Bersih",
    logo: "/placeholder-partner.png",
    description: "Kolaborasi program pengelolaan sampah dan ekonomi sirkular di lingkungan kampus.",
    website: null,
    type: "mitra",
  },
];
