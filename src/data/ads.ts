/**
 * Mitra ad cards shown in the carousel on the homepage.
 *
 * Each entry is authored from the dashboard (/admin/iklan): the form
 * collects the sponsor's logo and the website the card should send
 * visitors to. Everything here is demo seed data — swap this array for
 * the `ads` table query once the CMS database is wired up.
 */
export interface Ad {
  id: string;
  /** Mitra or sponsor name — also the card's accessible label. */
  name: string;
  /** One-line pitch shown under the logo. */
  blurb: string;
  /** Logo image: a Google Drive share link or any direct image URL. */
  logo: string;
  /** Destination the card links to. */
  website: string;
  /** Unpublished ads stay in the dashboard but never render. */
  active: boolean;
  /** Ascending display order in the carousel. */
  order: number;
}

export const ads: Ad[] = [
  {
    id: "ad-1",
    name: "Bank Sampah Kalbar Bersih",
    blurb:
      "Setor sampah terpilah, dapat saldo. Titik jemput tersedia di area kampus UNTAN.",
    logo: "",
    website: "https://example.com/bank-sampah-kalbar",
    active: true,
    order: 1,
  },
  {
    id: "ad-2",
    name: "Tirta Khatulistiwa",
    blurb:
      "Penyedia instalasi pengolahan air bersih untuk rumah tangga dan industri di Kalimantan Barat.",
    logo: "",
    website: "https://example.com/tirta-khatulistiwa",
    active: true,
    order: 2,
  },
  {
    id: "ad-3",
    name: "Kopi Kapuas Roastery",
    blurb:
      "Diskon 15% untuk mahasiswa Teknik Lingkungan dengan menunjukkan KTM.",
    logo: "",
    website: "https://example.com/kopi-kapuas",
    active: true,
    order: 3,
  },
  {
    id: "ad-4",
    name: "EcoPrint Pontianak",
    blurb:
      "Cetak poster, banner, dan merchandise organisasi dengan tinta berbasis air.",
    logo: "",
    website: "https://example.com/ecoprint-pontianak",
    active: true,
    order: 4,
  },
];

/** Published ads in display order — what the homepage carousel renders. */
export function getActiveAds(): Ad[] {
  return ads.filter((a) => a.active).sort((a, b) => a.order - b.order);
}
