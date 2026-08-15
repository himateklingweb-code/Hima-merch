import Loader from "@/components/Loader";

export default function Loading() {
  return (
    <Loader
      label="Memuat merchandise"
      hint="Mengambil katalog, stok, dan kuota pre-order."
    />
  );
}
