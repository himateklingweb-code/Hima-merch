// Jalankan sekali: konversi gambar lama di bucket content-images (PNG/JPEG)
// ke WEBP, upload hasilnya dengan path content-addressed baru, lalu kembalikan
// pemetaan url-lama -> url-baru supaya baris database bisa diperbarui lewat
// SQL biasa (skrip ini tidak menyentuh database, hanya storage).
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const URL_ = process.env.SB_URL;
const KEY = process.env.SB_SERVICE_KEY;
const supabase = createClient(URL_, KEY);

const BUCKET = "content-images";
const MAX_OUTPUT_BYTES = 500 * 1024;

async function compressToWebp(buffer) {
  let quality = 90;
  let out = await sharp(buffer).webp({ quality }).toBuffer();
  const ladder = [80, 65, 50, 40, 30];
  for (const q of ladder) {
    if (out.length <= MAX_OUTPUT_BYTES) break;
    out = await sharp(buffer).webp({ quality: q }).toBuffer();
    quality = q;
  }
  return out;
}

async function sha256Hex(buffer) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  const legacyPaths = JSON.parse(process.argv[2]);
  const mapping = {};

  for (const oldPath of legacyPaths) {
    const { data, error } = await supabase.storage.from(BUCKET).download(oldPath);
    if (error) {
      console.error("DOWNLOAD_FAIL", oldPath, error.message);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    const meta = await sharp(buf).metadata();
    const webpBuf = await compressToWebp(buf);
    const hash = await sha256Hex(webpBuf);
    const newPath = `${hash}.webp`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, webpBuf, { contentType: "image/webp", upsert: true });
    if (upErr) {
      console.error("UPLOAD_FAIL", oldPath, upErr.message);
      continue;
    }

    const newUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;
    mapping[oldPath] = {
      newPath,
      newUrl,
      width: meta.width,
      height: meta.height,
      oldBytes: buf.length,
      newBytes: webpBuf.length,
    };
  }

  console.log(JSON.stringify(mapping, null, 2));
}

main();
