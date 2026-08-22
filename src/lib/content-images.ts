import { getSupabase } from "./supabase";

/**
 * Uploads for dashboard content images (article covers, sponsor logos, OG
 * images). Replaces the old "paste a Google Drive link" flow.
 *
 * The bucket is public so the storefront can show the image straight from its
 * URL; row level security only lets signed-in staff write. Capped at 2 MB.
 */
const BUCKET = "content-images";
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_MAX_MB = 2;
export const IMAGE_ACCEPT = ACCEPTED.join(",");

/** Client-side guard; the bucket enforces the same limit server-side. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type))
    return "Format tidak didukung. Gunakan JPG, PNG, atau WEBP.";
  if (file.size > MAX_BYTES) return "Ukuran gambar melebihi 2 MB.";
  return null;
}

export async function uploadContentImage(
  file: File
): Promise<{ url?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase belum dikonfigurasi." };

  const err = validateImage(file);
  if (err) return { error: err };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}
