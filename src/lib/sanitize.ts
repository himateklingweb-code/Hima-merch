import sanitizeHtml from "sanitize-html";

/**
 * Bersihkan HTML artikel sebelum dirender dengan dangerouslySetInnerHTML.
 * Dipanggil dari Server Component, jadi library ini tidak ikut ke bundle
 * browser.
 *
 * Konten diketik pengurus Kominfo sebagai HTML mentah di /admin/berita. Tanpa
 * pembersihan, satu akun panel yang dibobol cukup untuk menyisipkan
 * <script> atau onerror="..." ke halaman publik dan mencuri sesi pengunjung.
 *
 * Yang diizinkan hanya tag format teks yang sudah punya gaya di
 * `.prose-article` (globals.css) plus gambar, tabel, dan tautan. Atribut
 * event (onclick, onerror, ...) dan URL javascript: selalu dibuang.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h2", "h3", "h4",
    "strong", "b", "em", "i", "u", "s", "small", "sub", "sup", "mark",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    // Tautan keluar dibuka aman: tab baru tanpa akses window.opener.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: external
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
          : attribs,
      };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy" },
    }),
  },
};

export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}
