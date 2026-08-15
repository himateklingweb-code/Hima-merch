export interface Partner {
  id: string;
  name: string;
  /** Logo image: a Google Drive share link or direct URL. Empty renders
   *  a wordmark fallback, so a partner can be listed before art lands. */
  logo: string;
  description: string;
  website: string | null;
  type: "sponsor" | "mitra";
}

export const partners: Partner[] = [
  {
    id: "p1",
    name: "Dinas Lingkungan Hidup Kota Pontianak",
    logo: "",
    description: "Mitra kerja sama dalam kegiatan pengelolaan lingkungan dan edukasi masyarakat.",
    website: "https://pontianakkota.go.id",
    type: "mitra",
  },
  {
    id: "p2",
    name: "PT Aqua Golden Mississippi",
    logo: "",
    description: "Sponsor utama kegiatan seminar dan workshop pengelolaan sumber daya air.",
    website: null,
    type: "sponsor",
  },
  {
    id: "p3",
    name: "Wahana Lingkungan Hidup Indonesia (WALHI) Kalbar",
    logo: "",
    description: "Mitra strategis dalam advokasi dan kampanye pelestarian lingkungan di Kalimantan Barat.",
    website: "https://walhi.or.id",
    type: "mitra",
  },
  {
    id: "p4",
    name: "Bank Sampah Kalbar Bersih",
    logo: "",
    description: "Kolaborasi program pengelolaan sampah dan ekonomi sirkular di lingkungan kampus.",
    website: null,
    type: "mitra",
  },
];
