/**
 * Uploads for dashboard content images (article covers, product photos,
 * sponsor logos, OG images). Replaces the old "paste a Google Drive link"
 * flow.
 *
 * Every raster upload (JPG/PNG/WEBP) is converted to WEBP in the browser
 * before it reaches the network: one format everywhere means the gallery,
 * the news cover, and every product photo decode the same way, and WEBP at
 * the same visual quality is routinely 25-35% smaller than PNG/JPEG. SVG is
 * passed through untouched - it is already vector and converting it to a
 * raster format would only throw away its scalability for no size gain.
 *
 * The browser-side compression loop re-encodes at falling quality until the
 * WEBP blob is at or under 500 KB, or gives up after a fixed number of
 * steps (a few at very low quality is still better than rejecting the
 * upload outright). The original file is still capped at 2 MB before any
 * of this starts, so a phone photo straight off a 50 MP camera does not
 * hang the tab trying to decode it.
 *
 * The bucket is public so the storefront can show the image straight from
 * its URL; row level security only lets signed-in staff write.
 */
const BUCKET = "content-images";
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 500 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const RASTER_ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_MAX_MB = 2;
export const IMAGE_ACCEPT = ACCEPTED.join(",");

/** Client-side guard; the bucket enforces the same limit server-side. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type))
    return "Format tidak didukung. Gunakan JPG, PNG, WEBP, atau SVG.";
  if (file.size > MAX_INPUT_BYTES) return "Ukuran gambar melebihi 2 MB.";
  return null;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

/**
 * Converts any raster image to WEBP, iterating quality downward until the
 * result fits `MAX_OUTPUT_BYTES`. Returns the original dimensions alongside
 * the blob so callers can store the image's natural aspect ratio.
 */
async function toCompressedWebp(
  file: File
): Promise<{ blob: Blob; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung konversi gambar.");
    ctx.drawImage(img, 0, 0);

    let blob = await canvasToBlob(canvas, 0.92);
    // Falling back through a fixed quality ladder is simpler and more
    // predictable than a binary search, and five steps is plenty - WEBP's
    // size curve is steep enough that quality 0.3 almost always clears
    // 500 KB for anything a phone or a sponsor logo would produce.
    const ladder = [0.8, 0.65, 0.5, 0.4, 0.3];
    for (const q of ladder) {
      if (!blob || blob.size <= MAX_OUTPUT_BYTES) break;
      blob = await canvasToBlob(canvas, q);
    }
    if (!blob) throw new Error("Gagal mengonversi gambar ke WEBP.");
    if (blob.size > MAX_OUTPUT_BYTES) {
      throw new Error(
        "Gambar masih di atas 500 KB setelah dikompres maksimal. Gunakan foto dengan resolusi lebih kecil."
      );
    }
    return { blob, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Reads an SVG's `viewBox`/`width`/`height` so the layout still gets a
 *  usable aspect ratio without rasterizing the file. */
async function svgNaturalSize(file: File): Promise<{ width: number; height: number }> {
  const text = await file.text();
  const viewBox = text.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i);
  if (viewBox) return { width: Math.round(+viewBox[1]), height: Math.round(+viewBox[2]) };
  const w = text.match(/\bwidth=["']?([\d.]+)/i);
  const h = text.match(/\bheight=["']?([\d.]+)/i);
  if (w && h) return { width: Math.round(+w[1]), height: Math.round(+h[1]) };
  return { width: 512, height: 512 };
}

export async function uploadContentImage(
  file: File
): Promise<{ url?: string; width?: number; height?: number; error?: string }> {
  const { getSupabase } = await import("./supabase");
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase belum dikonfigurasi." };

  const err = validateImage(file);
  if (err) return { error: err };

  try {
    const isSvg = file.type === "image/svg+xml";
    let uploadBytes: Blob;
    let width: number;
    let height: number;
    let ext: string;
    let contentType: string;

    if (isSvg) {
      const size = await svgNaturalSize(file);
      width = size.width;
      height = size.height;
      ext = "svg";
      contentType = "image/svg+xml";
      uploadBytes = file;
    } else if (RASTER_ACCEPTED.includes(file.type)) {
      const converted = await toCompressedWebp(file);
      uploadBytes = converted.blob;
      width = converted.width;
      height = converted.height;
      ext = "webp";
      contentType = "image/webp";
    } else {
      return { error: "Format tidak didukung." };
    }

    // Content-addressed path: the same picture always hashes to the same
    // path, so re-uploading something already in the bucket resolves to the
    // existing object instead of storing another copy.
    const hash = await sha256Hex(await uploadBytes.arrayBuffer());
    const path = `${hash}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, uploadBytes, { contentType, upsert: false });

    // A conflict here means this exact image is already stored under this
    // path — that's a hit, not a failure, so it resolves the same as a
    // fresh upload rather than surfacing an error.
    if (upErr && !/exist/i.test(upErr.message)) {
      return { error: upErr.message };
    }

    return {
      url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      width,
      height,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal mengunggah gambar." };
  }
}
