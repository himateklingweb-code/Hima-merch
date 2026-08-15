import { departments } from "./departments";
import { products } from "./products";
import { partners } from "./partners";

export interface HomeStat {
  key: string;
  value: number;
  label: string;
  color?: string;
}

/**
 * The four counters on the homepage.
 *
 * Every value is derived from a content collection rather than hardcoded,
 * so when the CMS database lands each branch becomes a `COUNT(*)` against
 * the matching table and the section keeps working unchanged.
 */
export function getHomeStats(): HomeStat[] {
  const activeMemberCount = departments.reduce(
    (n, d) =>
      n +
      d.periods
        .filter((p) => p.is_active)
        .reduce((k, p) => k + p.members.length, 0),
    0
  );

  return [
    { key: "pengurus", value: activeMemberCount, label: "Pengurus aktif" },
    { key: "dept", value: departments.length, label: "Departemen" },
    { key: "produk", value: products.length, label: "Produk merchandise" },
    {
      key: "mitra",
      value: partners.length,
      label: "Mitra & sponsor",
      color: "#7a8450",
    },
  ];
}
