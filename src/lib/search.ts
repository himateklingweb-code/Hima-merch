/**
 * Pencarian teks yang toleran: tidak peka huruf besar/kecil dan aksen, dan
 * setiap kata di kueri cukup muncul di salah satu kolom (urutan bebas).
 * "kaos hitam" cocok dengan "Kaos HMTL — warna hitam".
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesQuery(
  query: string,
  ...fields: (string | number | null | undefined)[]
): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(fields.filter((f) => f != null).join(" "));
  return q.split(/\s+/).every((word) => haystack.includes(word));
}
