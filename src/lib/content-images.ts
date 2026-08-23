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

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadContentImage(
  file: File
): Promise<{ url?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase belum dikonfigurasi." };

  const err = validateImage(file);
  if (err) return { error: err };

  // Content-addressed path: the same picture always hashes to the same
  // path, so re-uploading a logo or cover that's already in the bucket
  // (a partner's logo reused across sponsors, the same photo used twice)
  // resolves to the existing object instead of storing another copy.
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${await sha256Hex(file)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  // A conflict here means this exact image is already stored under this
  // path — that's a hit, not a failure, so it resolves the same as a
  // fresh upload rather than surfacing an error.
  if (upErr && !/exist/i.test(upErr.message)) {
    return { error: upErr.message };
  }

  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}
